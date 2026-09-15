import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

async function ownedConversation(userId: string, id: string) {
  return prisma.conversation.findFirst({
    where: { id, userId },
  });
}

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const conversation = await prisma.conversation.findFirst({
    where: { id, userId: auth.user.id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  return NextResponse.json({
    conversation: {
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt.getTime(),
      updatedAt:
        conversation.messages.at(-1)?.createdAt.getTime() ??
        conversation.createdAt.getTime(),
      messages: conversation.messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: message.createdAt.getTime(),
      })),
    },
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const existing = await ownedConversation(auth.user.id, id);
  if (!existing) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  let body: { title?: string };
  try {
    body = (await request.json()) as { title?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const conversation = await prisma.conversation.update({
    where: { id },
    data: { title: body.title?.trim() || existing.title },
  });

  return NextResponse.json({
    conversation: {
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt.getTime(),
    },
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const existing = await ownedConversation(auth.user.id, id);
  if (!existing) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  await prisma.conversation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
