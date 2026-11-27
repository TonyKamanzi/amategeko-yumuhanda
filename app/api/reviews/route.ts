import { connection } from "next/server";
import {
  addReview,
  getReviews,
  isRateLimited,
  newOwnerToken,
  normalizeOwnerToken,
  validateReview,
} from "@/lib/reviews";
import {
  clientIdentifier,
  isSameOrigin,
  ownerTokenFrom,
  storeErrorResponse,
} from "@/lib/review-request";

export async function GET(request: Request) {
  try {
    // Reviews are live data — opt out of build-time prerendering.
    await connection();
    return Response.json(await getReviews(ownerTokenFrom(request)), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("GET /api/reviews failed", error);
    return Response.json(
      { error: "Ibyitekerezo ntibiboneka ubu. Ugerageze mu nyuma." },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  try {
    // Same-origin only: blocks cross-site form posts.
    if (!isSameOrigin(request)) {
      return Response.json({ error: "Icyifuzo ntikikwemewe." }, { status: 403 });
    }

    const body: unknown = await request.json().catch(() => null);

    // Honeypot: bots fill hidden fields, people never see them. Pretend success.
    if (
      body &&
      typeof body === "object" &&
      typeof (body as Record<string, unknown>).website === "string" &&
      ((body as Record<string, unknown>).website as string).trim() !== ""
    ) {
      return Response.json({ ignored: true }, { status: 201 });
    }

    const validated = validateReview(body);
    if (!validated.ok) {
      return Response.json({ error: validated.error }, { status: 400 });
    }

    if (isRateLimited(clientIdentifier(request))) {
      return Response.json(
        { error: "Wanditse byinshi vuba. Ugerageze mu minota mike." },
        { status: 429 },
      );
    }

    const suppliedToken =
      ownerTokenFrom(request) ?? normalizeOwnerToken(newOwnerToken());
    const result = await addReview(validated.value, suppliedToken);
    return Response.json(result, { status: 201 });
  } catch (error) {
    return storeErrorResponse(
      error,
      "Ntibyashobokaga kubika igitekerezo cyawe. Ugerageze nanone.",
    );
  }
}
