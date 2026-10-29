"use client";

import { AriaMark } from "@/components/aria-mark";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { WorkspaceAuthIntent } from "@/lib/workspace-auth-dialog";
import { ArrowRight, Code2, LockKeyhole } from "lucide-react";
import type { RefObject } from "react";

type Props = {
  dialog: string | null;
  authIntent: WorkspaceAuthIntent | null;
  prompt: string;
  fileName?: string;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  onClose: () => void;
  onBeginWorkspace: (intent: WorkspaceAuthIntent) => void;
};

export function LandingPreviewDialog({
  dialog,
  authIntent,
  prompt,
  fileName,
  inputRef,
  onClose,
  onBeginWorkspace,
}: Props) {
  return (
    <Dialog open={dialog !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="aria-dialog">
        <DialogHeader>
          <div className="dialog-brand"><AriaMark /></div>
          <DialogTitle>{dialog}</DialogTitle>
          <DialogDescription>
            {authIntent
              ? "Preview only — no real account is created. You’ll see a short workspace load, then enter ARIA."
              : "This is an interactive design preview. Accounts, payments, and live AI responses aren’t connected yet."}
          </DialogDescription>
        </DialogHeader>
        {authIntent ? (
          <label className="auth-dialog-field">
            <span>Email</span>
            <input type="email" autoComplete="email" placeholder="you@company.com" defaultValue="" />
          </label>
        ) : null}
        {prompt.trim() && !authIntent ? (
          <div className="draft-preview">
            <span>YOUR DRAFT</span>
            <p>{prompt}</p>
            {fileName ? <small>Attachment selected: {fileName}</small> : null}
          </div>
        ) : null}
        {dialog?.includes("API") ? (
          <div className="api-preview-info">
            <Code2 size={20} />
            <p>Planned for Pro and Team: scoped keys, streaming responses, project spending caps, and one shared credit balance.</p>
          </div>
        ) : null}
        <p className="dialog-note"><LockKeyhole size={14} /> Nothing has been sent or charged.</p>
        {authIntent ? (
          <Button className="dialog-button" onClick={() => onBeginWorkspace(authIntent)}>
            {authIntent === "sign-in" ? "Sign in" : "Create account"}
            <ArrowRight size={16} />
          </Button>
        ) : (
          <Button
            className="dialog-button"
            onClick={() => {
              onClose();
              window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 50);
            }}
          >
            Keep exploring <ArrowRight size={16} />
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
