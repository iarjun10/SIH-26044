import { supabase } from '@/lib/supabase';

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  linkId?: string
) {
  await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    message,
    link_id: linkId ?? null,
  });
}

export function parseStipend(stipend: string): number {
  const match = stipend.match(/[\d,]+/);
  if (!match) return 0;
  return parseInt(match[0].replace(/,/g, ''), 10);
}

export function parseDurationMonths(duration: string): number {
  const match = duration.match(/(\d+)\s*month/i);
  if (match) return parseInt(match[1], 10);
  const weekMatch = duration.match(/(\d+)\s*week/i);
  if (weekMatch) return parseInt(weekMatch[1], 10) / 4;
  return 0;
}
