import { createHash, randomUUID } from "node:crypto";
import type {
  Reply,
  ReplyInput,
  Review,
  ReviewInput,
  ReviewsResult,
} from "./review-types";

export type {
  Reply,
  ReplyInput,
  Review,
  ReviewInput,
  ReviewsResult,
} from "./review-types";

type StoredReply = Reply & { ownerHash?: string };
type StoredReview = Omit<Review, "replies"> & {
  ownerHash?: string;
  replies: StoredReply[];
};

type ReviewRow = {
  id: string;
  name: string;
  rating: number;
  comment: string;
  created_at: string;
  updated_at: string | null;
  owner_token: string | null;
};

type ReplyRow = {
  id: string;
  review_id: string;
  name: string;
  comment: string;
  created_at: string;
  updated_at: string | null;
  owner_token: string | null;
};

const REVIEWS_TABLE = "reviews";
const REPLIES_TABLE = "review_replies";
const LIST_LIMIT = 50;
const REPLY_LIMIT = 200;
const MAX_NAME_LENGTH = 40;
const MIN_COMMENT_LENGTH = 10;
const MAX_COMMENT_LENGTH = 500;
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 3;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OWNER_TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

const recentSubmissions = new Map<string, number[]>();

// Only used when Supabase env vars are absent in development, so the UI can be
// exercised locally. Production never falls back to this in-memory store.
const demoReviews: StoredReview[] = [
  {
    id: "demo-1",
    name: "Uwimana",
    rating: 5,
    comment: "Ibibazo byarafashije cyane kwitegura ikizami. Ndagira inama buri wese.",
    createdAt: "2026-11-20T10:00:00.000Z",
    updatedAt: "2026-11-20T10:00:00.000Z",
    owned: false,
    replies: [],
  },
  {
    id: "demo-2",
    name: "Mugabo",
    rating: 4,
    comment: "Porogaramu nziza cyane, ariko nkunda ko yongerwamo ibibazo byinshi.",
    createdAt: "2026-11-18T14:30:00.000Z",
    updatedAt: "2026-11-18T14:30:00.000Z",
    owned: false,
    replies: [],
  },
];
const demoReplies = new Map<string, StoredReply[]>();

export class StoreError extends Error {
  readonly status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

function storageConfig() {
  // Accept both the names used in Supabase's Connect dialog and the shorter
  // server-only names from the setup guide.
  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  // New publishable keys are preferred; the legacy anon key still works.
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/+$/, ""), key };
}

function cleanText(value: string) {
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function normalizeOwnerToken(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const token = value.trim();
  return OWNER_TOKEN_PATTERN.test(token) ? token : null;
}

export function newOwnerToken() {
  return randomUUID();
}

export function isValidId(value: string) {
  return UUID_PATTERN.test(value);
}

function ownerHeaders(token?: string | null): Record<string, string> {
  const normalized = normalizeOwnerToken(token);
  return normalized ? { "x-review-owner": normalized } : {};
}

function publicReply(reply: StoredReply): Reply {
  return {
    id: reply.id,
    reviewId: reply.reviewId,
    name: reply.name,
    comment: reply.comment,
    createdAt: reply.createdAt,
    updatedAt: reply.updatedAt,
    owned: reply.owned,
  };
}

function publicReview(review: StoredReview): Review {
  return {
    id: review.id,
    name: review.name,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
    owned: review.owned,
    replies: review.replies.map(publicReply),
  };
}

function withOwnership<T extends StoredReply>(reply: T, token?: string | null): T;
function withOwnership<T extends StoredReview>(review: T, token?: string | null): T;
function withOwnership(
  item: StoredReview | StoredReply,
  token?: string | null,
): StoredReview | StoredReply {
  const hash = normalizeOwnerToken(token) ? hashToken(token!) : null;
  const owned = Boolean(hash && item.ownerHash === hash);
  if ("replies" in item) {
    return {
      ...item,
      owned,
      replies: item.replies.map((reply) => withOwnership(reply, token)),
    };
  }
  return { ...item, owned };
}

function fromReplyRow(row: ReplyRow, token?: string | null): StoredReply {
  return withOwnership(
    {
      id: row.id,
      reviewId: row.review_id,
      name: row.name,
      comment: row.comment,
      createdAt: row.created_at,
      updatedAt: row.updated_at ?? row.created_at,
      ownerHash: row.owner_token ?? undefined,
      owned: false,
    },
    token,
  ) as StoredReply;
}

function fromReviewRow(row: ReviewRow, token?: string | null): StoredReview {
  return withOwnership(
    {
      id: row.id,
      name: row.name,
      rating: row.rating,
      comment: row.comment,
      createdAt: row.created_at,
      updatedAt: row.updated_at ?? row.created_at,
      ownerHash: row.owner_token ?? undefined,
      owned: false,
      replies: [],
    },
    token,
  ) as StoredReview;
}

function summarize(reviews: Review[], total = reviews.length): ReviewsResult {
  const average = reviews.length
    ? Math.round(
        (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length) * 10,
      ) / 10
    : 0;
  return { reviews, average, total };
}

function validateName(value: unknown): string | null {
  const name = typeof value === "string" ? cleanText(value) : "";
  if (name.length < 1 || name.length > MAX_NAME_LENGTH) {
    return `Andika izina ryawe (inyuguti 1–${MAX_NAME_LENGTH}).`;
  }
  return name;
}

function validateComment(value: unknown): string | null {
  const comment = typeof value === "string" ? cleanText(value) : "";
  if (comment.length < MIN_COMMENT_LENGTH || comment.length > MAX_COMMENT_LENGTH) {
    return `Andika igitekerezo cy'inyuguti ${MIN_COMMENT_LENGTH}–${MAX_COMMENT_LENGTH}.`;
  }
  return comment;
}

export function validateReview(
  input: unknown,
): { ok: true; value: ReviewInput } | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Ibyinjizwa ntibyemewe." };
  }
  const data = input as Record<string, unknown>;
  const nameError = validateName(data.name);
  if (nameError) return { ok: false, error: nameError };

  const rating =
    typeof data.rating === "number" ? data.rating : Number(data.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: "Hitamo igipimo cy'inyenyeri kuva kuri 1 kugeza kuri 5." };
  }

  const commentError = validateComment(data.comment);
  if (commentError) return { ok: false, error: commentError };

  return {
    ok: true,
    value: { name: nameError as string, rating, comment: commentError as string },
  };
}

