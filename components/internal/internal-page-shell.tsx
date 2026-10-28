import type { ReactNode } from "react";

export function InternalPageShell({ children }: { children: ReactNode }) {
  return <div className="internal-page">{children}</div>;
}
