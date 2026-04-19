"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SpecInfo } from "@/components/spec-info";
import { EndpointGroup } from "@/components/endpoint-group";
import { GenerationActions } from "@/components/generation-actions";
import { useSpec } from "@/contexts/spec-context";
import { groupEndpointsByTag, getEndpointId } from "@/services/openapi.service";

function StepIndicator({ current }: { current: number }) {
  const steps = ["1. Upload", "2. Select"];
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

export default function SelectPage() {
  const router = useRouter();
  const { spec, setSpec, selectedIds, setSelectedIds, toggleEndpoint, selectAll, deselectAll, selectedEndpoints } =
    useSpec();

  useEffect(() => {
    if (!spec) router.replace("/upload");
  }, [spec, router]);

  if (!spec) return null;

  const endpointsByTag = groupEndpointsByTag(spec.endpoints);

  const handleSelectAllInTag = (tagEndpoints: typeof spec.endpoints) => {
    const next = new Set(selectedIds);
    tagEndpoints.forEach((e) => next.add(getEndpointId(e)));
    setSelectedIds(next);
  };

  const handleDeselectAllInTag = (tagEndpoints: typeof spec.endpoints) => {
    const next = new Set(selectedIds);
    tagEndpoints.forEach((e) => next.delete(getEndpointId(e)));
    setSelectedIds(next);
  };

  const handleReset = () => {
    setSpec(null);
    router.push("/upload");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <StepIndicator current={2} />

        <div className="space-y-6">
          <SpecInfo
            spec={spec}
            selectedCount={selectedEndpoints.length}
            totalCount={spec.endpoints.length}
            onSelectAll={selectAll}
            onDeselectAll={deselectAll}
            onReset={handleReset}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Endpoints</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {Object.entries(endpointsByTag).map(([tag, endpoints], idx) => (
                <EndpointGroup
                  key={tag}
                  tag={tag}
                  endpoints={endpoints}
                  selectedIds={selectedIds}
                  onToggleEndpoint={toggleEndpoint}
                  onSelectAll={() => handleSelectAllInTag(endpoints)}
                  onDeselectAll={() => handleDeselectAllInTag(endpoints)}
                  isFirst={idx === 0}
                />
              ))}
            </CardContent>
          </Card>

          <GenerationActions spec={spec} selectedEndpoints={selectedEndpoints} />

          <div className="flex justify-start">
            <Button variant="ghost" onClick={handleReset}>
              Start Over
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
