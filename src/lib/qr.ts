/** Prefix embedded in the member QR payload, e.g. `GYMFLOW:GM1024`. */
export const QR_PREFIX = "GYMFLOW:";

/**
 * Accepts raw codes, `GYMFLOW:GM1024`, `GF:GM1024` or a deep link such as
 * `https://…/checkin?code=GM1024` and returns the normalised member code.
 */
export function parseScannedCode(input: string): string {
  const raw = input.trim();
  if (!raw) return "";
  const upper = raw.toUpperCase();
  if (upper.startsWith(QR_PREFIX)) return upper.slice(QR_PREFIX.length).trim();
  if (upper.startsWith("GF:")) return upper.slice(3).trim();
  if (upper.startsWith("HTTP")) {
    try {
      const url = new URL(raw);
      const code = url.searchParams.get("code") ?? url.pathname.split("/").filter(Boolean).pop() ?? "";
      return code.toUpperCase();
    } catch {
      return raw.toUpperCase();
    }
  }
  return upper;
}

/** Payload rendered into the QR image for a member/trainer code. */
export function qrPayload(code: string): string {
  return `${QR_PREFIX}${code.toUpperCase()}`;
}
