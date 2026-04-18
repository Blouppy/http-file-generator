import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ParsedSpec } from "@/types/openapi";

interface SpecInfoProps {
  spec: ParsedSpec;
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onReset?: () => void;
}

export function SpecInfo({
  spec,
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onReset,
}: SpecInfoProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl">{spec.title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Version {spec.version} &bull; Base URL:{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">{spec.baseUrl}</code>
            </p>
          </div>
          {onReset && (
            <Button variant="ghost" size="sm" onClick={onReset}>
              Upload new file
            </Button>
          )}
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">
            {totalCount} endpoints &bull; {selectedCount} selected
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onSelectAll}>
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={onDeselectAll}>
              Deselect All
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
