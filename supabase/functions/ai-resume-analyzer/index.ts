import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ResumeExtraction {
  name: string;
  email: string;
  phone: string;
  education: Array<{
    degree: string;
    institution: string;
    year: string;
    specialization: string;
  }>;
  degree: string;
  specialization: string;
  technical_skills: string[];
  programming_languages: string[];
  frameworks: string[];
  tools: string[];
  ai_ml_skills: string[];
  domain_skills: string[];
  ayush_healthcare_skills: string[];
  soft_skills: string[];
  projects: Array<{
    name: string;
    description: string;
    technologies: string[];
  }>;
  certifications: Array<{
    name: string;
    issuer: string;
    year: string;
  }>;
  internships: Array<{
    company: string;
    role: string;
    duration: string;
    description: string;
  }>;
  research_experience: Array<{
    title: string;
    description: string;
  }>;
  work_experience: Array<{
    company: string;
    role: string;
    duration: string;
    description: string;
  }>;
  achievements: string[];
}

const EXTRACTION_PROMPT = `You are an expert resume parser. Analyze the following resume text and extract structured information.

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation, no code fences):

{
  "name": "",
  "email": "",
  "phone": "",
  "education": [{"degree": "", "institution": "", "year": "", "specialization": ""}],
  "degree": "",
  "specialization": "",
  "technical_skills": [],
  "programming_languages": [],
  "frameworks": [],
  "tools": [],
  "ai_ml_skills": [],
  "domain_skills": [],
  "ayush_healthcare_skills": [],
  "soft_skills": [],
  "projects": [{"name": "", "description": "", "technologies": []}],
  "certifications": [{"name": "", "issuer": "", "year": ""}],
  "internships": [{"company": "", "role": "", "duration": "", "description": ""}],
  "research_experience": [{"title": "", "description": ""}],
  "work_experience": [{"company": "", "role": "", "duration": "", "description": ""}],
  "achievements": []
}

Rules:
- If a field is not found in the resume, use an empty string or empty array as appropriate.
- Extract ALL skills mentioned, including implied ones from project descriptions.
- For "ayush_healthcare_skills", look for Ayurveda, Yoga, Unani, Siddha, Homeopathy, or general healthcare/domain skills.
- For "ai_ml_skills", look for Machine Learning, Deep Learning, NLP, Computer Vision, TensorFlow, PyTorch, etc.
- Be thorough but accurate. Do not invent information that is not in the resume.
- Normalize skill names to their canonical form (e.g., "React.js" -> "React", "Python programming" -> "Python").
- Return ONLY the JSON, nothing else.`;

function notConfiguredResponse(): Response {
  return new Response(
    JSON.stringify({
      error: "AI service is not configured. Please set the GROQ_API_KEY secret in Supabase Edge Functions.",
      code: "AI_NOT_CONFIGURED",
    }),
    { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { filePath, fileName, studentId } = await req.json();

    if (!filePath || !studentId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: filePath, studentId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Download the resume file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("resumes")
      .download(filePath);

    if (downloadError || !fileData) {
      return new Response(
        JSON.stringify({ error: `Failed to download resume: ${downloadError?.message ?? "unknown"}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract text from the file
    const fileExt = filePath.split(".").pop()?.toLowerCase();
    let resumeText = "";

    if (fileExt === "pdf") {
      resumeText = await extractPdfText(fileData);
    } else if (fileExt === "txt" || fileExt === "md") {
      resumeText = await fileData.text();
    } else {
      try {
        resumeText = await fileData.text();
      } catch {
        resumeText = fileName.replace(/[_-]/g, " ").replace(/\.\w+$/, "");
      }
    }

    if (!resumeText || resumeText.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: "Could not extract sufficient text from the resume. Please ensure the file contains readable text." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check AI configuration before calling
    const apiKey = Deno.env.get("GROQ_API_KEY");
    if (!apiKey) {
      return notConfiguredResponse();
    }

    const extraction = await callGroqForExtraction(resumeText);

    if (!extraction) {
      return new Response(
        JSON.stringify({ error: "AI analysis failed. Please try again." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Save the extracted data to resume_analysis table
    const { error: insertError } = await supabase
      .from("resume_analysis")
      .insert({
        student_id: studentId,
        file_path: filePath,
        file_name: fileName,
        extracted_data: extraction,
        raw_text: resumeText.substring(0, 50000),
      });

    if (insertError) {
      console.error("Failed to save resume analysis:", insertError);
    }

    return new Response(
      JSON.stringify({ extraction, rawTextLength: resumeText.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Resume analyzer error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function extractPdfText(fileData: Blob): Promise<string> {
  try {
    const arrayBuffer = await fileData.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let text = "";

    let rawStr = "";
    for (let i = 0; i < bytes.length; i++) {
      rawStr += String.fromCharCode(bytes[i]);
    }

    const textMatches = rawStr.match(/BT\s*(.*?)\s*ET/gs);
    if (textMatches) {
      for (const match of textMatches) {
        const tjMatches = match.match(/\((.*?)\)\s*Tj/g);
        if (tjMatches) {
          for (const tj of tjMatches) {
            const m = tj.match(/\((.*?)\)/);
            if (m) {
              text += m[1] + " ";
            }
          }
        }
        const tjArrayMatches = match.match(/\[(.*?)\]\s*TJ/g);
        if (tjArrayMatches) {
          for (const tj of tjArrayMatches) {
            const parts = tj.match(/\((.*?)\)/g);
            if (parts) {
              for (const part of parts) {
                text += part.replace(/[()]/g, "") + " ";
              }
            }
          }
        }
      }
    }

    if (text.trim().length > 20) {
      return text.replace(/[^\x20-\x7E\n]/g, " ").replace(/\s+/g, " ").trim();
    }

    const asciiText = rawStr.replace(/[^\x20-\x7E\n]/g, " ");
    const lines = asciiText.split("\n").filter((l) => {
      const letters = l.replace(/[^a-zA-Z]/g, "").length;
      return letters > 2 && l.trim().length > 3;
    });
    return lines.join("\n").trim();
  } catch (e) {
    console.error("PDF extraction error:", e);
    return "";
  }
}

async function callGroqForExtraction(resumeText: string): Promise<ResumeExtraction | null> {
  const apiUrl = "https://api.groq.com/openai/v1";
  const apiKey = Deno.env.get("GROQ_API_KEY");

  if (!apiKey) {
    return null;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`,
  };

  const body = {
    model: "llama-3.3-70b-versatile",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `${EXTRACTION_PROMPT}\n\n--- RESUME TEXT ---\n${resumeText.substring(0, 40000)}`,
      },
    ],
    response_format: { type: "json_object" },
  };

  try {
    const response = await fetch(`${apiUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Groq API error:", response.status, errText);
      return null;
    }

    const data = await response.json();
    const textContent = data?.choices?.[0]?.message?.content;

    if (!textContent) {
      console.error("No text content in Groq response");
      return null;
    }

    const jsonStr = textContent
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();

    const parsed = JSON.parse(jsonStr);
    return parsed as ResumeExtraction;
  } catch (err) {
    console.error("Groq call failed:", err);
    return null;
  }
}
