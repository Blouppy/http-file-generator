import { Checkbox } from "@/components/ui/checkbox";
import { MethodBadge } from "@/components/method-badge";
import type { ParsedEndpoint } from "@/types/openapi";

interface EndpointItemProps {
  endpoint: ParsedEndpoint;
  isSelected: boolean;
  onToggle: () => void;
}

export function EndpointItem({ endpoint, isSelected, onToggle }: EndpointItemProps) {
  return (
    <div
      className={`flex items-start gap-3 px-6 py-3 cursor-pointer hover:bg-muted/30 transition-colors ${
        isSelected ? "bg-muted/20" : ""
      }`}
      onClick={onToggle}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={onToggle}
        className="mt-0.5"
        onClick={(e) => e.stopPropagation()}
      />
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <MethodBadge method={endpoint.method} />
        <div className="min-w-0">
          <code className="text-sm font-mono break-all">{endpoint.path}</code>
          {endpoint.summary && (
            <p className="text-xs text-muted-foreground mt-0.5">{endpoint.summary}</p>
          )}
        </div>
      </div>
    </div>
  );
}
