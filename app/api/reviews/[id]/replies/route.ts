import {
  addReply,
  isRateLimited,
  newOwnerToken,
  normalizeOwnerToken,
  validateReply,
} from "@/lib/reviews";
import {
  clientIdentifier,
  isSameOrigin,
  ownerTokenFrom,
  storeErrorResponse,
} from "@/lib/review-request";

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/reviews/[id]/replies">,
) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Icyifuzo ntikikwemewe." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body: unknown = await request.json().catch(() => null);

  // Same hidden honeypot as the main review form.
  if (
    body &&
    typeof body === "object" &&
    typeof (body as Record<string, unknown>).website === "string" &&
    ((body as Record<string, unknown>).website as string).trim() !== ""
  ) {
    return Response.json({ ignored: true }, { status: 201 });
  }

  const validated = validateReply(body);
  if (!validated.ok) {
    return Response.json({ error: validated.error }, { status: 400 });
  }

  if (isRateLimited(clientIdentifier(request))) {
    return Response.json(
      { error: "Wanditse byinshi vuba. Ugerageze mu minota mike." },
      { status: 429 },
    );
  }

  const token =
    ownerTokenFrom(request) ?? normalizeOwnerToken(newOwnerToken());
  try {
    const result = await addReply(id, validated.value, token);
    return Response.json(result, { status: 201 });
  } catch (error) {
    return storeErrorResponse(
      error,
      "Ntibyashobokaga kubika igisubizo. Ugerageze nanone.",
    );
  }
}
