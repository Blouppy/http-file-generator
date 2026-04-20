"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SpecInfo } from "@/components/spec-info";
import { EndpointGroup } from "@/components/endpoint-group";
import { EndpointFilters } from "@/components/endpoint-filters";
import { GenerationActions } from "@/components/generation-actions";
import { useSpec } from "@/contexts/spec-context";
import { groupEndpointsByTag, getEndpointId, filterEndpoints } from "@/services/openapi.service";
import type { ParsedEndpoint } from "@/types/openapi";

function StepIndicator({ current }: { current: number }) {
  const steps = ["1. Upload", "2. Select"];
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center gap-2">
          <span
            className={`text-sm font-medium ${
              i + 1 === current ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            {step}
          </span>
          {i < steps.length - 1 && (
            <span className="text-muted-foreground text-sm">→</span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function SelectPage() {
  const router = useRouter();
  const { spec, setSpec, selectedIds, setSelectedIds, toggleEndpoint, selectAll, deselectAll, selectedEndpoints } =
    useSpec();

  const [searchText, setSearchText] = useState("");
  const [selectedMethods, setSelectedMethods] = useState<Set<string>>(new Set());
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!spec) router.replace("/upload");
  }, [spec, router]);

  const availableMethods = useMemo(
    () => Array.from(new Set((spec?.endpoints ?? []).map((e) => e.method))).sort(),
    [spec]
  );

  const availableTags = useMemo(
    () => Array.from(new Set((spec?.endpoints ?? []).map((e) => e.tags?.[0] || "Other"))).sort(),
    [spec]
  );

  const filteredEndpoints = useMemo(
    () =>
      filterEndpoints(spec?.endpoints ?? [], {
        searchText,
        methods: selectedMethods,
        tags: selectedTags,
      }),
    [spec, searchText, selectedMethods, selectedTags]
  );

  const filteredEndpointsByTag = useMemo(
    () => groupEndpointsByTag(filteredEndpoints),
    [filteredEndpoints]
  );

  if (!spec) return null;

  const handleMethodToggle = (method: string) => {
    setSelectedMethods((prev) => {
      const next = new Set(prev);
      if (next.has(method)) next.delete(method);
      else next.add(method);
      return next;
    });
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const handleClearFilters = () => {
    setSearchText("");
    setSelectedMethods(new Set());
    setSelectedTags(new Set());
  };

  const handleSelectAllInTag = (tagEndpoints: ParsedEndpoint[]) => {
    const next = new Set(selectedIds);
    tagEndpoints.forEach((e) => next.add(getEndpointId(e)));
    setSelectedIds(next);
  };

  const handleDeselectAllInTag = (tagEndpoints: ParsedEndpoint[]) => {
    const next = new Set(selectedIds);
    tagEndpoints.forEach((e) => next.delete(getEndpointId(e)));
    setSelectedIds(next);
  };

  const handleReset = () => {
    setSpec(null);
    router.push("/upload");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <StepIndicator current={2} />

        <div className="space-y-6">
          <SpecInfo
            spec={spec}
            selectedCount={selectedEndpoints.length}
            totalCount={spec.endpoints.length}
            onSelectAll={selectAll}
            onDeselectAll={deselectAll}
            onReset={handleReset}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Endpoints</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="px-6 py-4 border-b">
                <EndpointFilters
                  searchText={searchText}
                  onSearchChange={setSearchText}
                  availableMethods={availableMethods}
                  selectedMethods={selectedMethods}
                  onMethodToggle={handleMethodToggle}
                  availableTags={availableTags}
                  selectedTags={selectedTags}
                  onTagToggle={handleTagToggle}
                  onClearFilters={handleClearFilters}
                />
              </div>
              {Object.keys(filteredEndpointsByTag).length === 0 ? (
                <p className="px-6 py-8 text-center text-sm text-muted-foreground">
                  No endpoints match your filters.
                </p>
              ) : (
                Object.entries(filteredEndpointsByTag).map(([tag, endpoints], idx) => (
                  <EndpointGroup
                    key={tag}
                    tag={tag}
                    endpoints={endpoints}
                    selectedIds={selectedIds}
                    onToggleEndpoint={toggleEndpoint}
                    onSelectAll={() => handleSelectAllInTag(endpoints)}
                    onDeselectAll={() => handleDeselectAllInTag(endpoints)}
                    isFirst={idx === 0}
                  />
                ))
              )}
            </CardContent>
          </Card>

          <GenerationActions spec={spec} selectedEndpoints={selectedEndpoints} />

        </div>
      </div>
    </div>
  );
}
