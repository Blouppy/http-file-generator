"use client";

/**
 * Shared state for the in-app HTTP request runner. Lifting send / response
 * state into a context lets both the HTTP preview pane (which renders the
 * Response panel) and individual `EndpointItem`s (which expose a per-row
 * Send button) trigger requests against the same response surface.
 *
 * Concretely: clicking Send on a row in the endpoint tree generates the
 * `.http` content for that single endpoint, parses it, and runs the
 * resulting request — populating the same Response panel that the right-
 * hand preview uses.
 */

import { createContext, use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { generateHttpFileContent } from "@/lib/generate-http";
import { parseHttpContent } from "@/lib/parse-http-content";
import {
  isAbortError,
  isLikelyCorsError,
  sendHttpRequest,
  type HttpResponseResult,
} from "@/services/http-request.service";
import type { ParsedEndpoint, ParsedSpec } from "@/types/openapi";
import { useHttpVars } from "@/contexts/http-vars-context";
import { useLanguage } from "@/contexts/language-context";

interface HttpSenderContextValue {
  /** Whether a request is currently in-flight. */
  loading: boolean;
  /** Last response (success). `null` until the first send. */
  response: HttpResponseResult | null;
  /** Last error message (failure / cancellation). `null` when none. */
  error: string | null;
  /** Whether the last error is consistent with a browser CORS rejection. */
  errorIsCors: boolean;
  /** Whether the response panel is open / visible. */
  isOpen: boolean;
  /** True after at least one send (success or failure). Controls Resend visibility. */
  hasSent: boolean;
  /** Send the given .http content as a single request (parses + executes). */
  sendContent: (content: string) => void;
  /** Convenience: generate .http content for one endpoint and send it. */
  sendEndpoint: (spec: ParsedSpec, endpoint: ParsedEndpoint) => void;
  /** Cancel any in-flight request. */
  cancel: () => void;
  /** Close the response panel and discard the displayed result. */
  close: () => void;
}

const HttpSenderContext = createContext<HttpSenderContextValue | null>(null);

export function HttpSenderProvider({ children }: { children: React.ReactNode }) {
  const { overrides, useProxy } = useHttpVars();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<HttpResponseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorIsCors, setErrorIsCors] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hasSent, setHasSent] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const sendContent = useCallback(
    (content: string) => {
      const { requests } = parseHttpContent(content, { overrides });

      if (requests.length === 0) {
        return;
      }

      // Cancel any in-flight request before starting a new one.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setIsOpen(true);
      setResponse(null);
      setError(null);
      setErrorIsCors(false);
      setHasSent(true);

      void (async () => {
        try {
          const result = await sendHttpRequest(requests[0], {
            signal: controller.signal,
            useProxy,
          });

          setResponse(result);
        } catch (err) {
          if (isAbortError(err)) {
            setError(t.responseCancelled);
            setErrorIsCors(false);
          } else {
            const message = err instanceof Error ? err.message : String(err);

            setError(message);
            setErrorIsCors(isLikelyCorsError(err));
          }
        } finally {
          if (abortRef.current === controller) {
            abortRef.current = null;
          }

          setLoading(false);
        }
      })();
    },
    [overrides, useProxy, t.responseCancelled],
  );

  const sendEndpoint = useCallback(
    (spec: ParsedSpec, endpoint: ParsedEndpoint) => {
      const content = generateHttpFileContent(spec, [endpoint]);

      sendContent(content);
    },
    [sendContent],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const close = useCallback(() => {
    abortRef.current?.abort();
    setIsOpen(false);
    setResponse(null);
    setError(null);
    setErrorIsCors(false);
  }, []);

  // Cancel any in-flight request on unmount.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const value = useMemo<HttpSenderContextValue>(
    () => ({
      loading,
      response,
      error,
      errorIsCors,
      isOpen,
      hasSent,
      sendContent,
      sendEndpoint,
      cancel,
      close,
    }),
    [
      loading,
      response,
      error,
      errorIsCors,
      isOpen,
      hasSent,
      sendContent,
      sendEndpoint,
      cancel,
      close,
    ],
  );

  return <HttpSenderContext value={value}>{children}</HttpSenderContext>;
}

export function useHttpSender(): HttpSenderContextValue {
  const ctx = use(HttpSenderContext);

  if (!ctx) {
    throw new Error("useHttpSender must be used within an HttpSenderProvider");
  }

  return ctx;
}
