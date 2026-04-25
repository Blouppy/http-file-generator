"use client";

import { useRef, useState, useCallback } from "react";
import { CloudUpload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/language-context";

interface FileUploadZoneProps {
  onFile: (file: File) => void;
  isLoading?: boolean;
  error?: string | null;
  onClear?: () => void;
}

export function FileUploadZone({
  onFile,
  isLoading = false,
  error = null,
  onClear,
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();

      setIsDragging(false);

      const file = e.dataTransfer.files[0];

      if (file) {
        onFile(file);
      }
    },
    [onFile],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];

      if (file) {
        onFile(file);
      }
    },
    [onFile],
  );

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive text-sm">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={onClear}>
            {t.dropzoneTryAgain}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div
          className={`cursor-pointer rounded-lg border-2 border-dashed p-16 text-center transition-colors ${
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
            <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-full">
              <CloudUpload className="text-muted-foreground h-8 w-8" />
            </div>
            <div>
              <p className="text-lg font-medium">{isLoading ? t.dropzoneParsing : t.dropzone}</p>
              <p className="text-muted-foreground mt-1 text-sm">{t.dropzoneFormats}</p>
            </div>
            {!isLoading && (
              <Button variant="outline" size="sm">
                {t.dropzoneBrowse}
              </Button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.yaml,.yml"
            className="hidden"
            onChange={handleFileInput}
            onClick={(e) => {
              (e.target as HTMLInputElement).value = "";
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
