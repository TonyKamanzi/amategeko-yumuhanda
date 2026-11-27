import {
  deleteReply,
  updateReply,
  validateReplyComment,
} from "@/lib/reviews";
import {
  isSameOrigin,
  ownerTokenFrom,
  storeErrorResponse,
} from "@/lib/review-request";

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/reviews/replies/[id]">,
) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Icyifuzo ntikikwemewe." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body: unknown = await request.json().catch(() => null);
  const comment =
    body && typeof body === "object"
      ? (body as Record<string, unknown>).comment
      : null;
  const error = validateReplyComment(comment);
  if (error) {
    return Response.json({ error }, { status: 400 });
  }

  const token = ownerTokenFrom(request);
  if (!token) {
    return Response.json(
      { error: "Ugomba kuba winjiriye kugirango uhinde." },
      { status: 403 },
    );
  }

  try {
    const reply = await updateReply(id, comment as string, token);
    return Response.json({ reply });
  } catch (caught) {
    return storeErrorResponse(
      caught,
      "Ntibyashobokaga kubika impinduka. Ugerageze nanone.",
    );
  }
}

export async function DELETE(
  request: Request,
  ctx: RouteContext<"/api/reviews/replies/[id]">,
) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Icyifuzo ntikikwemewe." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const token = ownerTokenFrom(request);
  if (!token) {
    return Response.json(
      { error: "Ugomba kuba winjiriye kugirango usibe." },
      { status: 403 },
    );
  }

  try {
    await deleteReply(id, token);
    return Response.json({ ok: true });
  } catch (error) {
    return storeErrorResponse(
      error,
      "Ntibyashobokaga kusiba igisubizo. Ugerageze nanone.",
    );
  }
}
