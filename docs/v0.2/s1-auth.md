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
- Device-independent password recovery using the server-side `/auth/confirm`
  route and Supabase's one-time token hash verification.
- Explicit sign-out control and authenticated account indicator.
- Public auth pages separated from the protected workspace route group.

## Security decisions

- The browser only receives the Supabase publishable key.
- No secret or service-role key is used by the application.
- Redirect destinations are constrained to internal application paths.
- Authentication errors avoid disclosing whether an account exists.
- Every protected render calls `auth.getUser()` on the server.
- Recovery tokens are verified on the server and are never written to logs.

## Required Supabase recovery email template

The Reset Password template must link to the server confirmation route:

```html
<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery">设置新密码</a>
```

The application supplies `/auth/confirm?next=/auth/update-password` as
`RedirectTo`. This avoids browser-fragment and same-device PKCE dependencies.

## Acceptance evidence

- A real email confirmation completed against the configured Supabase project.
- Custom SMTP delivered a recovery email and the server-side token-hash route
  established a valid recovery session.
- A different compliant password was saved successfully and used to complete
  the recovery flow.
- Public Supabase variables are configured in Vercel Preview.
