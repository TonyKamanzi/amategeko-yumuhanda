import { normalizeOwnerToken, StoreError } from "./reviews";

/** Cross-site form posts are blocked; same-origin browser requests are fine. */
export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export function ownerTokenFrom(request: Request) {
  return normalizeOwnerToken(request.headers.get("x-review-owner"));
}

export function clientIdentifier(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  return forwarded.split(",")[0]?.trim() || "local";
}

export function storeErrorResponse(error: unknown, fallback: string) {
  if (error instanceof StoreError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error("Reviews request failed", error);
  return Response.json({ error: fallback }, { status: 500 });
}
