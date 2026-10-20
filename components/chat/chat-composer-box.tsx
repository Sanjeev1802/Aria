"use client";

import { ChevronDown, PanelRight, Plus, Sparkles, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { ChatMode } from "@/lib/chat-preview";

type Props = {
  draft: string;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  isBusy: boolean;
  model: string;
  onModelChange: (model: string) => void;
  mode: ChatMode;
  onToggleEvidence: () => void;
  onStop: () => void;
};

/** Layout from transitions.dev index.html cm-composer (no logo). */
export function ChatComposerBox({
  draft,
  onDraftChange,
  onSubmit,
  disabled,
  isBusy,
  model,
  onModelChange,
  mode,
  onToggleEvidence,
  onStop,
}: Props) {
  return (
    <div className="chat-cm-beam">
      <form
        className="chat-cm-composer"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <label className="sr-only" htmlFor="chat-prompt">
          Message ARIA
        </label>
        <textarea
          id="chat-prompt"
          rows={1}
          maxLength={4000}
          value={draft}
          placeholder={mode === "intelligence" ? "Ask about markets, metrics, or documents…" : "Message ARIA…"}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              onSubmit();
            }
          }}
        />
        <div className="chat-cm-composer-row">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="chat-cm-round" aria-label="More options">
                <Plus strokeWidth={1.5} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem disabled>Attach file (preview)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="chat-cm-pill" aria-haspopup="menu">
                <Sparkles size={14} />
                {model}
                <ChevronDown size={12} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {["Auto", "Claude", "Amazon Nova"].map((name) => (
                <DropdownMenuItem key={name} onSelect={() => onModelChange(name)}>
                  {name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <span className="chat-cm-grow" />

          <button type="button" className="chat-cm-pill" onClick={onToggleEvidence}>
            <PanelRight size={14} />
            Sources
          </button>

          {isBusy && (
            <Button type="button" variant="secondary" size="sm" className="h-8 rounded-full" onClick={onStop}>
              <Square size={12} className="mr-1" />
              Stop
            </Button>
          )}

          <button
            type="submit"
            className="chat-cm-round chat-cm-send"
            disabled={!draft.trim() || disabled}
            aria-label="Send message"
            aria-busy={isBusy}
          >
            <svg className="cm-arrow" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M7.99967 12.6667V3.33337M12.6663 8.00004L7.99967 3.33337L3.33301 8.00004"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
