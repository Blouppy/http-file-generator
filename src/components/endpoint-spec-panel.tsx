"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/language-context";
import { useSpec } from "@/contexts/spec-context";
import { cn } from "@/lib/utils";
import type { ParsedEndpoint, SchemaObject, SchemaProperty } from "@/types/openapi";

/**
 * Converts a PascalCase identifier to camelCase by lowercasing the first character.
 * Other formats (camelCase, ALL_CAPS, kebab-case, snake_case) are left unchanged.
 * - "StatusIds" → "statusIds"
 * - "projectId"  → "projectId"  (already camelCase, unchanged)
 * - "X-Version"  → "X-Version"  (kebab, second char is not lowercase, unchanged)
 */
function pascalToCamel(name: string): string {
  if (name.length >= 2 && name[0] >= "A" && name[0] <= "Z" && name[1] >= "a" && name[1] <= "z") {
    return name[0].toLowerCase() + name.slice(1);
  }

  return name;
}

// ── Type label helper ───────────────────────────────────────────────────────────

/**
 * Formats a schema type (which may be a string array in OpenAPI 3.1) into a readable label.
 * - `["integer", "string"]` + `"int32"` → `"integer | string<int32>"`
 * - `"object"` with `schemaName` "UserDto" → `"UserDto"`
 * - `"array"` with items `schemaName` "LabelDto" → `"array[LabelDto]"`
 */
