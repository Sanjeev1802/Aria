export type DayPart = "morning" | "afternoon" | "evening" | "night";

const GREETINGS: Record<DayPart, string[]> = {
  morning: [
    "Good morning",
    "Morning",
    "Hey there",
    "Rise and shine",
    "Hope your morning’s going well",
  ],
  afternoon: [
    "Good afternoon",
    "Hey there",
    "Hello",
    "Good to see you",
    "What’s on your mind",
  ],
  evening: [
    "Good evening",
    "Hey there",
    "Hello",
    "Welcome back",
    "How was your day",
  ],
  night: [
    "Hey there",
    "Good evening",
    "Still up",
    "Burning the midnight oil",
    "Hello",
  ],
};

export function getDayPart(date = new Date()): DayPart {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
}

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Stable greeting for a thread/session; changes when `seed` changes (e.g. new chat). */
export function pickChatGreeting(userName: string, seed: string, date = new Date()): string {
  const part = getDayPart(date);
  const options = GREETINGS[part];
  const index = hashSeed(`${seed}:${part}:${userName}`) % options.length;
  const line = options[index] ?? "Hey there";
  const name = userName.trim();
  return name ? `${line}, ${name}` : line;
}

export function firstName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0] ?? trimmed;
}
