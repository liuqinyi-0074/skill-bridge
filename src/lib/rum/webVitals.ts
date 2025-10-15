import { onCLS, onINP, onLCP, onFCP, onTTFB } from "web-vitals";
import type {Metric} from "web-vitals";
/** Payload shape sent to the backend RUM endpoint */
type VitalPayload = {
  name: Metric["name"]; // Metric name, e.g., 'LCP', 'INP'
  id: string;           // Unique page-load id
  value: number;        // Metric value (ms for most, unitless for CLS)
  delta: number;        // Change since last report
  url: string;          // Full URL
  path: string;         // Pathname only
  ua: string;           // User agent (coarse device grouping)
  ts: number;           // Unix timestamp (ms)
  label: "web-vitals";  // Static label for filtering
};

/** Best-effort send. Uses sendBeacon if available, falls back to fetch */
function postMetric(payload: VitalPayload): void {
  const endpoint = `${import.meta.env.VITE_API_BASE}rum/vitals`;
  const body = JSON.stringify(payload);
  if ("sendBeacon" in navigator) {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon(endpoint, blob);
  } else {
    void fetch(endpoint, {
      method: "POST",
      keepalive: true, // allow send during page unload
      headers: { "Content-Type": "application/json" },
      body
    }).catch(() => { /* never break UX on metric failure */ });
  }
}

/** Optional sampler to reduce traffic, e.g., 20% sampling */
function shouldSample(sampleRate: number = 0.2): boolean {
  return Math.random() < sampleRate;
}

/** Unified reporter used by each metric hook */
function report(metric: Metric): void {
  if (!shouldSample()) return;
  const payload: VitalPayload = {
    name: metric.name,
    id: metric.id,
    value: metric.value,
    delta: metric.delta,
    url: location.href,
    path: location.pathname,
    ua: navigator.userAgent,
    ts: Date.now(),
    label: "web-vitals"
  };
  postMetric(payload);
}

/** Call once on app bootstrap to start listening to metrics */
export function initWebVitals(): void {
  onLCP(report);  // Largest Contentful Paint
  onINP(report);  // Interaction to Next Paint
  onCLS(report);  // Cumulative Layout Shift
  onFCP(report);  // First Contentful Paint
  onTTFB(report); // Time To First Byte
}
