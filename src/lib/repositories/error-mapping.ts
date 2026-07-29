export type RepositoryFailureKind =
  | "forbidden"
  | "conflict"
  | "validation"
  | "network"
  | "unknown";

export type RepositoryFailureDetails = {
  code?: string;
  message: string;
  name?: string;
};

export function getRepositoryFailureDetails(
  reason: unknown,
): RepositoryFailureDetails {
  if (reason && typeof reason === "object") {
    const candidate = reason as {
      code?: unknown;
      message?: unknown;
      name?: unknown;
    };
    return {
      code: typeof candidate.code === "string" ? candidate.code : undefined,
      message: typeof candidate.message === "string"
        ? candidate.message
        : "Unknown repository error",
      name: typeof candidate.name === "string" ? candidate.name : undefined,
    };
  }

  return {
    message: typeof reason === "string" ? reason : "Unknown repository error",
  };
}

export function classifyRepositoryFailure(
  reason: unknown,
): RepositoryFailureKind {
  const { code, message } = getRepositoryFailureDetails(reason);
  const normalizedCode = code?.toUpperCase();

  if (normalizedCode === "42501") return "forbidden";

  if (
    normalizedCode === "23505"
    || normalizedCode === "40001"
    || normalizedCode === "409"
    || /workflow version conflict|version conflict|stale version|could not serialize/i.test(
      message,
    )
  ) {
    return "conflict";
  }

  if (normalizedCode === "23503" || normalizedCode === "22023") {
    return "validation";
  }

  if (/fetch|network|failed to connect|connection refused/i.test(message)) {
    return "network";
  }

  return "unknown";
}
