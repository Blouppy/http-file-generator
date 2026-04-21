"use client";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { EndpointItem } from "@/components/endpoint-item";
import { getEndpointId } from "@/services/openapi.service";
import { useLanguage } from "@/contexts/language-context";
import type { ParsedEndpoint } from "@/types/openapi";

interface EndpointGroupProps {
  tag: string;
  endpoints: ParsedEndpoint[];
  selectedIds: Set<string>;
  onToggleEndpoint: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  isFirst?: boolean;
  /** Called with the endpoint whose row was clicked (to open the preview panel). */
  onPreview: (endpoint: ParsedEndpoint) => void;
  /** The id of the endpoint currently shown in the preview panel, or null. */
  previewEndpointId: string | null;
}

export function EndpointGroup({
  tag,
  endpoints,
  selectedIds,
  onToggleEndpoint,
  onSelectAll,
  onDeselectAll,
  isFirst = false,
  onPreview,
  previewEndpointId,
}: EndpointGroupProps) {
  const { t } = useLanguage();
  const selectedCount = endpoints.filter((e) => selectedIds.has(getEndpointId(e))).length;

  return (
    <div>
      {!isFirst && <Separator />}
      <div className="px-6 py-3 bg-muted/50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{tag}</span>
          <Badge variant="secondary" className="text-xs">
            {selectedCount}/{endpoints.length}
          </Badge>
          <div className="ml-auto flex gap-2">
            <button
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={onSelectAll}
            >
              {t.groupAll}
            </button>
            <button
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={onDeselectAll}
            >
              {t.groupNone}
            </button>
          </div>
        </div>
      </div>
      <div className="divide-y">
        {endpoints.map((endpoint) => {
          const id = getEndpointId(endpoint);
          return (
            <EndpointItem
              key={id}
              endpoint={endpoint}
              isSelected={selectedIds.has(id)}
              isActive={previewEndpointId === id}
              onToggle={() => onToggleEndpoint(id)}
              onPreview={() => onPreview(endpoint)}
            />
          );
        })}
      </div>
    </div>
  );
}
