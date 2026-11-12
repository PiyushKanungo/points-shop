import { NextResponse } from "next/server";

export type ErrorCode =
  | "VALIDATION"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INSUFFICIENT_POINTS"
  | "TASK_LIMIT_REACHED"
  | "INVALID_STATE"
  | "UNAVAILABLE"
  | "INTERNAL";

const STATUS: Record<ErrorCode, number> = {
  VALIDATION: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INSUFFICIENT_POINTS: 409,
  TASK_LIMIT_REACHED: 409,
  INVALID_STATE: 409,
  UNAVAILABLE: 503,
  INTERNAL: 500,
};

export const UNAVAILABLE_MESSAGE =
  "The shop's back office is taking a break. Try again in a few minutes.";

export class ShopError extends Error {
  readonly code: ErrorCode;
  readonly status: number;

  constructor(code: ErrorCode, message?: string) {
    super(message ?? (code === "UNAVAILABLE" ? UNAVAILABLE_MESSAGE : code));
    this.name = "ShopError";
    this.code = code;
    this.status = STATUS[code];
  }
}

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === "string" && value in STATUS;
}

export function statusFor(code: ErrorCode): number {
  return STATUS[code];
}

/** JSON error response for API routes. Unknown errors become 500 INTERNAL with a fixed message. */
export function errorResponse(error: unknown): NextResponse {
  if (error instanceof ShopError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }
  console.error("Unexpected error", error);
  return NextResponse.json(
    { error: { code: "INTERNAL", message: "Something went wrong." } },
    { status: 500 },
  );
}
