"use client";

import { useState, useCallback } from "react";
import { AlertCircle, Globe } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/language-context";

interface UrlUploadFormProps {
  onUrl: (url: string) => void;
  isLoading?: boolean;
  error?: string | null;
  onClear?: () => void;
}

export function UrlUploadForm({
  onUrl,
  isLoading = false,
  error = null,
  onClear,
}: UrlUploadFormProps) {
  const [url, setUrl] = useState("");
  const { t } = useLanguage();

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onUrl(url.trim());
    },
    [url, onUrl],
  );

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Globe className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                type="text"
                placeholder={t.urlInputPlaceholder}
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  onClear?.();
                }}
                className="pl-9"
                disabled={isLoading}
                aria-label={t.urlInputPlaceholder}
              />
            </div>
            <Button type="submit" disabled={isLoading || !url.trim()}>
              {isLoading ? t.urlInputLoading : t.urlInputButton}
            </Button>
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!error && <p className="text-muted-foreground text-sm">{t.urlInputDescription}</p>}
        </form>
      </CardContent>
    </Card>
  );
}
