"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EndpointGroup } from "@/components/endpoint-group";
import { EndpointFilters } from "@/components/endpoint-filters";
import { HttpPreview } from "@/components/http-preview";
import { SelectPageHeader } from "@/components/select-page-header";
import { useSpec } from "@/contexts/spec-context";
import { useLanguage } from "@/contexts/language-context";
import { useEndpointFilters } from "@/hooks/use-endpoint-filters";
import { getEndpointId } from "@/services/openapi.service";
import { buildZipFromEndpoints, slugify } from "@/services/http-file.service";
import { saveAs } from "file-saver";
import type { ParsedEndpoint } from "@/types/openapi";

export default function SelectPage() {
  const router = useRouter();
  const {
    spec,
    setSpec,
    selectedIds,
    setSelectedIds,
    toggleEndpoint,
    selectAll,
    deselectAll,
    selectedEndpoints,
  } = useSpec();
  const { t } = useLanguage();

  // Track selection order so the preview shows endpoints in the order they were checked.
  const [selectionOrder, setSelectionOrder] = useState<string[]>([]);

  const {
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
  } = useEndpointFilters(spec?.endpoints ?? []);

  useEffect(() => {
    if (!spec) {
      router.replace("/upload");

      return;
    }
    setSelectionOrder([]);
  }, [spec, router]);

  // Ordered list of selected endpoints for the preview panel.
  const orderedPreviewEndpoints = useMemo(() => {
    if (!spec) {
      return [];
    }

    const endpointMap = new Map(spec.endpoints.map((e) => [getEndpointId(e), e]));

    return selectionOrder
      .map((id) => endpointMap.get(id))
      .filter((e): e is ParsedEndpoint => e !== undefined);
  }, [spec, selectionOrder]);

  if (!spec) {
    return null;
  }

  // --- handlers ---

  const handleToggle = (id: string) => {
    const isCurrentlySelected = selectedIds.has(id);

    toggleEndpoint(id);

    setSelectionOrder((prev) =>
      isCurrentlySelected ? prev.filter((eid) => eid !== id) : [...prev, id],
    );
  };

  const handleGlobalSelectAll = () => {
    selectAll();

    setSelectionOrder(spec.endpoints.map(getEndpointId));
  };

  const handleGlobalDeselectAll = () => {
    deselectAll();

    setSelectionOrder([]);
  };

  const handleSelectAllInTag = (tagEndpoints: ParsedEndpoint[]) => {
    const next = new Set(selectedIds);
    const newIds: string[] = [];

    tagEndpoints.forEach((e) => {
      const id = getEndpointId(e);

      if (!next.has(id)) {
        next.add(id);
        newIds.push(id);
      }
    });

    setSelectedIds(next);

    if (newIds.length > 0) {
      setSelectionOrder((prev) => [...prev, ...newIds]);
    }
  };

  const handleDeselectAllInTag = (tagEndpoints: ParsedEndpoint[]) => {
    const tagIds = new Set(tagEndpoints.map(getEndpointId));
    const next = new Set(selectedIds);

    tagEndpoints.forEach((e) => next.delete(getEndpointId(e)));

    setSelectedIds(next);

    setSelectionOrder((prev) => prev.filter((id) => !tagIds.has(id)));
  };

  const handleReset = () => {
    setSpec(null);

    router.push("/upload");
  };

  const handleDownloadZip = async () => {
    if (selectedEndpoints.length === 0) {
      return;
    }

    const blob = await buildZipFromEndpoints(spec, selectedEndpoints);

    saveAs(blob, `${slugify(spec.title)}.zip`);
  };

  return (
    <div className="bg-background flex h-[calc(100vh-3.75rem)] flex-col overflow-hidden">
      <div className="mx-auto flex h-full w-full max-w-7xl flex-col gap-4 overflow-hidden px-4 py-4">
        <SelectPageHeader
          spec={spec}
          selectedCount={selectedEndpoints.length}
          onReset={handleReset}
          onDownload={handleDownloadZip}
        />

        {/* Two-column grid — fills remaining viewport height, no body scroll */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left panel — endpoint tree with filters */}
          <Card className="flex flex-col overflow-hidden">
            <CardHeader className="shrink-0 flex-row items-center justify-between gap-2 space-y-0 pb-3">
              <CardTitle className="text-base">{t.endpointsTitle}</CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={handleGlobalSelectAll}
                >
                  {t.specSelectAll}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={handleGlobalDeselectAll}
                >
                  {t.specDeselectAll}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col overflow-hidden p-0">
              <div className="shrink-0 border-b px-6 py-4">
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
              <div className="flex-1 overflow-y-auto scroll-smooth">
                {Object.keys(filteredEndpointsByTag).length === 0 ? (
                  <p className="text-muted-foreground px-6 py-8 text-center text-sm">
                    {t.filterNoMatches}
                  </p>
                ) : (
                  Object.entries(filteredEndpointsByTag).map(([tag, endpoints], idx) => (
                    <EndpointGroup
                      key={tag}
                      tag={tag}
                      endpoints={endpoints}
                      selectedIds={selectedIds}
                      onToggleEndpoint={handleToggle}
                      onSelectAll={() => handleSelectAllInTag(endpoints)}
                      onDeselectAll={() => handleDeselectAllInTag(endpoints)}
                      isFirst={idx === 0}
                    />
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Right panel — HTTP preview for all checked endpoints */}
          <HttpPreview spec={spec} endpoints={orderedPreviewEndpoints} />
        </div>
      </div>
    </div>
  );
}
