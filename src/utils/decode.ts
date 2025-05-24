export function decodeJwt(token: string): Record<string, any> | null {
  try {
    const [, payloadBase64] = token.split(".");

    const padded = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");
    const jsonStr = decodeURIComponent(escape(atob(padded))); // <-- fix unicode
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to decode JWT:", e);
    return null;
  }
}

export function compareVersions(a: string, b: string): number {
  const aParts = a.split('.').map(Number);
  const bParts = b.split('.').map(Number);
  const maxLength = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < maxLength; i++) {
    const aVal = aParts[i] ?? 0;
    const bVal = bParts[i] ?? 0;
    if (aVal < bVal) {
      return -1;
    }
    if (aVal > bVal) {
      return 1;
    }
  }

  return 0; // Bằng nhau
}