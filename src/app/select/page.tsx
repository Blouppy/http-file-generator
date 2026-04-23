"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EndpointGroup } from "@/components/endpoint-group";
import { EndpointFilters } from "@/components/endpoint-filters";
import { HttpPreview } from "@/components/http-preview";
import { useSpec } from "@/contexts/spec-context";
import { useLanguage } from "@/contexts/language-context";
import { groupEndpointsByTag, getEndpointId, filterEndpoints } from "@/services/openapi.service";
import { buildZipFromEndpoints, slugify } from "@/services/http-file.service";
import { saveAs } from "file-saver";
import type { ParsedEndpoint } from "@/types/openapi";

export default function SelectPage() {
  const router = useRouter();
  const { spec, setSpec, selectedIds, setSelectedIds, toggleEndpoint, selectAll, deselectAll, selectedEndpoints } =
    useSpec();
  const { t } = useLanguage();

  const [searchText, setSearchText] = useState("");
  const [selectedMethods, setSelectedMethods] = useState<Set<string>>(new Set());
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  // Track selection order so the preview shows endpoints in the order they were checked.
  const [selectionOrder, setSelectionOrder] = useState<string[]>([]);

  useEffect(() => {
    if (!spec) {
      router.replace("/upload");
      return;
    }
    // Initialise selection order to match the spec's initial "all selected" state.
    setSelectionOrder(spec.endpoints.map(getEndpointId));
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

  // Ordered list of selected endpoints for the preview panel.
  const orderedPreviewEndpoints = useMemo(() => {
    if (!spec) return [];
    const endpointMap = new Map(spec.endpoints.map((e) => [getEndpointId(e), e]));
    return selectionOrder
      .map((id) => endpointMap.get(id))
      .filter((e): e is ParsedEndpoint => e !== undefined);
  }, [spec, selectionOrder]);

  if (!spec) return null;

  // --- handlers ---

  const handleToggle = (id: string) => {
    const isCurrentlySelected = selectedIds.has(id);
    toggleEndpoint(id);
    setSelectionOrder((prev) =>
      isCurrentlySelected ? prev.filter((eid) => eid !== id) : [...prev, id]
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
    if (selectedEndpoints.length === 0) return;
    const blob = await buildZipFromEndpoints(spec, selectedEndpoints);
    saveAs(blob, `${slugify(spec.title)}.zip`);
  };

  return (
    <div className="h-[calc(100vh-3.75rem)] overflow-hidden flex flex-col bg-background">
      <div className="max-w-7xl mx-auto w-full px-4 py-4 flex flex-col gap-4 h-full overflow-hidden">

        {/* Compact header: spec info + download action at the top */}
        <div className="shrink-0 flex items-start justify-between gap-4 bg-card border rounded-lg px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold truncate">{spec.title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t.specVersion} {spec.version} &bull; {t.specBaseUrl}:{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">{spec.baseUrl}</code>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t.specEndpointCount(spec.endpoints.length)} &bull;{" "}
              {t.specSelectedCount(selectedEndpoints.length)}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="sm" onClick={handleReset}>
              {t.specUploadNew}
            </Button>
            <Button
              size="sm"
              onClick={handleDownloadZip}
              disabled={selectedEndpoints.length === 0}
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              {t.download}
            </Button>
          </div>
        </div>

        {/* Two-column grid — fills remaining viewport height, no body scroll */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">

          {/* Left panel — endpoint tree with filters */}
          <Card className="flex flex-col overflow-hidden">
            <CardHeader className="pb-3 flex-row items-center justify-between space-y-0 shrink-0 gap-2">
              <CardTitle className="text-base">{t.endpointsTitle}</CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 px-2"
                  onClick={handleGlobalSelectAll}
                >
                  {t.specSelectAll}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 px-2"
                  onClick={handleGlobalDeselectAll}
                >
                  {t.specDeselectAll}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex flex-col overflow-hidden flex-1">
              <div className="px-6 py-4 border-b shrink-0">
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
              <div className="overflow-y-auto flex-1 scroll-smooth">
                {Object.keys(filteredEndpointsByTag).length === 0 ? (
                  <p className="px-6 py-8 text-center text-sm text-muted-foreground">
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
