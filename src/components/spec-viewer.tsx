"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MethodBadge } from "@/components/method-badge";
import { EndpointFilters } from "@/components/endpoint-filters";
import { useLanguage } from "@/contexts/language-context";
import { cn } from "@/lib/utils";
import type { ParsedSpec, ParsedEndpoint, SchemaObject, SchemaProperty } from "@/types/openapi";

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

// ── Endpoint detail card ──────────────────────────────────────────────────────

interface EndpointDetailCardProps {
  endpoint: ParsedEndpoint;
  isFirst?: boolean;
}

function EndpointDetailCard({ endpoint, isFirst = false }: EndpointDetailCardProps) {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();

  const hasDetails =
    !!endpoint.description ||
    (endpoint.parameters && endpoint.parameters.length > 0) ||
    !!endpoint.requestBody;

  return (
    <div>
      {!isFirst && <Separator />}
      <div
        className={cn(
          "hover:bg-muted/30 flex cursor-pointer items-start gap-3 px-6 py-3 transition-colors",
        )}
        onClick={() => hasDetails && setOpen((v) => !v)}
      >
        {hasDetails ? (
          open ? (
            <ChevronDown className="text-muted-foreground mt-1 size-4 shrink-0" />
          ) : (
            <ChevronRight className="text-muted-foreground mt-1 size-4 shrink-0" />
          )
        ) : (
          <span className="mt-1 size-4 shrink-0" />
        )}

        <div className="flex min-w-0 flex-1 items-start gap-3">
          <MethodBadge method={endpoint.method} />
          <div className="min-w-0">
            <code className="font-mono text-sm break-all">{endpoint.path}</code>
            {endpoint.summary && (
              <p className="text-muted-foreground mt-0.5 text-xs">{endpoint.summary}</p>
            )}
          </div>
        </div>
      </div>

      {open && hasDetails && (
        <div className="bg-muted/20 border-t px-6 pt-3 pb-4">
          {endpoint.description && (
            <p className="text-muted-foreground mb-3 text-sm">{endpoint.description}</p>
          )}

          {endpoint.parameters && endpoint.parameters.length > 0 && (
            <div className="mb-3">
              <p className="mb-1.5 text-xs font-semibold tracking-wide uppercase">
                {t.specViewerParametersTitle}
              </p>
              <div className="rounded-md border">
                {endpoint.parameters.map((param, idx) => (
                  <div key={idx} className={cn("px-3 py-2", idx > 0 && "border-t")}>
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

          {endpoint.requestBody && (
            <div>
              <p className="mb-1.5 text-xs font-semibold tracking-wide uppercase">
                {t.specViewerRequestBodyTitle}
              </p>
              {endpoint.requestBody.description && (
                <p className="text-muted-foreground mb-1.5 text-xs">
                  {endpoint.requestBody.description}
                </p>
              )}
              {endpoint.requestBody.content &&
                Object.entries(endpoint.requestBody.content).map(([contentType, mediaType]) => {
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
    <div className="rounded-lg border">
      <div
        className="flex cursor-pointer items-center gap-2 px-4 py-3"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? (
          <ChevronDown className="text-muted-foreground size-4 shrink-0" />
        ) : (
          <ChevronRight className="text-muted-foreground size-4 shrink-0" />
        )}
        <span className="flex-1 text-sm font-semibold">{name}</span>
        {schema.type && (
          <Badge variant="secondary" className="text-xs">
            {schema.type}
          </Badge>
        )}
      </div>

      {open && (
        <div className="border-t px-4 pt-2 pb-3">
          {schema.description && (
            <p className="text-muted-foreground mb-2 text-xs">{schema.description}</p>
          )}

          {schema.enum && schema.enum.length > 0 && (
            <div className="mb-2">
              <p className="mb-1 text-xs font-semibold tracking-wide uppercase">
                {t.specViewerProperties}
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
              <p className="mb-1 text-xs font-semibold tracking-wide uppercase">
                {t.specViewerProperties}
              </p>
              <div className="rounded-md border">
                <div className="px-3 py-1">
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

// ── SpecViewer ────────────────────────────────────────────────────────────────

interface SpecViewerProps {
  spec: ParsedSpec;
  filteredEndpointsByTag: Record<string, ParsedEndpoint[]>;
  searchText: string;
  onSearchChange: (value: string) => void;
  availableMethods: string[];
  selectedMethods: Set<string>;
  onMethodToggle: (method: string) => void;
  availableTags: string[];
  selectedTags: Set<string>;
  onTagToggle: (tag: string) => void;
  onClearFilters: () => void;
}

export function SpecViewer({
  spec,
  filteredEndpointsByTag,
  searchText,
  onSearchChange,
  availableMethods,
  selectedMethods,
  onMethodToggle,
  availableTags,
  selectedTags,
  onTagToggle,
  onClearFilters,
}: SpecViewerProps) {
  const { t } = useLanguage();

  const schemas = spec.schemas ?? {};
  const schemaEntries = Object.entries(schemas);

  const hasEndpoints = Object.keys(filteredEndpointsByTag).length > 0;
  const hasModels = schemaEntries.length > 0;

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <Tabs defaultValue="endpoints" className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <CardHeader className="shrink-0 space-y-0 pb-0">
          <div className="flex items-center justify-between gap-2 pb-3">
            <CardTitle className="text-base">{t.tabSpecification}</CardTitle>
            <TabsList className="h-8">
              <TabsTrigger value="endpoints" className="h-6 px-3 text-xs">
                {t.specViewerEndpointsTitle}
              </TabsTrigger>
              <TabsTrigger value="models" className="h-6 px-3 text-xs">
                {t.specViewerModelsTitle}
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="border-b pb-3">
            <EndpointFilters
              searchText={searchText}
              onSearchChange={onSearchChange}
              availableMethods={availableMethods}
              selectedMethods={selectedMethods}
              onMethodToggle={onMethodToggle}
              availableTags={availableTags}
              selectedTags={selectedTags}
              onTagToggle={onTagToggle}
              onClearFilters={onClearFilters}
            />
          </div>
        </CardHeader>

        <TabsContent value="endpoints" className="min-h-0 flex-1 overflow-y-auto scroll-smooth">
          {!hasEndpoints ? (
            <p className="text-muted-foreground px-6 py-8 text-center text-sm">
              {t.specViewerNoEndpoints}
            </p>
          ) : (
            Object.entries(filteredEndpointsByTag).map(([tag, endpoints], groupIdx) => (
              <div key={tag}>
                {groupIdx > 0 && <Separator />}
                <div className="bg-muted px-6 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{tag}</span>
                    <Badge variant="secondary" className="text-xs">
                      {endpoints.length}
                    </Badge>
                  </div>
                </div>
                {endpoints.map((endpoint, idx) => (
                  <EndpointDetailCard
                    key={`${endpoint.method}-${endpoint.path}`}
                    endpoint={endpoint}
                    isFirst={idx === 0}
                  />
                ))}
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="models" className="min-h-0 flex-1 overflow-y-auto scroll-smooth">
          {!hasModels ? (
            <p className="text-muted-foreground px-6 py-8 text-center text-sm">
              {t.specViewerNoModels}
            </p>
          ) : (
            <div className="flex flex-col gap-3 px-6 py-4">
              {schemaEntries.map(([schemaName, schema]) => (
                <ModelCard key={schemaName} name={schemaName} schema={schema} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
}
