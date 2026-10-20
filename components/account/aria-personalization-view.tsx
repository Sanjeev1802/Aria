"use client";

import { AriaAccountPanel } from "@/components/account/aria-account-panel";
import { Textarea } from "@/components/ui/textarea";
import {
  loadAriaPersonalization,
  saveAriaPersonalization,
  type AriaPersonalizationSnapshot,
} from "@/lib/aria-personalization-storage";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const PERSONALITIES: {
  id: AriaPersonalizationSnapshot["personality"];
  label: string;
  hint: string;
}[] = [
  { id: "default", label: "Default", hint: "Balanced and helpful" },
  { id: "friendly", label: "Friendly", hint: "Warm and conversational" },
  { id: "professional", label: "Professional", hint: "Clear and formal" },
  { id: "concise", label: "Concise", hint: "Short, direct answers" },
];

function ToggleRow({
  label,
  description,
  pressed,
  onPressedChange,
}: {
  label: string;
  description?: string;
  pressed: boolean;
  onPressedChange: (next: boolean) => void;
}) {
  return (
    <div className="aria-settings__row">
      <div className="aria-settings__row-text">
        <span className="aria-settings__row-label">{label}</span>
        {description ? <span className="aria-settings__row-desc">{description}</span> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={pressed}
        className={cn("aria-settings__toggle", pressed && "aria-settings__toggle--on")}
        onClick={() => onPressedChange(!pressed)}
      >
        <span className="aria-settings__toggle-thumb" />
      </button>
    </div>
  );
}

export function AriaPersonalizationView() {
  const [state, setState] = useState<AriaPersonalizationSnapshot>(() => loadAriaPersonalization());

  useEffect(() => {
    saveAriaPersonalization(state);
  }, [state]);

  return (
    <AriaAccountPanel
      variant="personalization"
      title="Personalization"
      description="Tell ARIA how to respond and what to remember across chats."
    >
      <section className="aria-account-section" aria-labelledby="aria-pers-instructions">
        <h2 id="aria-pers-instructions" className="aria-account-section__title">
          Custom instructions
        </h2>
        <p className="aria-account-section__hint">
          Preferences apply to new messages in this workspace.
        </p>
        <Textarea
          className="aria-personalization__instructions"
          placeholder="e.g. I’m a product manager. Be concise, use bullet points, and suggest next steps."
          value={state.customInstructions}
          onChange={(e) => setState((s) => ({ ...s, customInstructions: e.target.value }))}
          rows={5}
        />
      </section>

      <section className="aria-account-section" aria-labelledby="aria-pers-personality">
        <h2 id="aria-pers-personality" className="aria-account-section__title">
          Personality
        </h2>
        <div className="aria-personalization__chips" role="list">
          {PERSONALITIES.map(({ id, label, hint }) => {
            const active = state.personality === id;
            return (
              <button
                key={id}
                type="button"
                role="listitem"
                className={cn(
                  "aria-personalization__chip",
                  active && "aria-personalization__chip--active",
                )}
                aria-pressed={active}
                onClick={() => setState((s) => ({ ...s, personality: id }))}
              >
                <span className="aria-personalization__chip-label">{label}</span>
                <span className="aria-personalization__chip-hint">{hint}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="aria-account-section aria-settings__group" aria-label="Memory">
        <ToggleRow
          label="Memory"
          description="Let ARIA remember useful details between conversations."
          pressed={state.memoryEnabled}
          onPressedChange={(memoryEnabled) => setState((s) => ({ ...s, memoryEnabled }))}
        />
        <ToggleRow
          label="Reference chat history"
          description="Use recent threads for context when you ask follow-ups."
          pressed={state.referenceChatHistory}
          onPressedChange={(referenceChatHistory) =>
            setState((s) => ({ ...s, referenceChatHistory }))
          }
        />
      </section>
    </AriaAccountPanel>
  );
}
