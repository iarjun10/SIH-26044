import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AssessmentQuestion {
  id: number;
  question: string;
  type: "mcq" | "conceptual" | "coding" | "scenario" | "short_answer";
  options?: string[];
  correctAnswer: string;
  explanation: string;
  maxScore: number;
}

interface AssessmentResult {
  questions: AssessmentQuestion[];
}

interface EvaluationResult {
  totalScore: number;
  proficiencyLevel: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  questionResults: Array<{
    questionId: number;
    userAnswer: string;
    correct: boolean;
    score: number;
    feedback: string;
  }>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, studentId } = body;

    if (!studentId) {
      return new Response(
        JSON.stringify({ error: "Missing studentId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    if (action === "generate") {
      return await handleGenerate(body as GenerateBody, supabase);
    } else if (action === "evaluate") {
      return await handleEvaluate(body as EvaluateBody, supabase);
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid action. Use 'generate' or 'evaluate'." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err) {
    console.error("Assessment generator error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

interface GenerateBody {
  studentId: string;
  skill: string;
  difficulty?: string;
  questionType?: string;
  careerGoal?: string;
  domain?: string;
}

interface EvaluateBody {
  studentId: string;
  skill: string;
  difficulty?: string;
  questionType?: string;
  questions: AssessmentQuestion[];
  userAnswers: string[];
}

type SupabaseClient = ReturnType<typeof createClient>;

async function handleGenerate(body: GenerateBody, supabase: SupabaseClient): Promise<Response> {
  const { studentId, skill, difficulty, questionType, careerGoal, domain } = body;

  if (!skill) {
    return new Response(
      JSON.stringify({ error: "Missing skill to assess" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Fetch student's existing skills and resume data for context
  const context = await gatherStudentContext(supabase, studentId);

  const result = await generateQuestions(skill, difficulty ?? "intermediate", questionType ?? "mcq", careerGoal, domain, context);

  if (!result) {
    return new Response(
      JSON.stringify({ error: "Failed to generate assessment questions. Please try again." }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify(result),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleEvaluate(body: EvaluateBody, supabase: SupabaseClient): Promise<Response> {
  const { studentId, skill, difficulty, questionType, questions, userAnswers } = body;

  if (!questions || !userAnswers || !skill) {
    return new Response(
      JSON.stringify({ error: "Missing questions, userAnswers, or skill" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const result = await evaluateAnswers(skill, difficulty ?? "intermediate", questionType ?? "mcq", questions, userAnswers);

  if (!result) {
    return new Response(
      JSON.stringify({ error: "Failed to evaluate assessment. Please try again." }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Save the assessment to ai_assessments table
  const { error: saveError } = await supabase.from("ai_assessments").insert({
    student_id: studentId,
    skill,
    difficulty: difficulty ?? "intermediate",
    question_type: questionType ?? "mcq",
    questions: questions.map((q: AssessmentQuestion, i: number) => ({
      ...q,
      userAnswer: userAnswers[i] ?? "",
    })),
    score: result.totalScore,
    proficiency_level: result.proficiencyLevel,
    strengths: result.strengths,
    weaknesses: result.weaknesses,
    recommendations: result.recommendations,
  });

  if (saveError) {
    console.error("Failed to save AI assessment:", saveError);
  }

  return new Response(
    JSON.stringify(result),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function gatherStudentContext(supabase: SupabaseClient, studentId: string): Promise<string> {
  let context = "";

  try {
    const { data: skillsData } = await supabase
      .from("student_skills")
      .select("skills, gaps, total_score")
      .eq("student_id", studentId)
      .maybeSingle();

    if (skillsData) {
      context += `Student's current skill scores: ${JSON.stringify(skillsData.skills)}\n`;
      context += `Known skill gaps: ${JSON.stringify(skillsData.gaps)}\n`;
      context += `Overall score: ${skillsData.total_score}\n`;
    }

    const { data: resumeData } = await supabase
      .from("resume_analysis")
      .select("extracted_data")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (resumeData?.extracted_data) {
      const d = resumeData.extracted_data;
      context += `Resume skills: ${JSON.stringify(d.technical_skills ?? [])}\n`;
      context += `Resume projects: ${JSON.stringify((d.projects ?? []).map((p: { name: string }) => p.name))}\n`;
    }
  } catch (e) {
    console.error("Context gathering error:", e);
  }

  return context;
}

async function callAnthropic(prompt: string): Promise<string | null> {
  const apiUrl = Deno.env.get("ANTHROPIC_BASE_URL") ?? "https://api.anthropic.com";
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  const customHeaders = Deno.env.get("ANTHROPIC_CUSTOM_HEADERS");

  if (!apiKey) {
    console.error("No Anthropic API key configured");
    return null;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
  };

  if (customHeaders) {
    const parts = customHeaders.split(":");
    if (parts.length >= 2) {
      headers[parts[0].trim()] = parts.slice(1).join(":").trim();
    }
  }

  try {
    const response = await fetch(`${apiUrl}/v1/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", response.status, errText);
      return null;
    }

    const data = await response.json();
    return data?.content?.[0]?.text ?? null;
  } catch (err) {
    console.error("Anthropic call failed:", err);
    return null;
  }
}

async function generateQuestions(
  skill: string,
  difficulty: string,
  questionType: string,
  careerGoal: string | undefined,
  domain: string | undefined,
  studentContext: string
): Promise<AssessmentResult | null> {
  const prompt = `You are an expert technical interviewer and assessment creator. Generate a skill assessment for the following parameters:

Skill: ${skill}
Difficulty: ${difficulty}
Question Type: ${questionType}
${careerGoal ? `Career Goal: ${careerGoal}` : ""}
${domain ? `Domain: ${domain}` : ""}
${studentContext ? `Student Context:\n${studentContext}` : ""}

Generate 5 ${questionType} questions at ${difficulty} difficulty level for the skill "${skill}".

Return ONLY a valid JSON object (no markdown, no code fences, no explanation) with this exact structure:

{
  "questions": [
    {
      "id": 1,
      "question": "The question text",
      "type": "${questionType}",
      ${questionType === "mcq" ? `"options": ["Option A", "Option B", "Option C", "Option D"],` : ""}
      "correctAnswer": "The correct answer",
      "explanation": "Brief explanation of why this is correct",
      "maxScore": 20
    }
  ]
}

Rules:
- Generate exactly 5 questions.
- For MCQ, provide exactly 4 options.
- For conceptual and short_answer questions, omit the "options" field.
- For coding questions, include a code problem statement in "question" and the expected solution/approach in "correctAnswer".
- For scenario questions, describe a real-world scenario and ask what the student would do.
- Questions should be appropriate for ${difficulty} difficulty.
- Each question is worth 20 points (maxScore: 20), totaling 100.
- Return ONLY the JSON.`;

  const text = await callAnthropic(prompt);
  if (!text) return null;

  try {
    const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      console.error("Invalid question structure:", parsed);
      return null;
    }
    return parsed as AssessmentResult;
  } catch (e) {
    console.error("Failed to parse generated questions:", e, text);
    return null;
  }
}

async function evaluateAnswers(
  skill: string,
  difficulty: string,
  questionType: string,
  questions: AssessmentQuestion[],
  userAnswers: string[]
): Promise<EvaluationResult | null> {
  const answersData = questions.map((q, i) => ({
    questionId: q.id,
    question: q.question,
    correctAnswer: q.correctAnswer,
    userAnswer: userAnswers[i] ?? "",
    maxScore: q.maxScore,
  }));

  const prompt = `You are an expert assessor. Evaluate the following ${questionType} assessment answers for the skill "${skill}" at ${difficulty} difficulty.

Questions and Answers:
${JSON.stringify(answersData, null, 2)}

Evaluate each answer and provide an overall assessment. Return ONLY a valid JSON object (no markdown, no code fences) with this exact structure:

{
  "totalScore": 0,
  "proficiencyLevel": "Beginner",
  "strengths": [],
  "weaknesses": [],
  "recommendations": [],
  "questionResults": [
    {
      "questionId": 1,
      "userAnswer": "",
      "correct": true,
      "score": 20,
      "feedback": "Brief feedback on the answer"
    }
  ]
}

Rules:
- totalScore should be 0-100 (sum of individual question scores).
- For MCQ: correct = exact match with correctAnswer. Score is either maxScore (correct) or 0 (wrong).
- For conceptual/short_answer/coding/scenario: evaluate semantically. Partial credit is allowed (0 to maxScore).
- proficiencyLevel: "Beginner" (0-39), "Intermediate" (40-69), "Advanced" (70-89), "Expert" (90-100).
- strengths: 2-4 specific areas where the student showed good understanding.
- weaknesses: 2-4 specific areas where the student needs improvement.
- recommendations: 2-4 actionable suggestions for improvement.
- Return ONLY the JSON.`;

  const text = await callAnthropic(prompt);
  if (!text) return null;

  try {
    const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return parsed as EvaluationResult;
  } catch (e) {
    console.error("Failed to parse evaluation:", e, text);
    return null;
  }
}
