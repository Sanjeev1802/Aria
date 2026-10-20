"use client";

import "@/lib/disable-openui-inspect";
import { AriaWorkspacePage } from "@/components/chat/aria-workspace-page";
import "./chat.css";
import "../transitions-chat.css";
import "./openui-chat.css";
import "./library.css";
import "./profile.css";
import "./account.css";
import "./pricing.css";
import "./settings-modal.css";
import "./help.css";

export default function ChatPage() {
  return <AriaWorkspacePage />;
}
