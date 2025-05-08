export function decodeJwt(token: string): Record<string, any> | null {
  try {
    const [, payloadBase64] = token.split(".");

    const padded = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");
    const jsonStr = decodeURIComponent(escape(atob(padded))); // <-- fix unicode
    console.log("userId", JSON.parse(jsonStr)?.user_id);

    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to decode JWT:", e);
    return null;
  }
}
