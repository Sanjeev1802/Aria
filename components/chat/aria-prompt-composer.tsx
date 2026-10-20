"use client";

import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/prompt-kit/prompt-input";
import { Button } from "@/components/ui/button";
import {
  ComposerPrimitive,
  unstable_useComposerInput,
  useAuiState,
} from "@assistant-ui/react";
import { ArrowUp, Globe, Mic, MoreHorizontal, Plus } from "lucide-react";

type AriaPromptComposerProps = {
  autoFocus?: boolean;
};

export function AriaPromptComposer({ autoFocus = true }: AriaPromptComposerProps) {
  const { value, setText, send, isDisabled, canSend } = unstable_useComposerInput();
  const isRunning = useAuiState((s) => s.thread.isRunning);
  const canCancel = useAuiState((s) => s.composer.canCancel);

  const handleSubmit = () => {
    if (canSend) send();
  };

  return (
    <ComposerPrimitive.Root className="aria-prompt-composer w-full">
      <PromptInput
        isLoading={isRunning}
        value={value}
        onValueChange={setText}
        onSubmit={handleSubmit}
        disabled={isDisabled}
        className="border-[var(--cgpt-border)] bg-[var(--cgpt-surface)] relative z-10 w-full rounded-3xl border p-0 pt-1 shadow-xs"
      >
        <div className="flex flex-col">
          <PromptInputTextarea
            autoFocus={autoFocus}
            placeholder="Ask anything"
            className="min-h-[44px] pt-3 pl-4 text-base leading-[1.3] text-[var(--cgpt-text)] placeholder:text-[var(--cgpt-muted)] sm:text-base md:text-base"
          />

          <PromptInputActions className="mt-3 flex w-full items-center justify-between gap-2 px-3 pb-3">
            <div className="flex items-center gap-2">
              <PromptInputAction tooltip="Add (preview)">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-9 rounded-full border-[var(--cgpt-border)] bg-transparent"
                  disabled
                >
                  <Plus size={18} />
                </Button>
              </PromptInputAction>

              <PromptInputAction tooltip="Search (preview)">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full border-[var(--cgpt-border)] bg-transparent"
                  disabled
                >
                  <Globe size={18} />
                  Search
                </Button>
              </PromptInputAction>

              <PromptInputAction tooltip="More actions (preview)">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-9 rounded-full border-[var(--cgpt-border)] bg-transparent"
                  disabled
                >
                  <MoreHorizontal size={18} />
                </Button>
              </PromptInputAction>
            </div>

            <div className="flex items-center gap-2">
              <PromptInputAction tooltip="Voice input (preview)">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-9 rounded-full border-[var(--cgpt-border)] bg-transparent"
                  disabled
                >
                  <Mic size={18} />
                </Button>
              </PromptInputAction>

              {isRunning && canCancel ? (
                <ComposerPrimitive.Cancel asChild>
                  <Button
                    type="button"
                    size="icon"
                    className="size-9 rounded-full"
                    aria-label="Stop generating"
                  >
                    <span className="size-3 rounded-xs bg-white" />
                  </Button>
                </ComposerPrimitive.Cancel>
              ) : (
                <Button
                  type="button"
                  size="icon"
                  disabled={!value.trim() || isDisabled || !canSend}
                  onClick={handleSubmit}
                  className="size-9 rounded-full"
                  aria-label="Send message"
                >
                  <ArrowUp size={18} />
                </Button>
              )}
            </div>
          </PromptInputActions>
        </div>
      </PromptInput>
    </ComposerPrimitive.Root>
  );
}

/** Alias matching prompt-kit block export name. */
export { AriaPromptComposer as PromptInputWithActions };
