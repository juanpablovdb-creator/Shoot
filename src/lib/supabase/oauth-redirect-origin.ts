/**
 * Base URL for OAuth `redirectTo`. Must match an entry in Supabase
 * Authentication → URL Configuration → Redirect URLs (scheme, host, port).
 *
 * Always uses the page you are actually on. Do not point OAuth at another
 * origin (e.g. via env): the PKCE verifier is stored for this origin only, so
 * a mismatch breaks sign-in with "code verifier not found" errors.
 *
 * If you use `127.0.0.1` instead of `localhost` (or another port), add that
 * exact redirect URL in Supabase, e.g. `http://127.0.0.1:3001/auth/callback`.
 */
export function getOAuthRedirectOrigin(): string {
  if (typeof window === 'undefined') return ''
  return window.location.origin
}
