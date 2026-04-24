"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Upload, ArrowRight, FileCode, Layers, ShieldCheck, Heart } from "lucide-react";
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
    [t],
  );

  return (
    <div className="bg-background overflow-y-auto">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-20 md:py-28">
        <div className="from-muted/60 to-background pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b" />
        <div className="mx-auto max-w-5xl px-4 text-center">
          <Badge variant="secondary" className="mb-6">
            {t.homeCompatibleWith}
          </Badge>
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-balance sm:text-5xl md:text-6xl">
            {t.homeTitle}
          </h1>
          <p className="text-muted-foreground mx-auto mb-10 max-w-2xl text-lg text-balance sm:text-xl">
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
        <div className="mx-auto max-w-4xl px-4">
          <div className="mb-8 text-center">
            <h2 className="mb-2 text-2xl font-semibold">{t.homePreviewTitle}</h2>
            <p className="text-muted-foreground mx-auto max-w-xl text-sm">{t.homePreviewDesc}</p>
          </div>
          <SelectMockup />
        </div>
      </section>

      <Separator />

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="bg-muted/40 py-12 md:py-16">
        <div className="mx-auto max-w-5xl px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold tracking-tight">{t.homeHowItWorksTitle}</h2>
          </div>
          <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
            {steps.map(({ icon: Icon, title, description }, index) => (
              <div key={title} className="relative flex flex-col items-center text-center">
                {/* Connector line between steps */}
                {index < steps.length - 1 && (
                  <div className="bg-border absolute top-8 right-[-50%] left-[calc(50%+2.75rem)] hidden h-px md:block" />
                )}
                <div className="relative mb-4">
                  <div className="bg-primary/10 border-primary/20 flex size-16 items-center justify-center rounded-2xl border">
                    <Icon className="text-primary size-7" />
                  </div>
                  <div className="bg-primary text-primary-foreground absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full text-xs font-bold">
                    {index + 1}
                  </div>
                </div>
                <h3 className="mb-2 font-semibold">{title}</h3>
                <p className="text-muted-foreground text-sm">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Privacy ──────────────────────────────────────────────────────── */}
      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <div className="bg-primary/10 border-primary/20 mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl border">
            <ShieldCheck className="text-primary size-7" />
          </div>
          <h2 className="mb-3 text-2xl font-bold tracking-tight">{t.homePrivacyTitle}</h2>
          <p className="text-muted-foreground text-sm">{t.homePrivacyDesc}</p>
        </div>
      </section>

      <Separator />

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            {t.homeCtaTitle}
          </h2>
          <p className="text-muted-foreground mb-8 text-lg text-balance">{t.homeCtaDesc}</p>
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
        <div className="text-muted-foreground mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-4 text-sm sm:flex-row">
          <div className="flex items-center gap-1.5">
            <span>{t.homeFooterMadeWith}</span>
            <Heart className="text-destructive fill-destructive size-4" aria-hidden="true" />
            <span>{t.homeFooterBy}</span>
          </div>
          <span>© {new Date().getFullYear()} HTTP File Generator</span>
        </div>
      </footer>
    </div>
  );
}