/** Used when editing an existing reply, where the name does not change. */
export function validateReplyComment(value: unknown): string | null {
  return validateComment(value);
}

export function validateReply(
  input: unknown,
): { ok: true; value: ReplyInput } | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Ibyinjizwa ntibyemewe." };
  }
  const data = input as Record<string, unknown>;
  const nameError = validateName(data.name);
  if (nameError) return { ok: false, error: nameError };
  const commentError = validateComment(data.comment);
  if (commentError) return { ok: false, error: commentError };
  return {
    ok: true,
    value: { name: nameError as string, comment: commentError as string },
  };
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

export async function getReviews(token?: string | null): Promise<ReviewsResult> {
  const config = storageConfig();
  if (!config) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Reviews storage is not configured");
    }
    return summarize(
      demoReviews.map((review) => publicReview(withOwnership(review, token) as StoredReview)),
    );
  }

  const reviewParams =
    `select=id,name,rating,comment,created_at,updated_at,owner_token` +
    `&order=created_at.desc&limit=${LIST_LIMIT}`;
  const response = await fetch(
    `${config.url}/rest/v1/${REVIEWS_TABLE}?${reviewParams}`,
    {
      headers: {
        // New Supabase keys are not JWTs, so they belong only in `apikey`.
        apikey: config.key,
        Prefer: "count=exact",
        ...ownerHeaders(token),
      },
      cache: "no-store",
    },
  );
  if (!response.ok) {
    throw new Error(`Supabase read failed with status ${response.status}`);
  }

  const rows = (await response.json()) as ReviewRow[];
  const headerTotal = Number(response.headers.get("content-range")?.split("/")[1]);
  const total = Number.isFinite(headerTotal) ? headerTotal : rows.length;
  const reviews = rows.map((row) => fromReviewRow(row, token));

  if (reviews.length > 0) {
    const ids = reviews.map((review) => review.id).join(",");
    const replyParams =
      `select=id,review_id,name,comment,created_at,updated_at,owner_token` +
      `&review_id=in.(${ids})&order=created_at.asc&limit=${REPLY_LIMIT}`;
    const replyResponse = await fetch(
      `${config.url}/rest/v1/${REPLIES_TABLE}?${replyParams}`,
      {
        headers: { apikey: config.key, ...ownerHeaders(token) },
        cache: "no-store",
      },
    );
    if (!replyResponse.ok) {
      throw new Error(`Supabase replies read failed with status ${replyResponse.status}`);
    }
    const replyRows = (await replyResponse.json()) as ReplyRow[];
    const repliesByReview = new Map<string, StoredReply[]>();
    for (const row of replyRows) {
      const list = repliesByReview.get(row.review_id) ?? [];
      list.push(fromReplyRow(row, token));
      repliesByReview.set(row.review_id, list);
    }
    for (const review of reviews) {
      review.replies = repliesByReview.get(review.id) ?? [];
    }
  }

  return summarize(reviews.map(publicReview), total);
}

