"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Folder, Lightbulb } from "lucide-react";
import { useEffect, useId, useRef } from "react";

export type AriaCreateProjectDialogProps = {
  open: boolean;
  name: string;
  onNameChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onCreate: () => void;
};

export function AriaCreateProjectDialog({
  open,
  name,
  onNameChange,
  onOpenChange,
  onCreate,
}: AriaCreateProjectDialogProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const id = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="aria-create-project-dialog border-0 bg-transparent p-0 shadow-none ring-0 sm:max-w-[420px]"
      >
        <div className="aria-create-project-dialog__card">
          <DialogTitle className="aria-create-project-dialog__title">Create project</DialogTitle>

          <label htmlFor={inputId} className="aria-create-project-dialog__label">
            Project name
          </label>
          <div className="aria-create-project-dialog__input-wrap">
            <Folder className="aria-create-project-dialog__input-icon" size={18} strokeWidth={1.75} aria-hidden />
            <input
              id={inputId}
              ref={inputRef}
              type="text"
              className="aria-create-project-dialog__input"
              placeholder="Copenhagen Trip"
              value={name}
              maxLength={80}
              autoComplete="off"
              onChange={(e) => onNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onCreate();
                }
              }}
            />
          </div>

          <div className="aria-create-project-dialog__info">
            <Lightbulb className="aria-create-project-dialog__info-icon" size={18} strokeWidth={1.75} aria-hidden />
            <p className="aria-create-project-dialog__info-text">
              Keep related chats together. Start a chat in this project or move an existing chat here from its menu.
            </p>
          </div>

          <div className="aria-create-project-dialog__footer">
            <button type="button" className="aria-create-project-dialog__submit" onClick={onCreate}>
              Create project
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
