# S7 Hardening and Data Lifecycle

Status: Complete in code; migration and hosted destructive-action acceptance pending.

## Database prerequisite

Apply `supabase/migrations/20260731_006_data_lifecycle.sql` before testing the
new Settings controls. The migration adds two authenticated, confirmation-gated
functions:

- `delete_all_workspace_data`: transactionally deletes only the caller's
  business data and preserves the account/profile.
- `delete_own_account`: requires `DELETE` and a JWT issued within the previous
  five minutes, then deletes only `auth.uid()`.

The application obtains the recent token by verifying the current password
immediately before calling the account-deletion RPC.

## Acceptance

1. Edit display name and an HTTPS avatar URL.
2. Download `/api/export`; parse the JSON and verify all entity collections are
   present and belong to the current account.
3. Verify anonymous `/api/export` access is sent to Login.
4. Enter an incorrect delete-data confirmation and verify the destructive
   button remains disabled.
5. Use a disposable test account to execute `DELETE DATA`; verify the account
   remains usable and all workspace collections are empty.
6. Use a second disposable test account to verify a wrong password does not
   delete the account.
7. Enter the correct password and `DELETE`; verify the account and all rows are
   deleted and the browser returns to Login.
8. Verify dialogs trap focus, close with Esc, have labeled controls and remain
   usable at 360 px.
9. Verify the Workflow page shows the small-screen editing recommendation.
10. Verify CSP, frame, content-type, referrer, permissions and HSTS headers on
    the Vercel Preview.

Never test account deletion with the primary acceptance account before
exporting its data.
