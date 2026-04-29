"use client";

import { useState } from "react";
import { Info, ChevronDown, ChevronRight } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { MethodBadge } from "@/components/method-badge";
import { useLanguage } from "@/contexts/language-context";
import { useSpec } from "@/contexts/spec-context";
import { cn } from "@/lib/utils";
import type { ParsedEndpoint, SchemaObject, SchemaProperty } from "@/types/openapi";

// ── Schema property tree ──────────────────────────────────────────────────────

interface SchemaPropertyRowProps {
  name: string;
  schema: SchemaProperty;
  required?: boolean;
  depth?: number;
}

function SchemaPropertyRow({ name, schema, required = false, depth = 0 }: SchemaPropertyRowProps) {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();

  const hasChildren =
    schema.type === "object" && schema.properties && Object.keys(schema.properties).length > 0;

  const requiredChildren = schema.required ?? [];

  return (
    <div className={cn("border-l pl-3", depth > 0 ? "ml-3" : "ml-0")}>
      <div
        className={cn("flex items-start gap-2 py-1.5", hasChildren && "cursor-pointer")}
        onClick={() => hasChildren && setOpen((v) => !v)}
      >
        {hasChildren ? (
          open ? (
            <ChevronDown className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
          ) : (
            <ChevronRight className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
          )
        ) : (
          <span className="mt-0.5 size-3.5 shrink-0" />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <code className="text-foreground text-xs font-semibold">{name}</code>

            {schema.type && (
              <span className="text-muted-foreground text-xs">
                {schema.type}
                {schema.format ? `<${schema.format}>` : ""}
                {schema.type === "array" && schema.items?.type ? `[${schema.items.type}]` : ""}
              </span>
            )}

            {schema.enum && schema.enum.length > 0 && (
              <span className="text-muted-foreground text-xs">
                {"enum: "}
                {schema.enum.map(String).join(" | ")}
              </span>
            )}

            <Badge variant={required ? "default" : "secondary"} className="h-4 px-1 text-[10px]">
              {required ? t.specViewerRequired : t.specViewerOptional}
            </Badge>
          </div>

          {schema.description && (
            <p className="text-muted-foreground mt-0.5 text-xs">{schema.description}</p>
          )}
        </div>
      </div>

      {hasChildren && open && (
        <div className="mb-1">
          {Object.entries(schema.properties!).map(([propName, propSchema]) => (
            <SchemaPropertyRow
              key={propName}
              name={propName}
              schema={propSchema}
              required={requiredChildren.includes(propName)}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Model card ────────────────────────────────────────────────────────────────

interface ModelCardProps {
  name: string;
  schema: SchemaObject;
}

function ModelCard({ name, schema }: ModelCardProps) {
  const [open, setOpen] = useState(true);
  const { t } = useLanguage();

  const properties = schema.properties ?? {};
  const requiredFields = schema.required ?? [];
  const hasProperties = Object.keys(properties).length > 0;

  return (
    <div className="rounded-md border">
      <div
        className="flex cursor-pointer items-center gap-2 px-3 py-2.5"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? (
          <ChevronDown className="text-muted-foreground size-3.5 shrink-0" />
        ) : (
          <ChevronRight className="text-muted-foreground size-3.5 shrink-0" />
        )}
        <span className="flex-1 text-xs font-semibold">{name}</span>
        {schema.type && (
          <Badge variant="secondary" className="text-[10px]">
            {schema.type}
          </Badge>
        )}
      </div>

      {open && (
        <div className="border-t px-3 pt-2 pb-3">
          {schema.description && (
            <p className="text-muted-foreground mb-2 text-xs">{schema.description}</p>
          )}

          {schema.enum && schema.enum.length > 0 && (
            <div className="mb-2">
              <p className="mb-1 text-[10px] font-semibold tracking-wide uppercase">
                {t.specViewerEnumValues}
              </p>
              <div className="flex flex-wrap gap-1">
                {schema.enum.map((val) => (
                  <Badge key={String(val)} variant="outline" className="text-xs">
                    {String(val)}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {hasProperties ? (
            <>
              <p className="mb-1 text-[10px] font-semibold tracking-wide uppercase">
                {t.specViewerProperties}
              </p>
              <div className="rounded-sm border">
                <div className="px-2 py-1">
                  {Object.entries(properties).map(([propName, propSchema]) => (
                    <SchemaPropertyRow
                      key={propName}
                      name={propName}
                      schema={propSchema}
                      required={requiredFields.includes(propName)}
                    />
                  ))}
                </div>
              </div>
            </>
          ) : (
            !schema.enum && (
              <p className="text-muted-foreground text-xs">{t.specViewerNoProperties}</p>
            )
          )}
        </div>
      )}
    </div>
  );
}

// ── Sheet content ─────────────────────────────────────────────────────────────

interface EndpointSpecSheetProps {
  endpoint: ParsedEndpoint;
}

export function EndpointSpecSheet({ endpoint }: EndpointSpecSheetProps) {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();
  const { spec } = useSpec();

  const hasParameters = endpoint.parameters && endpoint.parameters.length > 0;
  const hasRequestBody = !!endpoint.requestBody;

  const relatedSchemas: Array<{ name: string; schema: SchemaObject }> =
    endpoint.schemaRefs && spec?.schemas
      ? endpoint.schemaRefs
          .filter((name) => spec.schemas![name] !== undefined)
          .map((name) => ({ name, schema: spec.schemas![name] }))
      : [];

  const hasModels = relatedSchemas.length > 0;
  const hasDetails = !!endpoint.description || hasParameters || hasRequestBody || hasModels;

  if (!hasDetails) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-foreground h-7 w-7 shrink-0"
        aria-label={t.specViewerOpenButton}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <Info className="size-4" />
      </Button>

      <SheetContent side="right">
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="text-sm">{t.specViewerTitle}</SheetTitle>
          <div className="flex items-center gap-2">
            <MethodBadge method={endpoint.method} />
            <code className="text-foreground font-mono text-sm break-all">{endpoint.path}</code>
          </div>
          {endpoint.summary && (
            <p className="text-muted-foreground text-sm">{endpoint.summary}</p>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {endpoint.description && (
            <p className="text-muted-foreground mt-4 text-sm">{endpoint.description}</p>
          )}

          {hasParameters && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold tracking-wide uppercase">
                {t.specViewerParametersTitle}
              </p>
              <div className="rounded-md border">
                {endpoint.parameters!.map((param, idx) => (
                  <div key={idx} className={cn("px-3 py-2.5", idx > 0 && "border-t")}>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <code className="text-xs font-semibold">{param.name}</code>
                      <Badge variant="outline" className="h-4 px-1 text-[10px]">
                        {param.in}
                      </Badge>
                      {param.schema?.type && (
                        <span className="text-muted-foreground text-xs">{param.schema.type}</span>
                      )}
                      <Badge
                        variant={param.required ? "default" : "secondary"}
                        className="h-4 px-1 text-[10px]"
                      >
                        {param.required ? t.specViewerRequired : t.specViewerOptional}
                      </Badge>
                    </div>
                    {param.description && (
                      <p className="text-muted-foreground mt-0.5 text-xs">{param.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasRequestBody && (
            <div className="mt-4">
              <Separator className="mb-4" />
              <p className="mb-2 text-xs font-semibold tracking-wide uppercase">
                {t.specViewerRequestBodyTitle}
              </p>
              {endpoint.requestBody!.description && (
                <p className="text-muted-foreground mb-2 text-xs">
                  {endpoint.requestBody!.description}
                </p>
              )}
              {endpoint.requestBody!.content &&
                Object.entries(endpoint.requestBody!.content).map(([contentType, mediaType]) => {
                  const schema = mediaType.schema;
                  const properties =
                    schema?.type === "object" && schema.properties
                      ? (schema.properties as Record<string, SchemaProperty>)
                      : null;
                  const requiredFields = (schema as SchemaProperty | undefined)?.required ?? [];

                  return (
                    <div key={contentType} className="rounded-md border">
                      <div className="bg-muted/40 border-b px-3 py-1.5">
                        <code className="text-muted-foreground text-xs">{contentType}</code>
                      </div>
                      {properties && Object.keys(properties).length > 0 ? (
                        <div className="px-3 py-2">
                          {Object.entries(properties).map(([propName, propSchema]) => (
                            <SchemaPropertyRow
                              key={propName}
                              name={propName}
                              schema={propSchema}
                              required={requiredFields.includes(propName)}
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground px-3 py-2 text-xs">
                          {t.specViewerNoProperties}
                        </p>
                      )}
                    </div>
                  );
                })}
            </div>
          )}

          {hasModels && (
            <div className="mt-4">
              <Separator className="mb-4" />
              <p className="mb-2 text-xs font-semibold tracking-wide uppercase">
                {t.specViewerModelsTitle}
              </p>
              <div className="flex flex-col gap-2">
                {relatedSchemas.map(({ name, schema }) => (
                  <ModelCard key={name} name={name} schema={schema} />
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
