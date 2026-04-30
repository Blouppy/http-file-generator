import { Checkbox } from "@/components/ui/checkbox";
import { MethodBadge } from "@/components/method-badge";
import { cn } from "@/lib/utils";
import type { ParsedEndpoint } from "@/types/openapi";

interface EndpointItemProps {
  endpoint: ParsedEndpoint;
  isSelected: boolean;
  onToggle: () => void;
}

export function EndpointItem({ endpoint, isSelected, onToggle }: EndpointItemProps) {
  return (
    <div
      className={cn(
        "hover:bg-muted/30 flex cursor-pointer items-start gap-3 border-l-2 px-6 py-3 transition-colors",
        isSelected ? "bg-primary/10 border-primary" : "border-transparent",
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
    </div>
  );
}
