import { Checkbox } from "@/components/ui/checkbox";
import { MethodBadge } from "@/components/method-badge";
import { cn } from "@/lib/utils";
import type { ParsedEndpoint } from "@/types/openapi";

interface EndpointItemProps {
  endpoint: ParsedEndpoint;
  isSelected: boolean;
  /** Whether this endpoint is currently shown in the preview panel. */
  isActive?: boolean;
  onToggle: () => void;
  /** Called when the row (excluding the checkbox) is clicked to open the preview. */
  onPreview: () => void;
}

export function EndpointItem({
  endpoint,
  isSelected,
  isActive = false,
  onToggle,
  onPreview,
}: EndpointItemProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 px-6 py-3 cursor-pointer hover:bg-muted/30 transition-colors border-l-2",
        isActive ? "bg-primary/10 border-primary border-t-0" : "border-transparent",
        isSelected && !isActive ? "bg-muted/20" : ""
      )}
      onClick={onPreview}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={onToggle}
        className="mt-0.5 shrink-0"
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
