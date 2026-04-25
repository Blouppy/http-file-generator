"use client";

import { useState, useMemo } from "react";
import { filterEndpoints, groupEndpointsByTag } from "@/services/openapi.service";
import type { ParsedEndpoint } from "@/types/openapi";

interface UseEndpointFiltersResult {
  searchText: string;
  setSearchText: (value: string) => void;
  selectedMethods: Set<string>;
  selectedTags: Set<string>;
  availableMethods: string[];
  availableTags: string[];
  filteredEndpointsByTag: Record<string, ParsedEndpoint[]>;
  handleMethodToggle: (method: string) => void;
  handleTagToggle: (tag: string) => void;
  handleClearFilters: () => void;
  hasActiveFilters: boolean;
}

/**
 * Encapsulates all filter state and derived data for the endpoint selection panel.
 * Returns filter state, available options, filtered results, and event handlers.
 */
export function useEndpointFilters(endpoints: ParsedEndpoint[]): UseEndpointFiltersResult {
  const [searchText, setSearchText] = useState("");
  const [selectedMethods, setSelectedMethods] = useState<Set<string>>(new Set());
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  const availableMethods = useMemo(
    () => Array.from(new Set(endpoints.map((e) => e.method))).sort(),
    [endpoints],
  );

  const availableTags = useMemo(
    () => Array.from(new Set(endpoints.map((e) => e.tags?.[0] || "Other"))).sort(),
    [endpoints],
  );

  const filteredEndpoints = useMemo(
    () => filterEndpoints(endpoints, { searchText, methods: selectedMethods, tags: selectedTags }),
    [endpoints, searchText, selectedMethods, selectedTags],
  );

  const filteredEndpointsByTag = useMemo(
    () => groupEndpointsByTag(filteredEndpoints),
    [filteredEndpoints],
  );

  const handleMethodToggle = (method: string) => {
    setSelectedMethods((prev) => {
      const next = new Set(prev);

      if (next.has(method)) {
        next.delete(method);
      } else {
        next.add(method);
      }

      return next;
    });
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);

      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }

      return next;
    });
  };

  const handleClearFilters = () => {
    setSearchText("");
    setSelectedMethods(new Set());
    setSelectedTags(new Set());
  };

  const hasActiveFilters =
    searchText.trim() !== "" || selectedMethods.size > 0 || selectedTags.size > 0;

  return {
    searchText,
    setSearchText,
    selectedMethods,
    selectedTags,
    availableMethods,
    availableTags,
    filteredEndpointsByTag,
    handleMethodToggle,
    handleTagToggle,
    handleClearFilters,
    hasActiveFilters,
  };
}