export async function addReview(
  input: ReviewInput,
  suppliedToken?: string | null,
): Promise<{ review: Review; ownerToken: string }> {
  const token = normalizeOwnerToken(suppliedToken) ?? newOwnerToken();
  const ownerHash = hashToken(token);
  const now = new Date().toISOString();
  const config = storageConfig();

  if (!config) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Reviews storage is not configured");
    }
    const stored: StoredReview = {
      id: randomUUID(),
      ...input,
      createdAt: now,
      updatedAt: now,
      ownerHash,
      owned: true,
      replies: [],
    };
    demoReviews.unshift(stored);
    return { review: publicReview(stored), ownerToken: token };
  }

  const response = await fetch(`${config.url}/rest/v1/${REVIEWS_TABLE}`, {
    method: "POST",
    headers: {
      apikey: config.key,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...ownerHeaders(token),
    },
    body: JSON.stringify({ ...input, owner_token: ownerHash }),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Supabase write failed with status ${response.status}`);
  }

  const rows = (await response.json()) as ReviewRow[];
  if (!rows[0]) throw new Error("Supabase did not return the inserted review");
  return {
    review: publicReview(fromReviewRow(rows[0], token)),
    ownerToken: token,
  };
}

export async function updateReview(
  id: string,
  input: ReviewInput,
  token?: string | null,
): Promise<Review> {
  const normalized = normalizeOwnerToken(token);
  if (!isValidId(id)) throw new StoreError("Icyifuzo ntikikwemewe.", 400);
  if (!normalized) throw new StoreError("Ugomba kuba winjiriye kugirango uhinde.", 403);

  const config = storageConfig();
  if (!config) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Reviews storage is not configured");
    }
    const stored = demoReviews.find((review) => review.id === id);
    if (!stored) throw new StoreError("Igitekerezo ntikiboneka.", 404);
    if (stored.ownerHash !== hashToken(normalized)) {
      throw new StoreError("Uteshwa kubihindura.", 403);
    }
    Object.assign(stored, input, { updatedAt: new Date().toISOString() });
    return publicReview(withOwnership(stored, normalized) as StoredReview);
  }

  const response = await fetch(
    `${config.url}/rest/v1/${REVIEWS_TABLE}?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: {
        apikey: config.key,
        "Content-Type": "application/json",
        Prefer: "return=representation",
        ...ownerHeaders(normalized),
      },
      body: JSON.stringify({ ...input, updated_at: new Date().toISOString() }),
      cache: "no-store",
    },
  );
  if (!response.ok) {
    throw new Error(`Supabase update failed with status ${response.status}`);
  }
  const rows = (await response.json()) as ReviewRow[];
  if (!rows[0]) throw new StoreError("Uteshwa kubihindura.", 403);
  return publicReview(fromReviewRow(rows[0], normalized));
}

