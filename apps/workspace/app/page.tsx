import { RequireAuth } from "@/components/RequireAuth";
import { AriaShell } from "@/components/AriaShell";

export default function WorkspaceHomePage() {
  return (
    <RequireAuth>
      <AriaShell />
    </RequireAuth>
  );
}
