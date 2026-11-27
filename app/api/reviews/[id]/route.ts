import { deleteReview, updateReview, validateReview } from "@/lib/reviews";
import {
  isSameOrigin,
  ownerTokenFrom,
  storeErrorResponse,
} from "@/lib/review-request";

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/reviews/[id]">,
) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Icyifuzo ntikikwemewe." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body: unknown = await request.json().catch(() => null);
  const validated = validateReview(body);
  if (!validated.ok) {
    return Response.json({ error: validated.error }, { status: 400 });
  }

  const token = ownerTokenFrom(request);
  if (!token) {
    return Response.json(
      { error: "Ugomba kuba winjiriye kugirango uhinde." },
      { status: 403 },
    );
  }

  try {
    const review = await updateReview(id, validated.value, token);
    return Response.json({ review });
  } catch (error) {
    return storeErrorResponse(
      error,
      "Ntibyashobokaga kubika impinduka. Ugerageze nanone.",
    );
  }
}

export async function DELETE(
  request: Request,
  ctx: RouteContext<"/api/reviews/[id]">,
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
    await deleteReview(id, token);
    return Response.json({ ok: true });
  } catch (error) {
    return storeErrorResponse(
      error,
      "Ntibyashobokaga kusiba igitekerezo. Ugerageze nanone.",
    );
  }
}
