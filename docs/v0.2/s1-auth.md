# S1 — Supabase authentication

Date: 2026-07-27

## Delivered

- Supabase SSR browser/server clients with cookie-backed sessions.
- Next.js 16 `proxy.ts` session refresh and anonymous-route redirects.
- Server layout authorization as the non-proxy security boundary.
- Email/password signup and login.
- Magic Link login for existing users.
- Password reset and password update flow.
- Universal email callback support for PKCE codes, token hashes, and default
  URL-fragment sessions.
- Device-independent password recovery using a one-time implicit recovery
  session that is immediately persisted to cookies and removed from the URL.
- Explicit sign-out control and authenticated account indicator.
- Public auth pages separated from the protected workspace route group.

## Security decisions

- The browser only receives the Supabase publishable key.
- No secret or service-role key is used by the application.
- Redirect destinations are constrained to internal application paths.
- Authentication errors avoid disclosing whether an account exists.
- Every protected render calls `auth.getUser()` on the server.

## Remaining acceptance

- Complete one real email-confirmation login and one password-reset login against
  the configured project.
- Add the public variables to Vercel Preview and verify the deployed callback.
