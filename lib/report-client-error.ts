import { env } from "@/lib/config";

// Report only browser exceptions: never include the page query, form values,
// account identity, cookies or authentication headers.
export function reportClientError(error: Error): void {
  try {
    const redact = (value: string) => value
      .replace(/https?:\/\/[^\s)]+/gi, raw => {
        try { const url = new URL(raw); return `${url.origin}${url.pathname}`; } catch { return "[url]"; }
      })
      .replace(/\?[^\s)]+/g, "?[redacted]")
      .replace(/\b[^\s@]+@[^\s@]+\.[^\s@]+/g, "[email]")
      .replace(/\bBearer\s+\S+/gi, "[token]")
      .replace(/\b\d{6}\b/g, "[code]")
      .replace(/\b[a-zA-Z0-9_.-]{40,}\b/g, "[redacted]");
    void fetch(`${env.NEXT_PUBLIC_BASEURL.replace(/\/+$/, "")}/api/v1/client-errors`, {
      method: "POST",
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        name: redact(error.name || "Error").slice(0, 100),
        message: redact(error.message || "Unknown client error").slice(0, 1000),
        stack: redact(error.stack || "").slice(0, 4000),
        pathname: window.location.pathname.slice(0, 200),
      }),
    }).catch(() => {});
  } catch {
    // Reporting must never prevent the recovery screen from rendering.
  }
}
