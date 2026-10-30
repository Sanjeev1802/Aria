"use client";

import { LogOut } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import "./sign-out-confirm.css";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  pending?: boolean;
};

export function SignOutConfirmDialog({ open, onOpenChange, onConfirm, pending }: Props) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="aria-sign-out-overlay" />
        <DialogPrimitive.Content
          className="aria-sign-out-confirm"
          aria-describedby="aria-sign-out-desc"
          onOpenAutoFocus={event => event.preventDefault()}
        >
          <div className="aria-sign-out-confirm__icon">
            <LogOut size={20} strokeWidth={1.75} aria-hidden />
          </div>
          <DialogPrimitive.Title className="aria-sign-out-confirm__title">
            Sign out?
          </DialogPrimitive.Title>
          <DialogPrimitive.Description
            id="aria-sign-out-desc"
            className="aria-sign-out-confirm__description"
          >
            You will be signed out of ARIA on this device. You can sign in again at any time.
          </DialogPrimitive.Description>
          <div className="aria-sign-out-confirm__actions">
            <button
              type="button"
              className="aria-sign-out-confirm__cancel"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="aria-sign-out-confirm__submit"
              disabled={pending}
              onClick={() => void onConfirm()}
            >
              {pending ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
