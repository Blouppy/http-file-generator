"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/language-context";

interface MultiSelectComboboxProps {
  label: string;
  options: { value: string; label: React.ReactNode }[];
  selected: Set<string>;
  onToggle: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
}

export function MultiSelectCombobox({
  label,
  options,
  selected,
  onToggle,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
}: MultiSelectComboboxProps) {
  const { t } = useLanguage();
  const [open, setOpen] = React.useState(false);

  const selectedCount = selected.size;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-9 min-w-[140px] justify-between gap-2 font-normal"
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="text-muted-foreground text-sm">{label}:</span>
            {selectedCount === 0 ? (
              <span className="text-sm">{placeholder}</span>
            ) : (
              <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                {t.filterSelected(selectedCount)}
              </Badge>
            )}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{t.filterNoResults}</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem key={opt.value} value={opt.value} onSelect={() => onToggle(opt.value)}>
                  <div
                    className={cn(
                      "border-primary mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
                      selected.has(opt.value) ? "bg-primary text-primary-foreground" : "opacity-50",
                    )}
                  >
                    {selected.has(opt.value) && <Check className="h-3 w-3" />}
                  </div>
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          {selectedCount > 0 && (
            <div className="border-t p-1">
              <button
                className="text-muted-foreground hover:text-foreground hover:bg-accent flex w-full items-center justify-center gap-1 rounded-sm py-1.5 text-xs transition-colors"
                onClick={() => {
                  Array.from(selected).forEach((v) => onToggle(v));
                  setOpen(false);
                }}
              >
                <X className="h-3 w-3" />
                {t.filterClearSelection}
              </button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
