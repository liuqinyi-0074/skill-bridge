import * as Sentry from "@sentry/react";

/**
 * Initialize Sentry as early as possible.
 * DSN is from .env
 * Includes performance and replay integrations.
 */
export function initSentry(): void {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(), // collect route/HTTP spans + web-vitals
      Sentry.replayIntegration(),         // optional session replay
    ],
    tracesSampleRate: 0.2,                // 20% sampling for perf data
    replaysSessionSampleRate: 0.0,        // disable continuous replay
    replaysOnErrorSampleRate: 1.0,        // record only on error
    environment: import.meta.env.MODE,    // dev / production
    release: import.meta.env.VITE_RELEASE // e.g. skillbridge@1.0.0
  });
}
