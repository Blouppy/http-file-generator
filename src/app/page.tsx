"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/language-context";

export default function Home() {
  const { t } = useLanguage();

  const features = useMemo(
    () => [
      { icon: "📄", title: t.homeFeature1Title, description: t.homeFeature1Desc },
      { icon: "✅", title: t.homeFeature2Title, description: t.homeFeature2Desc },
      { icon: "⚡", title: t.homeFeature3Title, description: t.homeFeature3Desc },
      { icon: "🗜️", title: t.homeFeature4Title, description: t.homeFeature4Desc },
    ],
    [t]
  );

  return (
    <div className="h-[calc(100vh-3.75rem)] overflow-y-auto bg-background">
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold tracking-tight mb-4">{t.homeTitle}</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t.homeSubtitle}
          </p>
          <div className="mt-8">
            <Button asChild size="lg">
              <Link href="/upload">{t.homeGetStarted}</Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map(({ icon, title, description }) => (
            <Card key={title}>
              <CardContent className="pt-6">
                <div className="text-3xl mb-3">{icon}</div>
                <h3 className="font-semibold mb-1">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
