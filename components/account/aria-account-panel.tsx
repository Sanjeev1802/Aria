"use client";

import type { ReactNode } from "react";

export type AriaAccountPanelProps = {
  title: string;
  description?: string;
  children: ReactNode;
  /** BEM modifier, e.g. profile | upgrade */
  variant?: string;
  headerEnd?: ReactNode;
};

export function AriaAccountPanel({
  title,
  description,
  children,
  variant,
  headerEnd,
}: AriaAccountPanelProps) {
  return (
    <div
      className={
        variant
          ? `aria-account-panel aria-account-panel--${variant}`
          : "aria-account-panel"
      }
    >
      <div className="aria-account-panel__scroll">
        <header className="aria-account-panel__header">
          <div className="aria-account-panel__header-text">
            <h1 className="aria-account-panel__title">{title}</h1>
            {description ? <p className="aria-account-panel__description">{description}</p> : null}
          </div>
          {headerEnd ? <div className="aria-account-panel__header-end">{headerEnd}</div> : null}
        </header>
        {children}
      </div>
    </div>
  );
}
