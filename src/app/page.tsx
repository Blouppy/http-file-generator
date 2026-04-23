"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  FileJson,
  CheckSquare,
  Zap,
  FolderArchive,
  Upload,
  ArrowRight,
  FileCode,
  Layers,
  Search,
  CheckCheck,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/contexts/language-context";
import { cn } from "@/lib/utils";

// ── Browser-frame mockup wrapper ────────────────────────────────────────────
function BrowserMockup({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <div className="rounded-xl overflow-hidden border bg-card shadow-2xl">
      {/* Chrome bar */}
      <div className="flex items-center gap-2 px-4 py-3 bg-muted border-b">
        <div className="flex gap-1.5 shrink-0">
          <div className="size-3 rounded-full bg-destructive/60" />
          <div className="size-3 rounded-full bg-yellow-400/70" />
          <div className="size-3 rounded-full bg-green-500/60" />
        </div>
        <div className="flex-1 bg-background rounded-md px-3 py-1 text-xs text-muted-foreground text-center truncate border">
          {title ?? "http-file-generator.app"}
        </div>
      </div>
      {/* Page content */}
      <div className="bg-background">{children}</div>
    </div>
  );
}

// ── Upload-page mockup ───────────────────────────────────────────────────────
function UploadMockup() {
  return (
    <BrowserMockup title="HTTP File Generator — Upload">
      <div className="p-6 text-sm select-none">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6 text-xs">
          <span className="font-medium text-foreground">1. Upload</span>
          <span className="text-muted-foreground">→</span>
          <span className="text-muted-foreground">2. Select</span>
          <span className="text-muted-foreground">→</span>
          <span className="text-muted-foreground">3. Generate</span>
        </div>
        {/* Heading skeleton */}
        <div className="mb-6">
          <div className="h-4 w-48 bg-foreground/20 rounded mb-2" />
          <div className="h-3 w-64 bg-muted-foreground/25 rounded" />
        </div>
        {/* Drop zone */}
        <div className="border-2 border-dashed border-border rounded-xl p-10 flex flex-col items-center justify-center gap-3 bg-muted/30">
          <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Upload className="size-5 text-primary" />
          </div>
          <div className="text-center space-y-1.5">
            <div className="h-3 w-40 bg-foreground/20 rounded mx-auto" />
            <div className="h-2.5 w-32 bg-muted-foreground/25 rounded mx-auto" />
          </div>
          <div className="px-4 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium mt-1">
            Browse files
          </div>
        </div>
      </div>
    </BrowserMockup>
  );
}

// ── Select-page mockup ───────────────────────────────────────────────────────
const MOCK_ENDPOINTS = [
  { method: "GET", path: "/pets", checked: true },
  { method: "POST", path: "/pets", checked: true },
  { method: "GET", path: "/pets/{id}", checked: false },
  { method: "DELETE", path: "/pets/{id}", checked: false },
] as const;

const METHOD_COLORS: Record<string, string> = {
  GET: "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30",
  POST: "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30",
  PUT: "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30",
  DELETE: "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30",
  PATCH: "text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30",
};

