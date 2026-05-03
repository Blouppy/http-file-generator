"use client";

/**
 * Shared state for the in-app HTTP request runner. Lifting send / response
 * state into a context lets the HTTP preview pane (which renders the
 * Response panel) and the per-block "Send Request" buttons trigger requests
 * against the same response surface.
 */

import { createContext, use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { generateHttpFileContent } from "@/lib/generate-http";
import { parseHttpContent } from "@/lib/parse-http-content";
import {
  isAbortError,
  sendHttpRequest,
  type HttpResponseResult,
} from "@/services/http-request.service";
import type { ParsedEndpoint, ParsedSpec } from "@/types/openapi";
import { useLanguage } from "@/contexts/language-context";

interface HttpSenderContextValue {
  /** Whether a request is currently in-flight. */
  loading: boolean;
  /** Last response (success). `null` until the first send. */
  response: HttpResponseResult | null;
  /** Last error message (failure / cancellation). `null` when none. */
  error: string | null;
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
  const { t } = useLanguage();

  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<HttpResponseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [hasSent, setHasSent] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const sendContent = useCallback(
    (content: string) => {
      const { requests } = parseHttpContent(content);

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
      setHasSent(true);

      void (async () => {
        try {
          const result = await sendHttpRequest(requests[0], {
            signal: controller.signal,
          });

          setResponse(result);
        } catch (err) {
          if (isAbortError(err)) {
            setError(t.responseCancelled);
          } else {
            const message = err instanceof Error ? err.message : String(err);

            setError(message);
          }
        } finally {
          if (abortRef.current === controller) {
            abortRef.current = null;
          }

          setLoading(false);
        }
      })();
    },
    [t.responseCancelled],
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
      isOpen,
      hasSent,
      sendContent,
      sendEndpoint,
      cancel,
      close,
    }),
    [loading, response, error, isOpen, hasSent, sendContent, sendEndpoint, cancel, close],
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
