"use client";

import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface FileUploadZoneProps {
  onFile: (file: File) => void;
  isLoading?: boolean;
  error?: string | null;
  onClear?: () => void;
}

export function FileUploadZone({ onFile, isLoading = false, error = null, onClear }: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) onFile(file);
    },
    [onFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFile(file);
    },
    [onFile]
  );

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive text-sm">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={onClear}
          >
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
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
            onClick={(e) => {
              (e.target as HTMLInputElement).value = "";
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
