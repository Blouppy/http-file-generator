"use client";

import { createContext, use, useState } from "react";
import type { ParsedSpec, ParsedEndpoint } from "@/types/openapi";
import { getEndpointId } from "@/services/openapi.service";

interface SpecContextValue {
  spec: ParsedSpec | null;
  setSpec: (spec: ParsedSpec | null) => void;
  selectedIds: Set<string>;
  setSelectedIds: (ids: Set<string>) => void;
  toggleEndpoint: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  selectedEndpoints: ParsedEndpoint[];
}

const SpecContext = createContext<SpecContextValue | null>(null);

export function SpecProvider({ children }: { children: React.ReactNode }) {
  const [spec, setSpecState] = useState<ParsedSpec | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const setSpec = (newSpec: ParsedSpec | null) => {
    setSpecState(newSpec);
    if (newSpec) {
      setSelectedIds(new Set(newSpec.endpoints.map(getEndpointId)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleEndpoint = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (!spec) return;
    setSelectedIds(new Set(spec.endpoints.map(getEndpointId)));
  };

  const deselectAll = () => setSelectedIds(new Set());

  const selectedEndpoints = spec?.endpoints.filter((e) => selectedIds.has(getEndpointId(e))) ?? [];

  return (
    <SpecContext value={{ spec, setSpec, selectedIds, setSelectedIds, toggleEndpoint, selectAll, deselectAll, selectedEndpoints }}>
      {children}
    </SpecContext>
  );
}

export function useSpec(): SpecContextValue {
  const ctx = use(SpecContext);
  if (!ctx) throw new Error("useSpec must be used within a SpecProvider");
  return ctx;
}
