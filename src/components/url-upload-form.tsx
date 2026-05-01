"use client";

import { useState, useCallback } from "react";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/language-context";
import {
  parseSpecFromUrl,
  URL_VALIDATION_ERROR,
  URL_FETCH_ERROR,
} from "@/services/openapi.service";
import type { ParsedSpec } from "@/types/openapi";

interface UrlUploadFormProps {
  onSpec: (spec: ParsedSpec) => void;
}

export function UrlUploadForm({ onSpec }: UrlUploadFormProps) {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useLanguage();

  const getErrorMessage = useCallback(
    (err: unknown): string => {
      if (err instanceof Error) {
        if (err.message === URL_VALIDATION_ERROR) {
          return t.urlInputInvalidUrl;
        }

        if (err.message === URL_FETCH_ERROR) {
          return t.urlInputFetchError;
        }

        return err.message;
      }

      return t.dropzoneParseError;
    },
    [t],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setIsLoading(true);

      try {
        const parsed = await parseSpecFromUrl(url);
        onSpec(parsed);
      } catch (err) {
        setError(getErrorMessage(err));
        setIsLoading(false);
      }
    },
    [url, onSpec, getErrorMessage],
  );

  const handleClear = useCallback(() => {
    setError(null);
    setUrl("");
  }, []);

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive text-sm">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={handleClear}>
            {t.dropzoneTryAgain}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Globe className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                type="url"
                placeholder={t.urlInputPlaceholder}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="pl-9"
                disabled={isLoading}
                aria-label={t.urlInputPlaceholder}
              />
            </div>
            <Button type="submit" disabled={isLoading || !url.trim()}>
              {isLoading ? t.urlInputLoading : t.urlInputButton}
            </Button>
          </div>
          <p className="text-muted-foreground text-sm">{t.urlInputDescription}</p>
        </form>
      </CardContent>
    </Card>
  );
}
