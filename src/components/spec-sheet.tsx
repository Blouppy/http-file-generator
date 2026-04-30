"use client";

import { useState, useMemo } from "react";
import { BookOpen, ChevronDown, ChevronRight } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MethodBadge } from "@/components/method-badge";
import { useLanguage } from "@/contexts/language-context";
import { cn } from "@/lib/utils";
import type { ParsedSpec, ParsedEndpoint, SchemaObject, SchemaProperty } from "@/types/openapi";

// ── Schema property row (expandable, used in model cards) ─────────────────────

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
        onClick={() => {
          if (hasChildren) {
            setOpen((v) => !v);
          }
        }}
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

// ── Compact property row (flat, no nesting — used in Request Body section) ────

interface CompactPropertyRowProps {
  name: string;
  schema: SchemaProperty;
  required?: boolean;
}

function CompactPropertyRow({ name, schema, required = false }: CompactPropertyRowProps) {
  const { t } = useLanguage();

  const typeLabel = schema.type
    ? `${schema.type}${schema.format ? `<${schema.format}>` : ""}${
        schema.type === "array" && schema.items?.type ? `[${schema.items.type}]` : ""
      }`
    : "";

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b px-3 py-2 last:border-0">
      <code className="text-foreground text-xs font-semibold">{name}</code>

      {typeLabel && <span className="text-muted-foreground text-xs">{typeLabel}</span>}

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
  );
}

// ── Model card (full expandable detail) ──────────────────────────────────────

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

// ── Section heading ───────────────────────────────────────────────────────────

function SectionHeading({ title }: { title: string }) {
  return (
    <p className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-wider uppercase">
      {title}
    </p>
  );
}

// ── Per-endpoint expandable detail panel ─────────────────────────────────────

interface EndpointDetailPanelProps {
  endpoint: ParsedEndpoint;
  schemas: Record<string, SchemaObject>;
}

