import { NextResponse } from "next/server";
import { ApiResponse, ApiErrorResponse } from "@/types";

export function success<T>(data: T, message?: string): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    ok: true,
    data,
    message,
  });
}

export function error(
  message: string,
  code?: string,
  details?: Record<string, unknown>,
  status = 500
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      ok: false,
      error: message,
      code,
      details,
    },
    { status }
  );
}

export function badRequest(
  message: string,
  details?: Record<string, unknown>
): NextResponse<ApiErrorResponse> {
  return error(message, "BAD_REQUEST", details, 400);
}

export function unauthorized(
  message = "Unauthorized"
): NextResponse<ApiErrorResponse> {
  return error(message, "UNAUTHORIZED", undefined, 401);
}

export function forbidden(
  message = "Forbidden"
): NextResponse<ApiErrorResponse> {
  return error(message, "FORBIDDEN", undefined, 403);
}

export function notFound(
  resource = "Resource"
): NextResponse<ApiErrorResponse> {
  return error(`${resource} not found`, "NOT_FOUND", undefined, 404);
}
