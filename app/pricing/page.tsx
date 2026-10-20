"use client";

import "@/lib/disable-openui-inspect";
import { AriaWorkspacePage } from "@/components/chat/aria-workspace-page";
import "../chat/chat.css";
import "../chat/openui-chat.css";
import "../chat/library.css";
import "../chat/profile.css";
import "../chat/account.css";
import "../chat/pricing.css";
import "../chat/settings-modal.css";
import "../chat/help.css";
import "../transitions-chat.css";

export default function PricingPage() {
  return <AriaWorkspacePage initialPath="pricing" />;
}
