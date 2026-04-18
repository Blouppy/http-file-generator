"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GenerationActions } from "@/components/generation-actions";
import { useSpec } from "@/contexts/spec-context";
import { groupEndpointsByTag } from "@/services/openapi.service";

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

export default function GeneratePage() {
  const router = useRouter();
  const { spec, selectedEndpoints } = useSpec();

  useEffect(() => {
    if (!spec) router.replace("/upload");
  }, [spec, router]);

  if (!spec) return null;

  const tagCount = Object.keys(groupEndpointsByTag(selectedEndpoints)).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <StepIndicator current={3} />

        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Generate .http Files</h1>
          <p className="text-muted-foreground">
            Your files are ready to download.
          </p>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium">
                {tagCount} file{tagCount !== 1 ? "s" : ""} will be generated (one per API tag)
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedEndpoints.length} endpoint{selectedEndpoints.length !== 1 ? "s" : ""} selected &bull; {spec.title} v{spec.version}
              </p>
            </CardContent>
          </Card>

          <GenerationActions spec={spec} selectedEndpoints={selectedEndpoints} />

          <div className="flex justify-start pt-2">
            <Button variant="ghost" asChild>
              <Link href="/">Start Over</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
