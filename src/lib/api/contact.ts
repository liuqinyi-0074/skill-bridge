import { postJSON } from "./apiClient";
import type { FeedbackReq, FeedbackRes } from "../../types/feedback";

/**
 * Send feedback to the backend and normalize heterogeneous responses.
 * This function converts `{ ok: true }` or `{ status: "ok" }`
 * to a single union: { status: "ok" | "error", ... }.
 */
export async function sendFeedback(body: FeedbackReq): Promise<FeedbackRes> {
  // Call the shared POST helper; response shape may vary across environments.
  const raw = await postJSON<FeedbackReq, unknown>("/api/contact", body);

  // Some backends reply with HTTP 204 (no content) or plain "OK".
  if (raw == null) {
    return { status: "ok", id: "" };
  }
  if (typeof raw === "string") {
    const normalized = raw.trim().toLowerCase();
    if (normalized === "" || normalized === "ok" || normalized === "success") {
      return { status: "ok", id: "" };
    }
  }

  // Defensive conversion to plain object.
  const obj =
    typeof raw === "object" && raw !== null
      ? (raw as Record<string, unknown>)
      : {};

  // Normalize `{ ok: true }`.
  if (obj.ok === true) {
    const id = typeof obj.id === "string" ? obj.id : "";
    return { status: "ok", id };
  }

  // Normalize `{ status: "ok" }`.
  if (obj.status === "ok") {
    const id = typeof obj.id === "string" ? obj.id : "";
    return { status: "ok", id };
  }

  // Everything else → error. Prefer server-provided message if present.
  const message =
    typeof obj.message === "string"
      ? obj.message
      : "Unexpected response from server.";
  return { status: "error", message };
}
