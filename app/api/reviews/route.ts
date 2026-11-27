import { connection } from "next/server";
import { addReview, getReviews, isRateLimited, validateReview } from "@/lib/reviews";

export async function GET() {
  try {
    // Reviews are live data — opt out of build-time prerendering.
    await connection();
    return Response.json(await getReviews(), {
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
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) {
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

    const forwarded = request.headers.get("x-forwarded-for") ?? "";
    const identifier = forwarded.split(",")[0]?.trim() || "local";
    if (isRateLimited(identifier)) {
      return Response.json(
        { error: "Wanditse byinshi vuba. Ugerageze mu minota mike." },
        { status: 429 },
      );
    }

    const review = await addReview(validated.value);
    return Response.json({ review }, { status: 201 });
  } catch (error) {
    console.error("POST /api/reviews failed", error);
    return Response.json(
      { error: "Ntibyashobokaga kubika igitekerezo cyawe. Ugerageze nanone." },
      { status: 500 },
    );
  }
}
