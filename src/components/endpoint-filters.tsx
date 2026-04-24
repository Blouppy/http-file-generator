"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { MethodBadge } from "@/components/method-badge";
import { MultiSelectCombobox } from "@/components/multi-select-combobox";
import { useLanguage } from "@/contexts/language-context";

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
  const { t } = useLanguage();
  const hasActiveFilters =
    searchText.trim() !== "" || selectedMethods.size > 0 || selectedTags.size > 0;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          type="search"
          placeholder={t.filterSearchPlaceholder}
          value={searchText}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {availableTags.length > 0 && (
          <MultiSelectCombobox
            label={t.filterApiLabel}
            placeholder={t.filterPlaceholderAll}
            searchPlaceholder={t.filterApiSearchPlaceholder}
            options={availableTags.map((tag) => ({
              value: tag,
              label: <span className="text-sm">{tag}</span>,
            }))}
            selected={selectedTags}
            onToggle={onTagToggle}
          />
        )}

        {availableMethods.length > 0 && (
          <MultiSelectCombobox
            label={t.filterMethodLabel}
            placeholder={t.filterPlaceholderAll}
            searchPlaceholder={t.filterMethodSearchPlaceholder}
            options={availableMethods.map((method) => ({
              value: method,
              label: <MethodBadge method={method} />,
            }))}
            selected={selectedMethods}
            onToggle={onMethodToggle}
          />
        )}

        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="text-muted-foreground hover:text-foreground ml-1 flex items-center gap-1 text-xs transition-colors"
          >
            <X className="h-3 w-3" />
            {t.filterClearFilters}
          </button>
        )}
      </div>
    </div>
  );
}