export async function deleteReview(id: string, token?: string | null): Promise<void> {
  const normalized = normalizeOwnerToken(token);
  if (!isValidId(id)) throw new StoreError("Icyifuzo ntikikwemewe.", 400);
  if (!normalized) throw new StoreError("Ugomba kuba winjiriye kugirango usibe.", 403);

  const config = storageConfig();
  if (!config) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Reviews storage is not configured");
    }
    const index = demoReviews.findIndex((review) => review.id === id);
    if (index < 0) throw new StoreError("Igitekerezo ntikiboneka.", 404);
    if (demoReviews[index].ownerHash !== hashToken(normalized)) {
      throw new StoreError("Uteshwa kusiba.", 403);
    }
    demoReviews.splice(index, 1);
    demoReplies.delete(id);
    return;
  }

  const response = await fetch(
    `${config.url}/rest/v1/${REVIEWS_TABLE}?id=eq.${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      headers: {
        apikey: config.key,
        Prefer: "return=representation",
        ...ownerHeaders(normalized),
      },
      cache: "no-store",
    },
  );
  if (!response.ok) {
    throw new Error(`Supabase delete failed with status ${response.status}`);
  }
  const rows = (await response.json()) as ReviewRow[];
  if (!rows.length) throw new StoreError("Uteshwa kusiba.", 403);
}

export async function addReply(
  reviewId: string,
  input: ReplyInput,
  suppliedToken?: string | null,
): Promise<{ reply: Reply; ownerToken: string }> {
  const token = normalizeOwnerToken(suppliedToken) ?? newOwnerToken();
  const ownerHash = hashToken(token);
  const now = new Date().toISOString();
  const config = storageConfig();

  if (!config) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Reviews storage is not configured");
    }
    if (!demoReviews.some((review) => review.id === reviewId)) {
      throw new StoreError("Igitekerezo ntikiboneka.", 404);
    }
    const stored: StoredReply = {
      id: randomUUID(),
      reviewId,
      ...input,
      createdAt: now,
      updatedAt: now,
      ownerHash,
      owned: true,
    };
    const list = demoReplies.get(reviewId) ?? [];
    list.push(stored);
    demoReplies.set(reviewId, list);
    demoReviews.find((review) => review.id === reviewId)?.replies.push(stored);
    return { reply: publicReply(stored), ownerToken: token };
  }

  const response = await fetch(`${config.url}/rest/v1/${REPLIES_TABLE}`, {
    method: "POST",
    headers: {
      apikey: config.key,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...ownerHeaders(token),
    },
    body: JSON.stringify({ review_id: reviewId, ...input, owner_token: ownerHash }),
    cache: "no-store",
  });
  if (!response.ok) {
    // A missing review is a foreign-key violation in Supabase.
    if (response.status === 409) throw new StoreError("Igitekerezo ntikiboneka.", 404);
    throw new Error(`Supabase reply failed with status ${response.status}`);
  }
  const rows = (await response.json()) as ReplyRow[];
  if (!rows[0]) throw new Error("Supabase did not return the inserted reply");
  return { reply: publicReply(fromReplyRow(rows[0], token)), ownerToken: token };
}

export async function updateReply(
  id: string,
  comment: string,
  token?: string | null,
): Promise<Reply> {
  const normalized = normalizeOwnerToken(token);
  if (!isValidId(id)) throw new StoreError("Icyifuzo ntikikwemewe.", 400);
  if (!normalized) throw new StoreError("Ugomba kuba winjiriye kugirango uhinde.", 403);
  const validated = validateComment(comment);
  if (validated === null) throw new StoreError("Andika igitekerezo kigufi.", 400);

  const config = storageConfig();
  if (!config) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Reviews storage is not configured");
    }
    for (const list of demoReplies.values()) {
      const stored = list.find((reply) => reply.id === id);
      if (!stored) continue;
      if (stored.ownerHash !== hashToken(normalized)) {
        throw new StoreError("Uteshwa kubihindura.", 403);
      }
      stored.comment = validated;
      stored.updatedAt = new Date().toISOString();
      return publicReply(withOwnership(stored, normalized) as StoredReply);
    }
    throw new StoreError("Igisubizo ntikiboneka.", 404);
  }

  const response = await fetch(
    `${config.url}/rest/v1/${REPLIES_TABLE}?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: {
        apikey: config.key,
        "Content-Type": "application/json",
        Prefer: "return=representation",
        ...ownerHeaders(normalized),
      },
      body: JSON.stringify({ comment: validated, updated_at: new Date().toISOString() }),
      cache: "no-store",
    },
  );
  if (!response.ok) {
    throw new Error(`Supabase reply update failed with status ${response.status}`);
  }
  const rows = (await response.json()) as ReplyRow[];
  if (!rows[0]) throw new StoreError("Uteshwa kubihindura.", 403);
  return publicReply(fromReplyRow(rows[0], normalized));
}

export async function deleteReply(id: string, token?: string | null): Promise<void> {
  const normalized = normalizeOwnerToken(token);
  if (!isValidId(id)) throw new StoreError("Icyifuzo ntikikwemewe.", 400);
  if (!normalized) throw new StoreError("Ugomba kuba winjiriye kugirango usibe.", 403);

  const config = storageConfig();
  if (!config) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Reviews storage is not configured");
    }
    for (const [reviewId, list] of demoReplies) {
      const index = list.findIndex((reply) => reply.id === id);
      if (index < 0) continue;
      if (list[index].ownerHash !== hashToken(normalized)) {
        throw new StoreError("Uteshwa kusiba.", 403);
      }
      list.splice(index, 1);
      const review = demoReviews.find((item) => item.id === reviewId);
      if (review) {
        review.replies = review.replies.filter((reply) => reply.id !== id);
      }
      return;
    }
    throw new StoreError("Igisubizo ntikiboneka.", 404);
  }

  const response = await fetch(
    `${config.url}/rest/v1/${REPLIES_TABLE}?id=eq.${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      headers: {
        apikey: config.key,
        Prefer: "return=representation",
        ...ownerHeaders(normalized),
      },
      cache: "no-store",
    },
  );
  if (!response.ok) {
    throw new Error(`Supabase reply delete failed with status ${response.status}`);
  }
  const rows = (await response.json()) as ReplyRow[];
  if (!rows.length) throw new StoreError("Uteshwa kusiba.", 403);
}
