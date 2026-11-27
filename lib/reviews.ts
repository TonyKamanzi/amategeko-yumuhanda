import { createHash, randomUUID } from "node:crypto";
import type { Review, ReviewInput, ReviewsResult } from "./review-types";

export type { Review, ReviewInput, ReviewsResult } from "./review-types";

type SupabaseRow = {
  id: string;
  name: string;
  rating: number;
  comment: string;
  created_at: string;
};

const TABLE = "reviews";
const LIST_LIMIT = 50;
const MAX_NAME_LENGTH = 40;
const MIN_COMMENT_LENGTH = 10;
const MAX_COMMENT_LENGTH = 500;
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 3;

const recentSubmissions = new Map<string, number[]>();

// Only used when Supabase env vars are absent in development, so the UI can be
// exercised locally. Production never falls back to this in-memory store.
const demoReviews: Review[] = [
  {
    id: "demo-1",
    name: "Uwimana",
    rating: 5,
    comment: "Ibibazo byarafashije cyane kwitegura ikizami. Ndagira inama buri wese.",
    createdAt: "2026-11-20T10:00:00.000Z",
  },
  {
    id: "demo-2",
    name: "Mugabo",
    rating: 4,
    comment: "Porogaramu nziza cyane, ariko nkunda ko yongerwamo ibibazo byinshi.",
    createdAt: "2026-11-18T14:30:00.000Z",
  },
];

function storageConfig() {
  const url = process.env.SUPABASE_URL;
  // New publishable keys are preferred; the legacy anon key still works.
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/+$/, ""), key };
}

function cleanText(value: string) {
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
}

function fromRow(row: SupabaseRow): Review {
  return {
    id: row.id,
    name: row.name,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.created_at,
  };
}

function summarize(reviews: Review[], total = reviews.length): ReviewsResult {
  const average = reviews.length
    ? Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length) * 10) / 10
    : 0;
  return { reviews, average, total };
}

export function validateReview(
  input: unknown,
): { ok: true; value: ReviewInput } | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Ibyinjizwa ntibyemewe." };
  }
  const data = input as Record<string, unknown>;
  const name = typeof data.name === "string" ? cleanText(data.name) : "";
  const comment = typeof data.comment === "string" ? cleanText(data.comment) : "";
  const rating =
    typeof data.rating === "number" ? data.rating : Number(data.rating);

  if (name.length < 1 || name.length > MAX_NAME_LENGTH) {
    return { ok: false, error: `Andika izina ryawe (inyuguti 1–${MAX_NAME_LENGTH}).` };
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: "Hitamo igipimo cy'inyenyeri kuva kuri 1 kugeza kuri 5." };
  }
  if (comment.length < MIN_COMMENT_LENGTH || comment.length > MAX_COMMENT_LENGTH) {
    return {
      ok: false,
      error: `Andika igitekerezo cy'inyuguti ${MIN_COMMENT_LENGTH}–${MAX_COMMENT_LENGTH}.`,
    };
  }
  return { ok: true, value: { name, rating, comment } };
}

/** Simple in-memory throttle. Serverless instances are isolated, so this is a
 *  soft control only; the honeypot and validation provide the main protection. */
export function isRateLimited(identifier: string): boolean {
  const key = createHash("sha256").update(identifier).digest("hex");
  const now = Date.now();
  const recent = (recentSubmissions.get(key) ?? []).filter(
    (timestamp) => now - timestamp < RATE_WINDOW_MS,
  );
  if (recent.length >= RATE_LIMIT) {
    recentSubmissions.set(key, recent);
    return true;
  }
  recent.push(now);
  recentSubmissions.set(key, recent);
  return false;
}

export async function getReviews(): Promise<ReviewsResult> {
  const config = storageConfig();
  if (!config) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Reviews storage is not configured");
    }
    return summarize(demoReviews);
  }

  const params =
    `select=id,name,rating,comment,created_at&order=created_at.desc&limit=${LIST_LIMIT}`;
  const response = await fetch(`${config.url}/rest/v1/${TABLE}?${params}`, {
    headers: {
      // New Supabase keys are not JWTs, so they belong only in `apikey`.
      apikey: config.key,
      Prefer: "count=exact",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Supabase read failed with status ${response.status}`);
  }

  const rows = (await response.json()) as SupabaseRow[];
  const headerTotal = Number(response.headers.get("content-range")?.split("/")[1]);
  const total = Number.isFinite(headerTotal) ? headerTotal : rows.length;
  return summarize(rows.map(fromRow), total);
}

export async function addReview(input: ReviewInput): Promise<Review> {
  const config = storageConfig();
  if (!config) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Reviews storage is not configured");
    }
    const review: Review = {
      id: randomUUID(),
      ...input,
      createdAt: new Date().toISOString(),
    };
    demoReviews.unshift(review);
    return review;
  }

  const response = await fetch(`${config.url}/rest/v1/${TABLE}`, {
    method: "POST",
    headers: {
      apikey: config.key,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(input),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Supabase write failed with status ${response.status}`);
  }

  const rows = (await response.json()) as SupabaseRow[];
  if (!rows[0]) throw new Error("Supabase did not return the inserted review");
  return fromRow(rows[0]);
}
