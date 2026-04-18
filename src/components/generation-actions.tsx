"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { generateForEndpoints, buildZipFromEndpoints, slugify } from "@/services/http-file.service";
import { saveAs } from "file-saver";
import type { ParsedSpec, ParsedEndpoint } from "@/types/openapi";

interface GenerationActionsProps {
  spec: ParsedSpec;
  selectedEndpoints: ParsedEndpoint[];
}

export function GenerationActions({ spec, selectedEndpoints }: GenerationActionsProps) {
  const downloadSingle = () => {
    if (selectedEndpoints.length === 0) return;
    const content = generateForEndpoints(spec, selectedEndpoints);
    const blob = new Blob([content], { type: "text/plain" });
    saveAs(blob, `${slugify(spec.title)}.http`);
  };

  const downloadZip = async () => {
    if (selectedEndpoints.length === 0) return;
    const blob = await buildZipFromEndpoints(spec, selectedEndpoints);
    saveAs(blob, `${slugify(spec.title)}.zip`);
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex-1">
            <p className="text-sm font-medium">
              {selectedEndpoints.length === 0
                ? "No endpoints selected"
                : `Ready to generate for ${selectedEndpoints.length} endpoint${selectedEndpoints.length !== 1 ? "s" : ""}`}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Single .http file or ZIP archive grouped by tags
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={downloadSingle} disabled={selectedEndpoints.length === 0}>
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
  );
}
