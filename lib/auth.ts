// A single passcode protects the whole book. After signing in, the phone keeps
// a signed cookie for 180 days so Mara isn't typing it on a job site.
export const COOKIE = "book_session";
export const MAX_AGE = 60 * 60 * 24 * 180;

export function authEnabled(): boolean {
  return Boolean(process.env.APP_PASSCODE);
}

async function hmac(message: string): Promise<string> {
  const secret = process.env.SESSION_SECRET || process.env.APP_PASSCODE || "";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sessionToken(): Promise<string> {
  // Changing the passcode changes the token, which signs everyone out.
  return hmac(`ok:${process.env.APP_PASSCODE}`);
}

export async function isValidSession(token: string | undefined): Promise<boolean> {
  if (!authEnabled()) return true;
  if (!token) return false;
  const expected = await sessionToken();
  if (token.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
