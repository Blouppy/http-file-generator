"use client";

/**
 * Editable list of `.http` file variables shown inside the HttpPreview card.
 *
 * Why this exists: the HTTP preview is read-only, so users cannot edit
 * placeholders like `{{baseUrl}}` or `{{token}}` directly in the file.
 * This panel surfaces every `@var` declaration and lets the user provide
 * an override that is applied at send-time. Overrides are scoped to a named
 * *environment* (default / dev / staging / prod) so the same spec can be
 * tried against several backends without re-typing values.
 */

import { useState } from "react";
import { ChevronDown, ChevronRight, Eraser, Plus, Settings2, Trash2, Variable } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useHttpVars, DEFAULT_ENVIRONMENT } from "@/contexts/http-vars-context";
import { useLanguage } from "@/contexts/language-context";

interface HttpVarsPanelProps {
  /** Variables declared in the file: `{ name: defaultValue }`. */
  declared: Record<string, string>;
  /** Whether the panel is open. */
  open: boolean;
  /** Toggles the open state. */
  onToggle: () => void;
}

/**
 * Decides whether a variable should be rendered as a password field.
 * We err on the side of masking anything obviously sensitive — values can
 * still be revealed by the browser's autofill UI if the user wants.
 */
function isSecretLike(name: string): boolean {
  const lower = name.toLowerCase();

  return (
    lower.includes("token") ||
    lower.includes("secret") ||
    lower.includes("password") ||
    lower.includes("apikey") ||
    lower.includes("api_key") ||
    lower === "key"
  );
}

export function HttpVarsPanel({ declared, open, onToggle }: HttpVarsPanelProps) {
  const { t } = useLanguage();
  const {
    activeEnv,
    envNames,
    overrides,
    setActiveEnv,
    setOverride,
    addEnvironment,
    removeEnvironment,
    clearActiveEnv,
  } = useHttpVars();

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  const declaredNames = Object.keys(declared).sort();
  const overrideOnlyNames = Object.keys(overrides)
    .filter((n) => !(n in declared))
    .sort();
  const allNames = [...declaredNames, ...overrideOnlyNames];

  const handleAddSubmit = () => {
    if (newName.trim()) {
      addEnvironment(newName.trim());
    }

    setNewName("");
    setAdding(false);
  };

  return (
    <div className="border-b">
      <button
        type="button"
        onClick={onToggle}
        className="text-muted-foreground hover:bg-muted/50 flex w-full items-center gap-1.5 px-4 py-2 text-left text-xs font-medium"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <Variable className="h-3 w-3" />
        <span className="text-foreground">{t.varsTitle}</span>
        <span className="text-muted-foreground">
          ({allNames.length}
          {Object.keys(overrides).length > 0 && (
            <span className="text-primary ml-1">
              · {Object.keys(overrides).length} {t.varsOverrideShort}
            </span>
          )}
          )
        </span>
        <span className="ml-auto flex items-center gap-1">
          <Settings2 className="h-3 w-3" />
          <span className="text-foreground font-mono">{activeEnv}</span>
        </span>
      </button>

      {open && (
        <div className="bg-muted/20 flex flex-col gap-3 px-4 py-3">
          {/* Environment switcher */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="http-vars-env-select"
              className="text-muted-foreground shrink-0 text-xs"
            >
              {t.varsEnvironment}
            </label>
            <select
              id="http-vars-env-select"
              value={activeEnv}
              onChange={(e) => setActiveEnv(e.target.value)}
              className="border-input bg-background h-7 min-w-0 flex-1 rounded-md border px-2 text-xs"
            >
              {envNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>

            {!adding && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setAdding(true)}
                title={t.varsAddEnvironment}
              >
                <Plus className="h-3 w-3" />
              </Button>
            )}

            {activeEnv !== DEFAULT_ENVIRONMENT && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive h-7 px-2 text-xs"
                onClick={() => removeEnvironment(activeEnv)}
                title={t.varsRemoveEnvironment}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>

          {adding && (
            <div className="flex items-center gap-2">
              <Input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSubmit();
                  } else if (e.key === "Escape") {
                    setAdding(false);
                    setNewName("");
                  }
                }}
                placeholder={t.varsNewEnvironmentPlaceholder}
                className="h-7 flex-1 text-xs"
              />
              <Button size="sm" className="h-7 px-2 text-xs" onClick={handleAddSubmit}>
                {t.varsAdd}
              </Button>
            </div>
          )}

          {/* Variable rows */}
          {allNames.length === 0 ? (
            <p className="text-muted-foreground py-2 text-center text-xs italic">
              {t.varsNoVariables}
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {allNames.map((name) => {
                const defaultValue = declared[name] ?? "";
                const overrideValue = overrides[name];
                const isOverridden = overrideValue !== undefined;
                const displayValue = isOverridden ? overrideValue : "";
                const placeholder = defaultValue || t.varsPlaceholderEmpty;
                const isSecret = isSecretLike(name);

                return (
                  <div key={name} className="flex items-center gap-2">
                    <label
                      htmlFor={`var-${name}`}
                      className={cn(
                        "w-32 shrink-0 truncate font-mono text-xs",
                        isOverridden ? "text-primary font-semibold" : "text-foreground",
                      )}
                      title={name}
                    >
                      {name}
                    </label>
                    <Input
                      id={`var-${name}`}
                      type={isSecret ? "password" : "text"}
                      value={displayValue}
                      onChange={(e) => setOverride(name, e.target.value)}
                      placeholder={placeholder}
                      autoComplete="off"
                      className="h-7 min-w-0 flex-1 font-mono text-xs"
                    />
                    {isOverridden && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-foreground h-7 w-7 shrink-0 p-0"
                        onClick={() => setOverride(name, "")}
                        title={t.varsResetToDefault}
                        aria-label={t.varsResetToDefault}
                      >
                        <Eraser className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {Object.keys(overrides).length > 0 && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground h-6 px-2 text-xs"
                onClick={clearActiveEnv}
              >
                <Eraser className="mr-1 h-3 w-3" />
                {t.varsClearAll}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
