import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;

  const conversations = await prisma.conversation.findMany({
    where: { userId: auth.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });

  return NextResponse.json({
    conversations: conversations.map((conversation) => ({
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt.getTime(),
      updatedAt: conversation.createdAt.getTime(),
      messages: [],
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;

  let body: { title?: string };
  try {
    body = (await request.json()) as { title?: string };
  } catch {
    body = {};
  }

  const conversation = await prisma.conversation.create({
    data: {
      userId: auth.user.id,
      title: body.title?.trim() || "New chat",
    },
  });

  return NextResponse.json({
    conversation: {
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt.getTime(),
      updatedAt: conversation.createdAt.getTime(),
      messages: [],
    },
  });
}
