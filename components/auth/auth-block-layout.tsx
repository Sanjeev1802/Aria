import Link from "next/link";
import { AriaMark } from "@/components/aria-mark";

export function AuthBlockLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10 dark:bg-background">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link href="/" className="text-foreground flex items-center gap-2 self-center font-semibold tracking-wide">
          <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-md">
            <AriaMark className="size-5" />
          </span>
          ARIA
        </Link>
        {children}
      </div>
    </div>
  );
}
