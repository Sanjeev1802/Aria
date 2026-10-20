"use client";

import { Check } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { ARIA_AGENT_MODELS } from "@/lib/aria-models";

type Props = {
  model: string;
  onSelect: (label: string) => void;
};

export function AriaAgentModelMenuItems({ model, onSelect }: Props) {
  return (
    <>
      {ARIA_AGENT_MODELS.map(({ label, description }) => (
        <DropdownMenuItem key={label} onSelect={() => onSelect(label)}>
          <span className="flex flex-col gap-0.5">
            <span>{label}</span>
            {description ? (
              <span className="text-muted-foreground text-xs font-normal">{description}</span>
            ) : null}
          </span>
          {model === label && <Check size={14} className="ml-auto shrink-0" />}
        </DropdownMenuItem>
      ))}
    </>
  );
}
