import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function InternalKpiCard({
  label,
  value,
  footerTitle,
  footerDetail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  footerTitle: string;
  footerDetail: string;
  icon: LucideIcon;
  tone: "blue" | "violet" | "teal" | "orange";
}) {
  return (
    <Card className={`internal-stat internal-stat-${tone} gap-0 py-4 shadow-xs`}>
      <CardHeader className="gap-1 px-4 pb-0 sm:px-6">
        <CardDescription className="internal-stat-top flex items-center justify-between gap-2 text-xs font-medium">
          <span>{label}</span>
          <span className="internal-stat-icon">
            <Icon size={16} aria-hidden />
          </span>
        </CardDescription>
        <CardTitle className="internal-stat-value tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2 px-4 pt-3 sm:px-6">
        <Badge variant="secondary" className="font-normal tabular-nums">
          {footerTitle}
        </Badge>
        <small className="text-xs text-muted-foreground">{footerDetail}</small>
      </CardContent>
    </Card>
  );
}
