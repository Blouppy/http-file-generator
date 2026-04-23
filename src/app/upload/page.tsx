"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUploadZone } from "@/components/file-upload-zone";
import { useSpec } from "@/contexts/spec-context";
import { useLanguage } from "@/contexts/language-context";
import { parseSpec } from "@/services/openapi.service";

function StepIndicator({ current }: { current: number }) {
  const { t } = useLanguage();
  const steps = [t.stepUpload, t.stepSelect, t.stepGenerate];
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
    [setSpec, router, parseErrorMsg]
  );

  return (
    <div className="h-[calc(100vh-3.75rem)] overflow-y-auto bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <StepIndicator current={1} />
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">{t.uploadTitle}</h1>
          <p className="text-muted-foreground">
            {t.uploadDescription}
          </p>
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
