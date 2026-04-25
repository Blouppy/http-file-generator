"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUploadZone } from "@/components/file-upload-zone";
import { useSpec } from "@/contexts/spec-context";
import { useLanguage } from "@/contexts/language-context";
import { parseSpec } from "@/services/openapi.service";

export default function UploadPage() {
  const router = useRouter();
  const { setSpec } = useSpec();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const parseErrorMsg = t.dropzoneParseError;

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setIsLoading(true);

      try {
        const content = await file.text();
        const parsed = await parseSpec(content, file.name);

        setSpec(parsed);

        router.push("/select");
      } catch (err) {
        setError(err instanceof Error ? err.message : parseErrorMsg);
        setIsLoading(false);
      }
    },
    [setSpec, router, parseErrorMsg],
  );

  return (
    <div className="bg-background h-[calc(100vh-3.75rem)] overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold tracking-tight">{t.uploadTitle}</h1>
          <p className="text-muted-foreground">{t.uploadDescription}</p>
        </div>
        <FileUploadZone
          onFile={handleFile}
          isLoading={isLoading}
          error={error}
          onClear={() => setError(null)}
        />
      </div>
    </div>
  );
}