function formatTypeLabel(schema: SchemaProperty): string {
  const { type, format, items, schemaName } = schema;

  if (!type && !schemaName) {
    return "";
  }

  // Object type with a known schema name — show the schema name directly.
  const resolvedTypes = Array.isArray(type) ? type.filter((t) => t !== "null") : type ? [type] : [];
  const isObjectType = resolvedTypes.length === 1 && resolvedTypes[0] === "object";

  if (isObjectType && schemaName) {
    return schemaName;
  }

  // Array type — resolve item type label.
  const isArrayType = resolvedTypes.length === 1 && resolvedTypes[0] === "array";

  if (isArrayType) {
    const itemLabel = items?.schemaName ?? items?.type ?? "";
    return itemLabel ? `array[${itemLabel}]` : "array";
  }

  // General case: join type(s) with " | ", append format if present.
  const typeStr = resolvedTypes.join(" | ");

  // Fallback: when no types resolved (e.g. enum-only schemas without an explicit type field),
  // use the schema name as the label.
  if (!typeStr && schemaName) {
    return schemaName;
  }

  return format ? `${typeStr}<${format}>` : typeStr;
}

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

  const effectiveType = Array.isArray(schema.type)
    ? schema.type.filter((t) => t !== "null")
    : schema.type
      ? [schema.type]
      : [];
  const isObjectType = effectiveType.length === 1 && effectiveType[0] === "object";
  const isArrayType = effectiveType.length === 1 && effectiveType[0] === "array";

  // Children come from `schema.properties` for objects, or from `schema.items.properties`
  // for arrays of objects. This allows expanding `array[LabelDto]` to inspect the item schema.
  const childContainer: SchemaProperty | undefined = isObjectType
    ? schema
    : isArrayType
      ? schema.items
      : undefined;

  const hasChildren =
    !!childContainer?.properties && Object.keys(childContainer.properties).length > 0;

  const requiredChildren = childContainer?.required ?? [];

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

            {(schema.type ?? schema.schemaName) && (
              <span className="text-muted-foreground text-xs">{formatTypeLabel(schema)}</span>
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
          {isArrayType && <code className="text-muted-foreground ml-3 block text-xs">[</code>}
          <code
            className={cn("text-muted-foreground block text-xs", isArrayType ? "ml-6" : "ml-3")}
          >
            {"{"}
          </code>
          {Object.entries(childContainer!.properties!).map(([propName, propSchema]) => (
            <SchemaPropertyRow
              key={propName}
              name={propName}
              schema={propSchema}
              required={requiredChildren.includes(propName)}
              depth={depth + (isArrayType ? 2 : 1)}
            />
          ))}
          <code
            className={cn("text-muted-foreground block text-xs", isArrayType ? "ml-6" : "ml-3")}
          >
            {"}"}
          </code>
          {isArrayType && <code className="text-muted-foreground ml-3 block text-xs">]</code>}
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

  const typeLabel = formatTypeLabel(schema);

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

// ── Example formatting ────────────────────────────────────────────────────────

/**
 * Stringifies a response example for display. Objects and arrays are
 * pretty-printed as JSON; primitives are coerced via `String`. Returns
 * `undefined` if `JSON.stringify` throws (e.g. for circular references) so that
 * the caller can fall back to `String(value)`.
 */
function formatExample(value: unknown): string | undefined {
  if (value === null || typeof value !== "object") {
    return String(value);
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return undefined;
  }
}

type JsonTokenType = "key" | "string" | "number" | "boolean" | "null" | "punctuation";

interface JsonToken {
  type: JsonTokenType;
  text: string;
}

// Matches one JSON token at a time:
//   - string with escapes:   "(?:\\.|[^"\\])*"
//   - number (incl. exp):    -?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?
//   - literals:              true | false | null
//   - punctuation:           any of { } [ ] , :
const JSON_TOKEN_RE = /"(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null|[{}[\],:]/g;

/**
 * Tokenises a single line of pretty-printed JSON for syntax highlighting. Strings
 * immediately followed by a `:` are classified as keys; other recognised tokens
 * keep their JSON type. Whitespace and unrecognised characters are emitted as
 * punctuation so the original spacing is preserved.
 */
function tokenizeJsonLine(line: string): JsonToken[] {
  const tokens: JsonToken[] = [];
  let lastIndex = 0;

  // `matchAll` returns a fresh iterator and avoids relying on the regex's
  // mutable `lastIndex` state across calls.
  for (const match of line.matchAll(JSON_TOKEN_RE)) {
    const start = match.index ?? 0;
    const text = match[0];
    const end = start + text.length;

    if (start > lastIndex) {
      tokens.push({ type: "punctuation", text: line.slice(lastIndex, start) });
    }

    let type: JsonTokenType;

    if (text[0] === '"') {
      // Look ahead past whitespace for a colon to detect object keys.
      let i = end;

      while (i < line.length && (line[i] === " " || line[i] === "\t")) {
        i++;
      }

      type = line[i] === ":" ? "key" : "string";
    } else if (text === "true" || text === "false") {
      type = "boolean";
    } else if (text === "null") {
      type = "null";
    } else if (text[0] === "-" || (text[0] >= "0" && text[0] <= "9")) {
      type = "number";
    } else {
      type = "punctuation";
    }

    tokens.push({ type, text });
    lastIndex = end;
  }

  if (lastIndex < line.length) {
    tokens.push({ type: "punctuation", text: line.slice(lastIndex) });
  }

  return tokens;
}

const JSON_TOKEN_CLASSES: Record<JsonTokenType, string> = {
  key: "text-blue-600 dark:text-blue-400",
  string: "text-green-700 dark:text-green-400",
  number: "text-amber-600 dark:text-amber-400",
  boolean: "text-purple-600 dark:text-purple-400",
  null: "text-purple-600 dark:text-purple-400",
  punctuation: "text-muted-foreground",
};

/**
 * Renders pretty-printed JSON with inline syntax colouring. Mirrors the
 * lightweight Tailwind-based approach used by `HttpPreview`'s `SyntaxLine`
 * (no external highlighter dependency).
 */
function JsonHighlighted({ json }: { json: string }) {
  const lines = json.split("\n");

  return (
    <>
      {lines.map((line, lineIdx) => (
        <Fragment key={lineIdx}>
          {tokenizeJsonLine(line).map((tok, tokIdx) => (
            <span key={tokIdx} className={JSON_TOKEN_CLASSES[tok.type]}>
              {tok.text}
            </span>
          ))}
          {lineIdx < lines.length - 1 && "\n"}
        </Fragment>
      ))}
    </>
  );
}

// ── Inline spec panel ─────────────────────────────────────────────────────────

interface EndpointSpecPanelProps {
  endpoint: ParsedEndpoint;
}

export function EndpointSpecPanel({ endpoint }: EndpointSpecPanelProps) {
  const { t } = useLanguage();
  const { spec } = useSpec();

  const contentTypes = useMemo(
    () => (endpoint.requestBody?.content ? Object.keys(endpoint.requestBody.content) : []),
    [endpoint.requestBody?.content],
  );
  const defaultContentType = useMemo(
    () => contentTypes.find((ct) => ct.startsWith("application/json")) ?? contentTypes[0] ?? "",
    [contentTypes],
  );
  const [selectedContentType, setSelectedContentType] = useState(defaultContentType);

  const hasParameters = !!(endpoint.parameters && endpoint.parameters.length > 0);
  const hasRequestBody = !!endpoint.requestBody && contentTypes.length > 0;

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
    <div className="bg-muted/10 border-t px-6 py-4" onClick={(e) => e.stopPropagation()}>
      <div className="space-y-4">
        {/* Description */}
        {endpoint.description && (
          <p className="text-muted-foreground text-xs">{endpoint.description}</p>
        )}

        {/* Parameters */}
        {hasParameters &&
          (() => {
            const pathParams = endpoint.parameters!.filter((p) => p.in === "path");
            const queryParams = endpoint.parameters!.filter((p) => p.in === "query");

            const renderParamRow = (param: import("@/types/openapi").Parameter, idx: number) => (
              <div key={idx} className={cn("px-3 py-2.5", idx > 0 && "border-t")}>
                <div className="flex flex-wrap items-center gap-1.5">
                  <code className="text-foreground text-xs font-semibold">
                    {pascalToCamel(param.name)}
                  </code>
                  {param.schema?.type &&
                    (() => {
                      const rawType = param.schema!.type!;
                      const types = Array.isArray(rawType)
                        ? rawType.filter((t) => t !== "null")
                        : [rawType];
                      const isArray = types.length === 1 && types[0] === "array";
                      const itemsType = param.schema!.items?.type;
                      const itemsLabel = itemsType
                        ? Array.isArray(itemsType)
                          ? itemsType.join(" | ")
                          : itemsType
                        : undefined;
                      const label = isArray
                        ? itemsLabel
                          ? `array[${itemsLabel}]`
                          : "array"
                        : types.join(" | ");

                      return <span className="text-muted-foreground text-xs">{label}</span>;
                    })()}
                  {param.schema?.enum && param.schema.enum.length > 0 && (
                    <span className="text-muted-foreground text-xs">
                      {"enum: "}
                      {param.schema.enum.map(String).join(" | ")}
                    </span>
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
            );

            return (
              <div className="flex flex-col gap-3">
                {pathParams.length > 0 && (
                  <div>
                    <SectionHeading title={t.specViewerPathParamsTitle} />
                    <div className="rounded-md border">
                      {pathParams.map((param, idx) => renderParamRow(param, idx))}
                    </div>
                  </div>
                )}

                {queryParams.length > 0 && (
                  <div>
                    <SectionHeading title={t.specViewerQueryParamsTitle} />
                    <div className="rounded-md border">
                      {queryParams.map((param, idx) => renderParamRow(param, idx))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

        {/* Body */}
        {hasRequestBody && (
          <div>
            {endpoint.requestBodySchemaRef && spec?.schemas?.[endpoint.requestBodySchemaRef] ? (
              <>
                <SectionHeading title={t.specViewerBodyTitle} />

                {endpoint.requestBody!.description && (
                  <p className="text-muted-foreground mb-2 text-xs">
                    {endpoint.requestBody!.description}
                  </p>
                )}

                <ModelCard
                  name={endpoint.requestBodySchemaRef}
                  schema={spec.schemas![endpoint.requestBodySchemaRef]}
                />
              </>
            ) : (
              <>
                <div className="mb-2 flex items-center gap-2">
                  <SectionHeading title={t.specViewerBodyTitle} />

                  {contentTypes.length > 1 && (
                    <select
                      value={selectedContentType}
                      onChange={(e) => {
                        e.stopPropagation();
                        setSelectedContentType(e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="border-input bg-background text-foreground ml-auto rounded border px-2 py-0.5 text-xs focus:ring-1 focus:outline-none"
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
              </>
            )}
          </div>
        )}

        {/* Response */}
        {endpoint.primaryResponse && (
          <div>
            <div className="mb-2 flex items-center gap-2">
              <SectionHeading title={t.specViewerResponseTitle} />

              <span className="ml-auto flex items-center gap-1.5">
                <span
                  className={cn(
                    "inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
                    endpoint.primaryResponse.statusCode.startsWith("2") &&
                      "bg-green-500/15 text-green-600 dark:text-green-400",
                    endpoint.primaryResponse.statusCode.startsWith("3") &&
                      "bg-blue-500/15 text-blue-600 dark:text-blue-400",
                    endpoint.primaryResponse.statusCode.startsWith("4") &&
                      "bg-orange-500/15 text-orange-600 dark:text-orange-400",
                    endpoint.primaryResponse.statusCode.startsWith("5") &&
                      "bg-red-500/15 text-red-600 dark:text-red-400",
                  )}
                >
                  {endpoint.primaryResponse.statusCode}
                </span>

                {endpoint.primaryResponse.description && (
                  <span className="text-muted-foreground text-xs">
                    {endpoint.primaryResponse.description}
                  </span>
                )}
              </span>
            </div>

            {endpoint.primaryResponse.schemaRef &&
            spec?.schemas?.[endpoint.primaryResponse.schemaRef] ? (
              <ModelCard
                name={endpoint.primaryResponse.schemaRef}
                schema={spec.schemas![endpoint.primaryResponse.schemaRef]}
              />
            ) : endpoint.primaryResponse.itemSchemaRef &&
              spec?.schemas?.[endpoint.primaryResponse.itemSchemaRef] ? (
              <ModelCard
                name={`array[${endpoint.primaryResponse.itemSchemaRef}]`}
                schema={spec.schemas![endpoint.primaryResponse.itemSchemaRef]}
              />
            ) : null}

            {endpoint.primaryResponse.example !== undefined &&
              (() => {
                const formatted = formatExample(endpoint.primaryResponse.example);

                if (formatted === undefined) {
                  return null;
                }

                return (
                  <div
                    className={cn(
                      (endpoint.primaryResponse.schemaRef ||
                        endpoint.primaryResponse.itemSchemaRef) &&
                        "mt-2",
                    )}
                  >
                    <p className="mb-1 text-[10px] font-semibold tracking-wide uppercase">
                      {t.specViewerResponseExampleTitle}
                    </p>
                    <pre className="bg-muted/40 max-h-72 overflow-auto rounded-md border p-3 text-xs whitespace-pre-wrap break-words">
                      <code>
                        <JsonHighlighted json={formatted} />
                      </code>
                    </pre>
                  </div>
                );
              })()}
          </div>
        )}
      </div>
    </div>
  );
}
