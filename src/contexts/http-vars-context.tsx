"use client";

/**
 * Stores user-provided values for `.http` file variables (e.g. `baseUrl`,
 * `token`) — separate from the read-only HTTP preview. Values are scoped to
 * a named *environment* (default / dev / staging / prod / …) so the same
 * spec can be tried against several backends without re-typing values.
 *
 * Persisted to localStorage so values survive a refresh.
 */

import { createContext, use, useCallback, useEffect, useMemo, useState } from "react";
import { getStorageItem, setStorageItem, STORAGE_KEYS } from "@/services/local-storage.service";

/** Default starter set of environments shown in the picker. */
export const DEFAULT_ENVIRONMENT = "default";
const STARTER_ENVIRONMENTS = [DEFAULT_ENVIRONMENT, "dev", "staging", "prod"] as const;

interface HttpVarsState {
  /** Currently active environment name. */
  activeEnv: string;
  /** Variable overrides per environment: `{ [envName]: { [varName]: value } }`. */
  envs: Record<string, Record<string, string>>;
}

const INITIAL_STATE: HttpVarsState = {
  activeEnv: DEFAULT_ENVIRONMENT,
  envs: Object.fromEntries(STARTER_ENVIRONMENTS.map((e) => [e, {}])),
};

interface HttpVarsContextValue {
  /** Active environment name. */
  activeEnv: string;
  /** All known environment names, sorted. */
  envNames: string[];
  /** Variable overrides for the active environment. */
  overrides: Record<string, string>;
  /** Switch to a different environment (creating it if needed). */
  setActiveEnv: (name: string) => void;
  /** Set or clear a single variable in the active environment. Empty string clears. */
  setOverride: (name: string, value: string) => void;
  /** Adds a new (initially empty) environment and switches to it. */
  addEnvironment: (name: string) => void;
  /** Removes an environment. The default environment cannot be removed. */
  removeEnvironment: (name: string) => void;
  /** Clears all overrides for the active environment. */
  clearActiveEnv: () => void;
}

const HttpVarsContext = createContext<HttpVarsContextValue | null>(null);

/** Hydrates state from localStorage, defending against malformed values. */
function loadInitialState(): HttpVarsState {
  const stored = getStorageItem<HttpVarsState | null>(STORAGE_KEYS.HTTP_VARS, null);

  if (!stored || typeof stored !== "object" || !stored.envs) {
    return INITIAL_STATE;
  }

  // Ensure the active env always exists in the envs map.
  const envs = { ...stored.envs };

  if (!envs[stored.activeEnv]) {
    envs[stored.activeEnv] = {};
  }

  // Always keep the default env present.
  if (!envs[DEFAULT_ENVIRONMENT]) {
    envs[DEFAULT_ENVIRONMENT] = {};
  }

  return { activeEnv: stored.activeEnv ?? DEFAULT_ENVIRONMENT, envs };
}

export function HttpVarsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<HttpVarsState>(INITIAL_STATE);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage after mount to keep SSR output stable.
  useEffect(() => {
    setState(loadInitialState());
    setHydrated(true);
  }, []);

  // Persist on change (skip the first hydration tick to avoid wiping stored state).
  useEffect(() => {
    if (!hydrated) {
      return;
    }

    setStorageItem(STORAGE_KEYS.HTTP_VARS, state);
  }, [state, hydrated]);

  const setActiveEnv = useCallback((name: string) => {
    setState((prev) => {
      const envs = prev.envs[name] ? prev.envs : { ...prev.envs, [name]: {} };

      return { ...prev, activeEnv: name, envs };
    });
  }, []);

  const setOverride = useCallback((name: string, value: string) => {
    setState((prev) => {
      const current = prev.envs[prev.activeEnv] ?? {};
      const next = { ...current };

      if (value === "") {
        delete next[name];
      } else {
        next[name] = value;
      }

      return {
        ...prev,
        envs: { ...prev.envs, [prev.activeEnv]: next },
      };
    });
  }, []);

  const addEnvironment = useCallback((name: string) => {
    const trimmed = name.trim();

    if (!trimmed) {
      return;
    }

    setState((prev) => {
      if (prev.envs[trimmed]) {
        return { ...prev, activeEnv: trimmed };
      }

      return {
        activeEnv: trimmed,
        envs: { ...prev.envs, [trimmed]: {} },
      };
    });
  }, []);

  const removeEnvironment = useCallback((name: string) => {
    if (name === DEFAULT_ENVIRONMENT) {
      return;
    }

    setState((prev) => {
      if (!prev.envs[name]) {
        return prev;
      }

      const envs = { ...prev.envs };
      delete envs[name];

      return {
        activeEnv: prev.activeEnv === name ? DEFAULT_ENVIRONMENT : prev.activeEnv,
        envs,
      };
    });
  }, []);

  const clearActiveEnv = useCallback(() => {
    setState((prev) => ({
      ...prev,
      envs: { ...prev.envs, [prev.activeEnv]: {} },
    }));
  }, []);

  const value = useMemo<HttpVarsContextValue>(
    () => ({
      activeEnv: state.activeEnv,
      envNames: Object.keys(state.envs).sort(),
      overrides: state.envs[state.activeEnv] ?? {},
      setActiveEnv,
      setOverride,
      addEnvironment,
      removeEnvironment,
      clearActiveEnv,
    }),
    [state, setActiveEnv, setOverride, addEnvironment, removeEnvironment, clearActiveEnv],
  );

  return <HttpVarsContext value={value}>{children}</HttpVarsContext>;
}

export function useHttpVars(): HttpVarsContextValue {
  const ctx = use(HttpVarsContext);

  if (!ctx) {
    throw new Error("useHttpVars must be used within an HttpVarsProvider");
  }

  return ctx;
}
