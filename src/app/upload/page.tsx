"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUploadZone } from "@/components/file-upload-zone";
import { useSpec } from "@/contexts/spec-context";
import { parseSpec } from "@/services/openapi.service";

function StepIndicator({ current }: { current: number }) {
  const steps = ["1. Upload", "2. Select", "3. Generate"];
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        setError(err instanceof Error ? err.message : "Failed to parse OpenAPI spec");
        setIsLoading(false);
      }
    },
    [setSpec, router]
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <StepIndicator current={1} />
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Upload your OpenAPI spec</h1>
          <p className="text-muted-foreground">
            Drop or browse to upload a .json, .yaml, or .yml file.
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
