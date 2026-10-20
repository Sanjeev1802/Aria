"use client";

import { useAui } from "@assistant-ui/react";
import { Globe, ImageIcon, PencilLine } from "lucide-react";
import type { FC } from "react";

const ACTIONS = [
  {
    icon: ImageIcon,
    label: "Create an image or sticker",
    prompt: "Create an image or sticker concept for a product launch hero.",
  },
  {
    icon: PencilLine,
    label: "Write or edit",
    prompt: "Help me write and edit a concise executive summary.",
  },
  {
    icon: Globe,
    label: "Search the web",
    prompt: "Search the web for the latest trends in digital engagement.",
  },
] as const;

export const ChatGptQuickActions: FC = () => {
  const aui = useAui();

  return (
    <div className="cgpt-quick-actions" data-slot="cgpt_quick_actions">
      {ACTIONS.map(({ icon: Icon, label, prompt }) => (
        <button
          key={label}
          type="button"
          className="cgpt-quick-action"
          onClick={() => {
            aui.thread.composer().setText(prompt);
            aui.thread.composer().send();
          }}
        >
          <Icon className="cgpt-quick-action-icon" size={18} strokeWidth={1.75} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
};
