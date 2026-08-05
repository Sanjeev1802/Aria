const replies = [
  "Based on your workspace data, here is a grounded starting point. I would validate this against Atlas metrics and recent internal reports before any executive decision.",
  "I can help turn that into an actionable summary. Connect your analytics source or ask me to pull from Business Memory for context.",
  "ARIA can search knowledge, analyze trends, and draft executive-ready notes. Tell me which dataset or document set to prioritize.",
  "That is a strong question for enterprise context. I would break it into: current baseline, drivers, and recommended next actions.",
];

export async function mockAssistantReply(prompt: string): Promise<string> {
  await new Promise((resolve) =>
    setTimeout(resolve, 650 + Math.floor(Math.random() * 400)),
  );
  const index = prompt.length % replies.length;
  return `${replies[index]}\n\nYou asked: “${prompt.trim()}”\n\n_(Mock reply — connect the AI backend when ready.)_`;
}
