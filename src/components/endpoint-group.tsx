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
}

export function EndpointGroup({
  tag,
  endpoints,
  selectedIds,
  onToggleEndpoint,
  onSelectAll,
  onDeselectAll,
  isFirst = false,
}: EndpointGroupProps) {
  const { t } = useLanguage();
  const selectedCount = endpoints.filter((e) => selectedIds.has(getEndpointId(e))).length;

  return (
    <div>
      {!isFirst && <Separator />}
      <div className="bg-muted top-0 z-10 px-6 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{tag}</span>
          <Badge variant="secondary" className="text-xs">
            {selectedCount}/{endpoints.length}
          </Badge>
          <div className="ml-auto flex gap-2">
            <button
              className="text-muted-foreground hover:text-foreground text-xs transition-colors"
              onClick={onSelectAll}
            >
              {t.groupAll}
            </button>
            <button
              className="text-muted-foreground hover:text-foreground text-xs transition-colors"
              onClick={onDeselectAll}
            >
              {t.groupNone}
            </button>
          </div>
        </div>
      </div>
      <div>
        {endpoints.map((endpoint) => {
          const id = getEndpointId(endpoint);
          return (
            <EndpointItem
              key={id}
              endpoint={endpoint}
              isSelected={selectedIds.has(id)}
              onToggle={() => onToggleEndpoint(id)}
            />
          );
        })}
      </div>
    </div>
  );
}
