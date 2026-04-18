"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { parseOpenAPISpec } from "@/lib/parse-openapi";
import { generateHttpFileContent } from "@/lib/generate-http";
import type { ParsedSpec, ParsedEndpoint } from "@/types/openapi";
import JSZip from "jszip";
import { saveAs } from "file-saver";

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-blue-100 text-blue-800 border-blue-200",
  POST: "bg-green-100 text-green-800 border-green-200",
  PUT: "bg-yellow-100 text-yellow-800 border-yellow-200",
  PATCH: "bg-orange-100 text-orange-800 border-orange-200",
  DELETE: "bg-red-100 text-red-800 border-red-200",
  HEAD: "bg-purple-100 text-purple-800 border-purple-200",
  OPTIONS: "bg-gray-100 text-gray-800 border-gray-200",
};

export default function Home() {
  const [spec, setSpec] = useState<ParsedSpec | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getEndpointId = (e: ParsedEndpoint) => `${e.method}:${e.path}`;

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setIsLoading(true);
    try {
      const content = await file.text();
      const parsed = await parseOpenAPISpec(content, file.name);
      setSpec(parsed);
      const allIds = new Set(parsed.endpoints.map(getEndpointId));
      setSelectedIds(allIds);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse OpenAPI spec");
      setSpec(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

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

  const downloadSingle = () => {
    if (!spec || selectedEndpoints.length === 0) return;
    const content = generateHttpFileContent(spec, selectedEndpoints);
    const blob = new Blob([content], { type: "text/plain" });
    saveAs(blob, `${spec.title.replace(/\s+/g, "-").toLowerCase()}.http`);
  };

  const downloadZip = async () => {
    if (!spec || selectedEndpoints.length === 0) return;
    const zip = new JSZip();

    const byTag: Record<string, ParsedEndpoint[]> = {};
    for (const endpoint of selectedEndpoints) {
      const tag = endpoint.tags?.[0] || "untagged";
      if (!byTag[tag]) byTag[tag] = [];
      byTag[tag].push(endpoint);
    }

    for (const [tag, endpoints] of Object.entries(byTag)) {
      const content = generateHttpFileContent(spec, endpoints);
      zip.file(`${tag.replace(/\s+/g, "-").toLowerCase()}.http`, content);
    }

    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, `${spec.title.replace(/\s+/g, "-").toLowerCase()}.zip`);
  };

  const endpointsByTag: Record<string, ParsedEndpoint[]> = {};
  if (spec) {
    for (const endpoint of spec.endpoints) {
      const tag = endpoint.tags?.[0] || "Other";
      if (!endpointsByTag[tag]) endpointsByTag[tag] = [];
      endpointsByTag[tag].push(endpoint);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-2">HTTP File Generator</h1>
          <p className="text-muted-foreground text-lg">
            Upload an OpenAPI spec and generate .http files for your endpoints
          </p>
        </div>

        {!spec && (
          <Card>
            <CardContent className="p-0">
              <div
                className={`border-2 border-dashed rounded-lg p-16 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-muted-foreground"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg font-medium">
                      {isLoading ? "Parsing..." : "Drop your OpenAPI spec here"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Supports .json, .yaml, and .yml files
                    </p>
                  </div>
                  {!isLoading && (
                    <Button variant="outline" size="sm">
                      Browse files
                    </Button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.yaml,.yml"
                  className="hidden"
                  onChange={handleFileInput}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="mt-4 border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive text-sm">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => {
                  setError(null);
                  setSpec(null);
                }}
              >
                Try again
              </Button>
            </CardContent>
          </Card>
        )}

        {spec && (
          <div className="space-y-6">
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSpec(null);
                      setSelectedIds(new Set());
                      setError(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    Upload new file
                  </Button>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground">
                    {spec.endpoints.length} endpoints &bull; {selectedEndpoints.length} selected
                  </span>
                  <div className="ml-auto flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={selectAll}>
                      Select All
                    </Button>
                    <Button variant="outline" size="sm" onClick={deselectAll}>
                      Deselect All
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Endpoints</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {Object.entries(endpointsByTag).map(([tag, endpoints], tagIdx) => (
                  <div key={tag}>
                    {tagIdx > 0 && <Separator />}
                    <div className="px-6 py-3 bg-muted/50">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{tag}</span>
                        <Badge variant="secondary" className="text-xs">
                          {endpoints.filter((e) => selectedIds.has(getEndpointId(e))).length}/
                          {endpoints.length}
                        </Badge>
                        <div className="ml-auto flex gap-2">
                          <button
                            className="text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              setSelectedIds((prev) => {
                                const next = new Set(prev);
                                endpoints.forEach((e) => next.add(getEndpointId(e)));
                                return next;
                              });
                            }}
                          >
                            All
                          </button>
                          <button
                            className="text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              setSelectedIds((prev) => {
                                const next = new Set(prev);
                                endpoints.forEach((e) => next.delete(getEndpointId(e)));
                                return next;
                              });
                            }}
                          >
                            None
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="divide-y">
                      {endpoints.map((endpoint) => {
                        const id = getEndpointId(endpoint);
                        const isSelected = selectedIds.has(id);
                        return (
                          <div
                            key={id}
                            className={`flex items-start gap-3 px-6 py-3 cursor-pointer hover:bg-muted/30 transition-colors ${
                              isSelected ? "bg-muted/20" : ""
                            }`}
                            onClick={() => toggleEndpoint(id)}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleEndpoint(id)}
                              className="mt-0.5"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border shrink-0 ${
                                  METHOD_COLORS[endpoint.method] || "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {endpoint.method}
                              </span>
                              <div className="min-w-0">
                                <code className="text-sm font-mono break-all">{endpoint.path}</code>
                                {endpoint.summary && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {endpoint.summary}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {selectedEndpoints.length === 0
                        ? "Select endpoints to generate files"
                        : `Ready to generate for ${selectedEndpoints.length} endpoint${selectedEndpoints.length !== 1 ? "s" : ""}`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Single .http file or ZIP archive grouped by tags
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={downloadSingle}
                      disabled={selectedEndpoints.length === 0}
                    >
                      Download .http File
                    </Button>
                    <Button
                      variant="outline"
                      onClick={downloadZip}
                      disabled={selectedEndpoints.length === 0}
                    >
                      Download as ZIP
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
