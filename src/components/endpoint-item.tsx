"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Loader2, Send } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { MethodBadge } from "@/components/method-badge";
import { EndpointSpecPanel } from "@/components/endpoint-spec-panel";
import { useLanguage } from "@/contexts/language-context";
import { useSpec } from "@/contexts/spec-context";
import { useHttpSender } from "@/contexts/http-sender-context";
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
  const sender = useHttpSender();

  const hasParameters = !!(endpoint.parameters && endpoint.parameters.length > 0);
  const hasRequestBody = !!(
    endpoint.requestBody && Object.keys(endpoint.requestBody.content ?? {}).length > 0
  );
  const hasSchemas = !!(
    endpoint.schemaRefs &&
    spec?.schemas &&
    endpoint.schemaRefs.some((name) => spec.schemas![name] !== undefined)
  );
  const hasDetails = hasParameters || hasRequestBody || hasSchemas || !!endpoint.description;

  const handleSendClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!spec || sender.loading) {
      return;
    }

    sender.sendEndpoint(spec, endpoint);
  };

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
          className="mt-0.5 shrink-0 cursor-pointer"
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

        <button
          className="text-muted-foreground hover:text-primary mt-0.5 shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={t.endpointSend}
          title={t.endpointSend}
          onClick={handleSendClick}
          disabled={sender.loading}
        >
          {sender.loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
        </button>

        {hasDetails && (
          <button
            className="text-muted-foreground hover:text-foreground mt-0.5 shrink-0 cursor-pointer"
            aria-label={t.specViewerOpenButton}
            onClick={(e) => {
              e.stopPropagation();
              setSpecOpen((v) => !v);
            }}
          >
            {specOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
        )}
      </div>

      {hasDetails && specOpen && <EndpointSpecPanel endpoint={endpoint} />}
    </div>
  );
}
