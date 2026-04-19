import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { MethodBadge } from "@/components/method-badge";
import { cn } from "@/lib/utils";

interface EndpointFiltersProps {
  searchText: string;
  onSearchChange: (value: string) => void;
  availableMethods: string[];
  selectedMethods: Set<string>;
  onMethodToggle: (method: string) => void;
  availableTags: string[];
  selectedTags: Set<string>;
  onTagToggle: (tag: string) => void;
  onClearFilters: () => void;
}

export function EndpointFilters({
  searchText,
  onSearchChange,
  availableMethods,
  selectedMethods,
  onMethodToggle,
  availableTags,
  selectedTags,
  onTagToggle,
  onClearFilters,
}: EndpointFiltersProps) {
  const hasActiveFilters =
    searchText.trim() !== "" || selectedMethods.size > 0 || selectedTags.size > 0;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          type="search"
          placeholder="Search endpoints by path, summary…"
          value={searchText}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex flex-wrap gap-6">
        {availableMethods.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Method
            </p>
            <div className="flex flex-wrap gap-2">
              {availableMethods.map((method) => (
                <label
                  key={method}
                  className={cn(
                    "flex items-center gap-1.5 cursor-pointer rounded px-2 py-1 transition-colors",
                    selectedMethods.has(method)
                      ? "bg-muted"
                      : "hover:bg-muted/50"
                  )}
                >
                  <Checkbox
                    checked={selectedMethods.has(method)}
                    onCheckedChange={() => onMethodToggle(method)}
                  />
                  <MethodBadge method={method} />
                </label>
              ))}
            </div>
          </div>
        )}

        {availableTags.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              API
            </p>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => (
                <label
                  key={tag}
                  className={cn(
                    "flex items-center gap-1.5 cursor-pointer rounded px-2 py-1 text-sm transition-colors",
                    selectedTags.has(tag) ? "bg-muted" : "hover:bg-muted/50"
                  )}
                >
                  <Checkbox
                    checked={selectedTags.has(tag)}
                    onCheckedChange={() => onTagToggle(tag)}
                  />
                  <span>{tag}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {hasActiveFilters && (
        <button
          onClick={onClearFilters}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-3 w-3" />
          Clear filters
        </button>
      )}
    </div>
  );
}