function SelectMockup() {
  return (
    <BrowserMockup title="HTTP File Generator — Select">
      <div className="text-xs select-none">
        {/* Compact header */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-card">
          <div>
            <div className="font-semibold text-[11px]">Petstore API</div>
            <div className="text-muted-foreground text-[10px]">
              v3.0.0 · https://petstore3.swagger.io/api/v3
            </div>
          </div>
          <div className="flex gap-1.5 items-center">
            <div className="px-2 py-1 rounded border text-muted-foreground text-[10px]">
              Upload new
            </div>
            <div className="px-2 py-1 rounded bg-primary text-primary-foreground flex items-center gap-1 text-[10px]">
              <Download className="size-2.5" />
              Download
            </div>
          </div>
        </div>

        {/* Two-column grid */}
        <div className="grid grid-cols-2 divide-x">
          {/* Left: endpoint list */}
          <div className="p-3">
            <div className="font-medium mb-2 text-[11px]">Endpoints</div>
            <div className="bg-muted rounded px-2 py-1 mb-2 flex items-center gap-1 text-muted-foreground">
              <Search className="size-3 shrink-0" />
              <span className="text-[10px]">Search endpoints…</span>
            </div>
            <div className="space-y-1">
              {MOCK_ENDPOINTS.map((ep) => (
                <div
                  key={ep.method + ep.path}
                  className="flex items-center gap-1.5 py-0.5"
                >
                  <div
                    className={cn(
                      "size-3.5 rounded flex items-center justify-center shrink-0",
                      ep.checked
                        ? "bg-primary"
                        : "border border-input bg-background"
                    )}
                  >
                    {ep.checked && (
                      <CheckCheck className="size-2 text-primary-foreground" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "px-1 rounded text-[9px] font-bold font-mono shrink-0",
                      METHOD_COLORS[ep.method]
                    )}
                  >
                    {ep.method}
                  </span>
                  <span className="text-muted-foreground font-mono text-[10px] truncate">
                    {ep.path}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: HTTP preview */}
          <div className="p-3">
            <div className="font-medium mb-2 text-[11px]">HTTP Preview</div>
            <div className="bg-muted rounded p-2 font-mono text-[9px] leading-relaxed">
              <div className="text-muted-foreground">@limit = 10</div>
              <div className="text-muted-foreground">@offset = 0</div>
              <div className="mt-1" />
              <div className="text-blue-500">###</div>
              <div>
                <span className="text-green-600 dark:text-green-400">GET</span>
                <span className="text-muted-foreground">
                  {" "}
                  {`{{baseUrl}}`}/pets
                </span>
              </div>
              <div className="text-muted-foreground">
                Accept: application/json
              </div>
              <div className="mt-1" />
              <div className="text-blue-500">###</div>
              <div>
                <span className="text-green-600 dark:text-green-400">POST</span>
                <span className="text-muted-foreground">
                  {" "}
                  {`{{baseUrl}}`}/pets
                </span>
              </div>
              <div className="text-muted-foreground">
                Content-Type: application/json
              </div>
            </div>
          </div>
        </div>
      </div>
    </BrowserMockup>
  );
}

// ── Home page ────────────────────────────────────────────────────────────────
export default function Home() {
  const { t } = useLanguage();

  const features = useMemo(
    () => [
      {
        icon: FileJson,
        title: t.homeFeature1Title,
        description: t.homeFeature1Desc,
      },
      {
        icon: CheckSquare,
        title: t.homeFeature2Title,
        description: t.homeFeature2Desc,
      },
      {
        icon: Zap,
        title: t.homeFeature3Title,
        description: t.homeFeature3Desc,
      },
      {
        icon: FolderArchive,
        title: t.homeFeature4Title,
        description: t.homeFeature4Desc,
      },
    ],
    [t]
  );

  const steps = useMemo(
    () => [
      { icon: Upload, title: t.homeStep1Title, description: t.homeStep1Desc },
      { icon: Layers, title: t.homeStep2Title, description: t.homeStep2Desc },
      {
        icon: FileCode,
        title: t.homeStep3Title,
        description: t.homeStep3Desc,
      },
    ],
    [t]
  );

  return (
    <div className="overflow-y-auto bg-background">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-20 md:py-28">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-muted/60 to-background pointer-events-none" />
        <div className="max-w-5xl mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-6">
            {t.homeCompatibleWith}
          </Badge>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6 text-balance">
            {t.homeTitle}
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 text-balance">
            {t.homeSubtitle}
          </p>
          <Button asChild size="lg" className="text-base">
            <Link href="/upload">
              {t.homeGetStarted}
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>

      {/* ── App preview ──────────────────────────────────────────────────── */}
      <section className="py-12 md:py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div>
              <Badge variant="outline" className="mb-3">
                {t.homePreviewStep1}
              </Badge>
              <h3 className="text-xl font-semibold mb-2">{t.homeStep1Title}</h3>
              <p className="text-muted-foreground mb-5 text-sm">
                {t.homeStep1Desc}
              </p>
              <UploadMockup />
            </div>
            <div>
              <Badge variant="outline" className="mb-3">
                {t.homePreviewStep2}
              </Badge>
              <h3 className="text-xl font-semibold mb-2">{t.homeStep2Title}</h3>
              <p className="text-muted-foreground mb-5 text-sm">
                {t.homeStep2Desc}
              </p>
              <SelectMockup />
            </div>
          </div>
        </div>
      </section>

      <Separator />

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section className="py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight mb-3">
              {t.homeSectionFeaturesTitle}
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {t.homeSectionFeaturesDesc}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map(({ icon: Icon, title, description }) => (
              <Card key={title} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <Icon className="size-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">{title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-sm text-muted-foreground">{description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="py-16 md:py-20 bg-muted/40">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight mb-3">
              {t.homeHowItWorksTitle}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {steps.map(({ icon: Icon, title, description }, index) => (
              <div
                key={title}
                className="relative flex flex-col items-center text-center"
              >
                {/* Connector line between steps */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[calc(50%+2.75rem)] right-[-50%] h-px bg-border" />
                )}
                <div className="relative mb-4">
                  <div className="size-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Icon className="size-7 text-primary" />
                  </div>
                  <div className="absolute -top-2 -right-2 size-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                    {index + 1}
                  </div>
                </div>
                <h3 className="font-semibold mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="py-20 md:py-28">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-balance">
            {t.homeCtaTitle}
          </h2>
          <p className="text-muted-foreground mb-8 text-lg text-balance">
            {t.homeCtaDesc}
          </p>
          <Button asChild size="lg" className="text-base">
            <Link href="/upload">
              {t.homeGetStarted}
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