function EndpointDetailPanel({ endpoint, schemas }: EndpointDetailPanelProps) {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();

  const contentTypes = endpoint.requestBody?.content
    ? Object.keys(endpoint.requestBody.content)
    : [];

  const defaultContentType =
    contentTypes.find((ct) => ct.startsWith("application/json")) ?? contentTypes[0] ?? "";

  const [selectedContentType, setSelectedContentType] = useState(defaultContentType);

  const relatedSchemas: Array<{ name: string; schema: SchemaObject }> = endpoint.schemaRefs
    ? endpoint.schemaRefs
        .filter((name) => schemas[name] !== undefined)
        .map((name) => ({ name, schema: schemas[name] }))
    : [];

  const hasParameters = endpoint.parameters && endpoint.parameters.length > 0;
  const hasRequestBody = !!endpoint.requestBody && contentTypes.length > 0;
  const hasSchemas = relatedSchemas.length > 0;
  const hasAnyDetail = !!endpoint.description || hasParameters || hasRequestBody || hasSchemas;

  const selectedMedia =
    hasRequestBody && endpoint.requestBody!.content
      ? endpoint.requestBody!.content[selectedContentType]
      : undefined;

  const bodySchema = selectedMedia?.schema;

  const bodyProperties =
    bodySchema?.type === "object" && bodySchema.properties
      ? (bodySchema.properties as Record<string, SchemaProperty>)
      : null;

  const bodyRequiredFields = (bodySchema as SchemaProperty | undefined)?.required ?? [];

  return (
    <div className="border-b last:border-0">
      {/* Row header — click to expand */}
      <div
        className={cn(
          "flex items-start gap-2 px-4 py-3",
          hasAnyDetail ? "cursor-pointer hover:bg-muted/30" : "cursor-default",
        )}
        onClick={() => {
          if (hasAnyDetail) {
            setOpen((v) => !v);
          }
        }}
      >
        {hasAnyDetail ? (
          open ? (
            <ChevronDown className="text-muted-foreground mt-1 size-3.5 shrink-0" />
          ) : (
            <ChevronRight className="text-muted-foreground mt-1 size-3.5 shrink-0" />
          )
        ) : (
          <span className="mt-1 size-3.5 shrink-0" />
        )}

        <MethodBadge method={endpoint.method} />

        <div className="min-w-0 flex-1">
          <code className="font-mono text-sm break-all">{endpoint.path}</code>
          {endpoint.summary && (
            <p className="text-muted-foreground mt-0.5 text-xs">{endpoint.summary}</p>
          )}
        </div>
      </div>

      {/* Expanded detail */}
      {open && (
        <div className="bg-muted/20 space-y-4 border-t px-6 py-4">
          {endpoint.description && (
            <p className="text-muted-foreground text-sm">{endpoint.description}</p>
          )}

          {hasParameters && (
            <div>
              <SectionHeading title={t.specViewerParametersTitle} />
              <div className="rounded-md border">
                {endpoint.parameters!.map((param, idx) => (
                  <div key={idx} className={cn("px-3 py-2.5", idx > 0 && "border-t")}>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <code className="text-foreground text-xs font-semibold">{param.name}</code>
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
            <div>
              <div className="mb-2 flex items-center gap-2">
                <SectionHeading title={t.specViewerRequestBodyTitle} />
                {contentTypes.length > 1 && (
                  <select
                    value={selectedContentType}
                    onChange={(e) => setSelectedContentType(e.target.value)}
                    className="border-input bg-background text-foreground ml-auto rounded border px-2 py-0.5 text-xs focus:outline-none focus:ring-1"
                  >
                    {contentTypes.map((ct) => (
                      <option key={ct} value={ct}>
                        {ct}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {endpoint.requestBody!.description && (
                <p className="text-muted-foreground mb-2 text-xs">
                  {endpoint.requestBody!.description}
                </p>
              )}

              <div className="rounded-md border">
                {contentTypes.length === 1 && (
                  <div className="bg-muted/40 border-b px-3 py-1.5">
                    <code className="text-muted-foreground text-xs">{selectedContentType}</code>
                  </div>
                )}

                {bodyProperties && Object.keys(bodyProperties).length > 0 ? (
                  <>
                    {Object.entries(bodyProperties).map(([propName, propSchema]) => (
                      <CompactPropertyRow
                        key={propName}
                        name={propName}
                        schema={propSchema}
                        required={bodyRequiredFields.includes(propName)}
                      />
                    ))}
                  </>
                ) : (
                  <p className="text-muted-foreground px-3 py-2 text-xs">
                    {t.specViewerNoProperties}
                  </p>
                )}
              </div>
            </div>
          )}

          {hasSchemas && (
            <div>
              {(!!endpoint.description || hasParameters || hasRequestBody) && (
                <Separator className="mb-4" />
              )}

              <SectionHeading title={t.specViewerModelsTitle} />
              <div className="flex flex-col gap-2">
                {relatedSchemas.map(({ name, schema }) => (
                  <ModelCard key={name} name={name} schema={schema} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Tag group ─────────────────────────────────────────────────────────────────

interface TagGroupProps {
  tag: string;
  endpoints: ParsedEndpoint[];
  schemas: Record<string, SchemaObject>;
}

function TagGroup({ tag, endpoints, schemas }: TagGroupProps) {
  return (
    <div className="border-b last:border-0">
      <div className="bg-muted/40 flex items-center gap-2 px-4 py-2">
        <span className="text-foreground text-xs font-semibold">{tag}</span>
        <Badge variant="secondary" className="h-4 px-1 text-[10px]">
          {endpoints.length}
        </Badge>
      </div>
      {endpoints.map((endpoint, idx) => (
        <EndpointDetailPanel key={idx} endpoint={endpoint} schemas={schemas} />
      ))}
    </div>
  );
}

// ── Spec Sheet ────────────────────────────────────────────────────────────────

interface SpecSheetProps {
  spec: ParsedSpec;
}

export function SpecSheet({ spec }: SpecSheetProps) {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();

  const schemas = useMemo(() => spec.schemas ?? {}, [spec.schemas]);

  const endpointsByTag = useMemo(() => {
    const map = new Map<string, ParsedEndpoint[]>();

    for (const endpoint of spec.endpoints) {
      const tag = endpoint.tags?.[0] ?? "default";

      if (!map.has(tag)) {
        map.set(tag, []);
      }

      map.get(tag)!.push(endpoint);
    }

    return map;
  }, [spec.endpoints]);

  const allSchemas = useMemo(
    () => Object.entries(schemas).map(([name, schema]) => ({ name, schema })),
    [schemas],
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label={t.previewViewSpec}
      >
        <BookOpen className="mr-1.5 h-3.5 w-3.5" />
        {t.previewViewSpec}
      </Button>

      <SheetContent side="right" className="flex flex-col overflow-hidden p-0 sm:max-w-2xl">
        {/* ── Fixed header ─────────────────────────────────────────────── */}
        <SheetHeader className="shrink-0 border-b px-6 pt-6 pb-4">
          <SheetTitle>{t.specViewerTitle}</SheetTitle>
          <SheetDescription>
            {spec.title} · v{spec.version}
          </SheetDescription>
        </SheetHeader>

        {/* ── Scrollable body ───────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {/* Endpoints grouped by tag */}
          <div className="pb-2 pt-4">
            <p className="text-muted-foreground mb-2 px-4 text-[11px] font-semibold tracking-wider uppercase">
              {t.endpointsTitle}
            </p>
            <div className="border-t">
              {Array.from(endpointsByTag.entries()).map(([tag, endpoints]) => (
                <TagGroup key={tag} tag={tag} endpoints={endpoints} schemas={schemas} />
              ))}
            </div>
          </div>

          {/* All schemas */}
          {allSchemas.length > 0 && (
            <div className="px-6 pb-6 pt-2">
              <Separator className="mb-4" />
              <SectionHeading title={t.specViewerModelsTitle} />
              <div className="flex flex-col gap-2">
                {allSchemas.map(({ name, schema }) => (
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
