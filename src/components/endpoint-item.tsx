"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { MethodBadge } from "@/components/method-badge";
import { EndpointSpecPanel } from "@/components/endpoint-spec-panel";
import { useLanguage } from "@/contexts/language-context";
import { useSpec } from "@/contexts/spec-context";
import { cn } from "@/lib/utils";
import type { ParsedEndpoint } from "@/types/openapi";

interface EndpointItemProps {
  endpoint: ParsedEndpoint;
  isSelected: boolean;
  onToggle: () => void;
}

export function EndpointItem({ endpoint, isSelected, onToggle }: EndpointItemProps) {
  const [specOpen, setSpecOpen] = useState(false);
  const { spec } = useSpec();
  const { t } = useLanguage();

  const hasParameters = !!(endpoint.parameters && endpoint.parameters.length > 0);
  const hasRequestBody = !!(
    endpoint.requestBody && Object.keys(endpoint.requestBody.content ?? {}).length > 0
  );
  const hasSchemas = !!(
    endpoint.schemaRefs &&
    endpoint.schemaRefs.length > 0 &&
    spec?.schemas
  );
  const hasDetails = hasParameters || hasRequestBody || hasSchemas || !!endpoint.description;

  return (
    <div className={cn("border-l-2", isSelected ? "border-primary" : "border-transparent")}>
      <div
        className={cn(
          "hover:bg-muted/30 flex cursor-pointer items-start gap-3 px-6 py-3 transition-colors",
          isSelected && "bg-primary/10",
        )}
        onClick={onToggle}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggle}
          className="mt-0.5 shrink-0"
          onClick={(e) => e.stopPropagation()}
        />
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <MethodBadge method={endpoint.method} />
          <div className="min-w-0 flex-1">
            <code className="font-mono text-sm break-all">{endpoint.path}</code>
            {endpoint.summary && (
              <p className="text-muted-foreground mt-0.5 text-xs">{endpoint.summary}</p>
            )}
          </div>
        </div>

        {hasDetails && (
          <button
            className="text-muted-foreground hover:text-foreground mt-0.5 shrink-0"
            aria-label={t.specViewerOpenButton}
            onClick={(e) => {
              e.stopPropagation();
              setSpecOpen((v) => !v);
            }}
          >
            {specOpen ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </button>
        )}
      </div>

      {hasDetails && specOpen && <EndpointSpecPanel endpoint={endpoint} />}
    </div>
  );
}

