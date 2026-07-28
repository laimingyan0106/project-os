export type ActionErrorCode =
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "NETWORK_ERROR"
  | "NOT_FOUND"
  | "UNKNOWN_ERROR";

export type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code: ActionErrorCode;
        message: string;
        details?: unknown;
      };
    };

export function actionError(
  code: ActionErrorCode,
  message: string,
  details?: unknown,
): ActionResult<never> {
  return { ok: false, error: { code, message, details } };
}
