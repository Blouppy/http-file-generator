import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { MethodBadge } from "@/components/method-badge";
import { MultiSelectCombobox } from "@/components/multi-select-combobox";

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
    <div className="space-y-3">
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

      <div className="flex flex-wrap items-center gap-2">
        {availableMethods.length > 0 && (
          <MultiSelectCombobox
            label="Method"
            placeholder="All"
            searchPlaceholder="Search methods…"
            options={availableMethods.map((method) => ({
              value: method,
              label: <MethodBadge method={method} />,
            }))}
            selected={selectedMethods}
            onToggle={onMethodToggle}
          />
        )}

        {availableTags.length > 0 && (
          <MultiSelectCombobox
            label="API"
            placeholder="All"
            searchPlaceholder="Search APIs…"
            options={availableTags.map((tag) => ({
              value: tag,
              label: <span className="text-sm">{tag}</span>,
            }))}
            selected={selectedTags}
            onToggle={onTagToggle}
          />
        )}

        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors ml-1"
          >
            <X className="h-3 w-3" />
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
