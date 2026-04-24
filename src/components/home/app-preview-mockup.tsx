import { Download, Search, CheckCheck, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Browser-frame mockup wrapper ─────────────────────────────────────────────
function BrowserMockup({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <div className="rounded-xl overflow-hidden border bg-card shadow-2xl">
      {/* Chrome bar */}
      <div className="flex items-center gap-2 px-4 py-3 bg-muted border-b">
        <div className="flex gap-1.5 shrink-0">
          <div className="size-3 rounded-full bg-destructive/60" />
          <div className="size-3 rounded-full bg-yellow-400/70" />
          <div className="size-3 rounded-full bg-green-500/60" />
        </div>
        <div className="flex-1 bg-background rounded-md px-3 py-1 text-xs text-muted-foreground text-center truncate border">
          {title ?? "http-file-generator.app"}
        </div>
      </div>
      {/* Page content */}
      <div className="bg-background">{children}</div>
    </div>
  );
}

// ── Mock endpoint data ────────────────────────────────────────────────────────
const MOCK_ENDPOINTS = [
  { method: "GET", path: "/pets", checked: true },
  { method: "POST", path: "/pets", checked: true },
  { method: "GET", path: "/pets/{id}", checked: false },
  { method: "DELETE", path: "/pets/{id}", checked: false },
] as const;

const MOCK_METHOD_COLORS: Record<string, string> = {
  GET: "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30",
  POST: "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30",
  PUT: "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30",
  DELETE: "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30",
  PATCH: "text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30",
};

// ── Select-page mockup ────────────────────────────────────────────────────────
export function SelectMockup() {
  return (
    <BrowserMockup title="HTTP File Generator — Select">
      <div className="text-xs select-none">
        {/* Compact header */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-card">
          <div>
            <div className="font-semibold text-[11px]">Petstore API</div>
            <div className="text-muted-foreground text-[10px]">
              v3.0.0 · https://petstore3.swagger.io/api/v3
            </div>
          </div>
          <div className="flex gap-1.5 items-center">
            <div className="px-2 py-1 rounded border text-muted-foreground text-[10px]">
              Upload new
            </div>
            <div className="px-2 py-1 rounded bg-primary text-primary-foreground flex items-center gap-1 text-[10px]">
              <Download className="size-2.5" />
              Download
            </div>
          </div>
        </div>

        {/* Two-column grid */}
        <div className="grid grid-cols-2 divide-x">
          {/* Left: endpoint list */}
          <div className="p-3">
            <div className="font-medium mb-2 text-[11px]">Endpoints</div>
            <div className="bg-muted rounded px-2 py-1 mb-2 flex items-center gap-1 text-muted-foreground">
              <Search className="size-3 shrink-0" />
              <span className="text-[10px]">Search endpoints…</span>
            </div>

            <div className="space-y-1">
              {MOCK_ENDPOINTS.map((ep) => (
                <div
                  key={ep.method + ep.path}
                  className="flex items-center gap-1.5 py-0.5"
                >
                  <div
                    className={cn(
                      "size-3.5 rounded flex items-center justify-center shrink-0",
                      ep.checked
                        ? "bg-primary"
                        : "border border-input bg-background"
                    )}
                  >
                    {ep.checked && (
                      <CheckCheck className="size-2 text-primary-foreground" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "px-1 rounded text-[9px] font-bold font-mono shrink-0",
                      MOCK_METHOD_COLORS[ep.method]
                    )}
                  >
                    {ep.method}
                  </span>
                  <span className="text-muted-foreground font-mono text-[10px] truncate">
                    {ep.path}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: HTTP preview */}
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium text-[11px]">HTTP Preview</div>
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-muted-foreground cursor-default">
                <Copy className="size-2.5" />
                <span className="text-[9px]">Copy</span>
              </div>
            </div>
            <div className="bg-muted rounded p-2 font-mono text-[9px] leading-relaxed">
              <div className="text-muted-foreground">@limit = 10</div>
              <div className="text-muted-foreground">@offset = 0</div>
              <div className="mt-1" />
              <div className="text-blue-500">###</div>
              <div>
                <span className="text-green-600 dark:text-green-400">GET</span>
                <span className="text-muted-foreground">
                  {" "}
                  {`{{baseUrl}}`}/pets
                </span>
              </div>
              <div className="text-muted-foreground">
                Accept: application/json
              </div>
              <div className="mt-1" />
              <div className="text-blue-500">###</div>
              <div>
                <span className="text-green-600 dark:text-green-400">POST</span>
                <span className="text-muted-foreground">
                  {" "}
                  {`{{baseUrl}}`}/pets
                </span>
              </div>
              <div className="text-muted-foreground">
                Content-Type: application/json
              </div>
            </div>
          </div>
        </div>
      </div>
    </BrowserMockup>
  );
}
