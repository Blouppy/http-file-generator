"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Upload,
  ArrowRight,
  FileCode,
  Layers,
  ShieldCheck,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SelectMockup } from "@/components/home/app-preview-mockup";
import { useLanguage } from "@/contexts/language-context";

// ── Home page ────────────────────────────────────────────────────────────────
export default function Home() {
  const { t } = useLanguage();

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

      {/* ── App preview (select screen) ───────────────────────────────────── */}
      <section className="py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold mb-2">
              {t.homePreviewTitle}
            </h2>
            <p className="text-muted-foreground text-sm max-w-xl mx-auto">
              {t.homePreviewDesc}
            </p>
          </div>
          <SelectMockup />
        </div>
      </section>

      <Separator />

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="py-12 md:py-16 bg-muted/40">
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

      {/* ── Privacy ──────────────────────────────────────────────────────── */}
      <section className="py-12 md:py-16">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="size-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-5">
            <ShieldCheck className="size-7 text-primary" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight mb-3">
            {t.homePrivacyTitle}
          </h2>
          <p className="text-muted-foreground text-sm">{t.homePrivacyDesc}</p>
        </div>
      </section>

      <Separator />

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

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t py-8">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span>{t.homeFooterMadeWith}</span>
            <Heart
              className="size-4 text-destructive fill-destructive"
              aria-hidden="true"
            />
            <span>{t.homeFooterBy}</span>
          </div>
          <span>© {new Date().getFullYear()} HTTP File Generator</span>
        </div>
      </footer>
    </div>
  );
}
