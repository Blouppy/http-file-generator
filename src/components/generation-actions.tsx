"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { buildZipFromEndpoints, slugify } from "@/services/http-file.service";
import { saveAs } from "file-saver";
import { useLanguage } from "@/contexts/language-context";
import type { ParsedSpec, ParsedEndpoint } from "@/types/openapi";

interface GenerationActionsProps {
  spec: ParsedSpec;
  selectedEndpoints: ParsedEndpoint[];
}

export function GenerationActions({ spec, selectedEndpoints }: GenerationActionsProps) {
  const { t } = useLanguage();

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
                ? t.noEndpoints
                : t.readyGenerate(selectedEndpoints.length)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t.downloadZipDesc}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={downloadZip} disabled={selectedEndpoints.length === 0}>
              {t.download}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
