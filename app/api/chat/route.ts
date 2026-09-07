import { NextResponse } from "next/server";
import { generateAriaReply, type ChatTurn } from "@/lib/aria/model";
import type { ProfileData } from "@/lib/aria/profile";
import type { SettingsData } from "@/lib/aria/settings";
import { toPublicChatError } from "@/lib/aria/public-errors";

export const runtime = "nodejs";

type ChatRequestBody = {
  messages?: ChatTurn[];
  settings?: Partial<SettingsData>;
  profile?: Partial<ProfileData>;
  timeZone?: string;
  now?: string;
};

function isChatTurn(value: unknown): value is ChatTurn {
  if (!value || typeof value !== "object") return false;
  const turn = value as ChatTurn;
  return (
    (turn.role === "user" ||
      turn.role === "assistant" ||
      turn.role === "system") &&
    typeof turn.content === "string"
  );
}

export async function POST(request: Request) {
  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const messages = Array.isArray(body.messages)
    ? body.messages.filter(isChatTurn)
    : [];

  if (messages.length === 0) {
    return NextResponse.json(
      { error: "messages must include at least one turn" },
      { status: 400 },
    );
  }

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser?.content.trim()) {
    return NextResponse.json(
      { error: "A non-empty user message is required" },
      { status: 400 },
    );
  }

  try {
    const reply = await generateAriaReply({
      messages,
      context: {
        settings: body.settings ?? null,
        profile: body.profile ?? null,
        timeZone: body.timeZone ?? null,
        now: body.now ?? null,
      },
    });

    return NextResponse.json({
      content: reply.content,
      completionTokens: reply.completionTokens,
      promptTokens: reply.promptTokens,
      model: "aria",
      sources: reply.sources,
      grounded: reply.grounded,
      searchStatus: reply.searchStatus,
    });
  } catch (error) {
    const { status, message } = toPublicChatError(error);
    console.error("[api/chat]", error);
    return NextResponse.json({ error: message }, { status });
  }
}
