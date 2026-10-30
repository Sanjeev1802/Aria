"use client";

import { RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ModelStatusChip } from "./model-status";
import { internalRoleLabel, type InternalRole } from "./internal-operator-role";
import {
  internalSectionBreadcrumb,
  internalSectionLabel,
  type InternalSection,
} from "./internal-section";

export function InternalPageHeader({
  section,
  role,
  refreshing,
  refreshedAt,
  onRefresh,
}: {
  section: InternalSection;
  role?: InternalRole;
  refreshing: boolean;
  refreshedAt: number | null;
  onRefresh: () => void;
}) {
  const refreshLabel = refreshedAt
    ? `Last refresh ${new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(refreshedAt)}`
    : null;

  return (
    <header className="internal-topbar sticky top-0 z-20 flex shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:gap-3">
      <SidebarTrigger className="-ml-1 shrink-0" />
      <Separator orientation="vertical" className="mr-1 hidden h-4 sm:block" />
      <p className="min-w-0 flex-1 truncate text-sm font-semibold xl:hidden">{internalSectionLabel(section)}</p>
      <nav className="internal-crumb min-w-0 flex-1 overflow-hidden whitespace-nowrap text-xs max-xl:hidden!" aria-label="Breadcrumb">
        <span>ARIA Internal</span>
        <span aria-hidden>/</span>
        <span>{internalSectionBreadcrumb(section)}</span>
        <span aria-hidden>/</span>
        <strong>{internalSectionLabel(section)}</strong>
      </nav>
      <div className="internal-top-actions ml-auto flex flex-wrap items-center gap-2 sm:gap-3">
        <span className="hidden lg:inline-flex"><ModelStatusChip /></span>
        {refreshLabel ? (
          <span className="internal-status hidden whitespace-nowrap xl:inline-flex" role="status" aria-live="polite">
            <span className="internal-live" aria-hidden="true" />
            {refreshLabel.replace("Last refresh", "Updated")}
          </span>
        ) : null}
        <Button type="button" variant="outline" size="sm" className="h-8" disabled={refreshing} onClick={onRefresh}>
          <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
          Refresh
        </Button>
        {role ? (
          <Badge variant={role === "super_admin" ? "default" : "secondary"} className="uppercase tracking-wide">
            {internalRoleLabel(role)}
          </Badge>
        ) : null}
      </div>
    </header>
  );
}
