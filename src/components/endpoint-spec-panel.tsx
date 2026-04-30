"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/contexts/language-context";
import { useSpec } from "@/contexts/spec-context";
import { cn } from "@/lib/utils";
import type { ParsedEndpoint, SchemaObject, SchemaProperty } from "@/types/openapi";

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
        onClick={(e) => {
          if (hasChildren) {
            e.stopPropagation();
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
    ? `${schema.type}${schema.format ? `<${schema.format}>` : ""}${schema.type === "array" && schema.items?.type ? `[${schema.items.type}]` : ""}`
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

// ── Model card (full expandable detail — used in Schemas section) ─────────────

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
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
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

// ── Inline spec panel ─────────────────────────────────────────────────────────

interface EndpointSpecPanelProps {
  endpoint: ParsedEndpoint;
}

export function EndpointSpecPanel({ endpoint }: EndpointSpecPanelProps) {
  const { t } = useLanguage();
  const { spec } = useSpec();

  const contentTypes = endpoint.requestBody?.content ? Object.keys(endpoint.requestBody.content) : [];
  const defaultContentType =
    contentTypes.find((ct) => ct.startsWith("application/json")) ?? contentTypes[0] ?? "";
  const [selectedContentType, setSelectedContentType] = useState(defaultContentType);

  const relatedSchemas: Array<{ name: string; schema: SchemaObject }> =
    endpoint.schemaRefs && spec?.schemas
      ? endpoint.schemaRefs
          .filter((name) => spec.schemas![name] !== undefined)
          .map((name) => ({ name, schema: spec.schemas![name] }))
      : [];

  const hasParameters = !!(endpoint.parameters && endpoint.parameters.length > 0);
  const hasRequestBody = !!endpoint.requestBody && contentTypes.length > 0;
  const hasSchemas = relatedSchemas.length > 0;

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

  const hasSomethingBeforeSchemas = !!endpoint.description || hasParameters || hasRequestBody;

  return (
    <div className="bg-muted/10 border-t px-6 py-4" onClick={(e) => e.stopPropagation()}>
      <div className="space-y-4">
        {/* Description */}
        {endpoint.description && (
          <p className="text-muted-foreground text-xs">{endpoint.description}</p>
        )}

        {/* Parameters */}
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

        {/* Request Body — compact flat property list */}
        {hasRequestBody && (
          <div>
            <div className="mb-2 flex items-center gap-2">
              <SectionHeading title={t.specViewerRequestBodyTitle} />
              {contentTypes.length > 1 && (
                <select
                  value={selectedContentType}
                  onChange={(e) => {
                    e.stopPropagation();
                    setSelectedContentType(e.target.value);
                  }}
                  onClick={(e) => e.stopPropagation()}
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

        {/* Schemas — full expandable model cards */}
        {hasSchemas && (
          <div>
            {hasSomethingBeforeSchemas && <Separator className="mb-4" />}
            <SectionHeading title={t.specViewerModelsTitle} />
            <div className="flex flex-col gap-2">
              {relatedSchemas.map(({ name, schema }) => (
                <ModelCard key={name} name={name} schema={schema} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
