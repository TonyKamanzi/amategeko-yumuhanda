"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import { track } from "@vercel/analytics";
import {
  AlertCircle,
  CheckCircle2,
  CornerDownRight,
  LoaderCircle,
  MessageSquare,
  Pencil,
  Reply,
  Send,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { Review, ReviewsResult } from "@/lib/review-types";

const RATINGS = [1, 2, 3, 4, 5];
const IDENTITY_KEY = "ikizami-review-identity";

type Identity = { name: string; token: string };

// useSyncExternalStore requires getSnapshot to return the same object until the
// underlying storage actually changes. Cache both the raw string and the parsed
// value so repeated reads don't create a new identity object every render.
let cachedRaw: string | null = null;
let cachedIdentity: Identity | null = null;
let cacheInitialized = false;

function readIdentity(): Identity | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(IDENTITY_KEY);
    if (cacheInitialized && raw === cachedRaw) return cachedIdentity;
    cacheInitialized = true;
    cachedRaw = raw;
    if (!raw) return (cachedIdentity = null);

    const value = JSON.parse(raw) as Partial<Identity>;
    if (
      typeof value.name === "string" &&
      typeof value.token === "string" &&
      value.token.length >= 16
    ) {
      return (cachedIdentity = { name: value.name, token: value.token });
    }
  } catch {
    // Ignore malformed or blocked localStorage.
  }
  cacheInitialized = true;
  cachedRaw = null;
  return (cachedIdentity = null);
}

const IDENTITY_EVENT = "ikizami-identity-change";

function writeIdentity(value: Identity) {
  try {
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(value));
  } catch {
    // Private browsing may block storage; the app still works for this visit.
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(IDENTITY_EVENT));
  }
}

function subscribeIdentity(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener(IDENTITY_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(IDENTITY_EVENT, callback);
  };
}

function getIdentitySnapshot() {
  return readIdentity();
}

function getIdentityServerSnapshot(): Identity | null {
  return null;
}

function useIdentity() {
  return useSyncExternalStore(
    subscribeIdentity,
    getIdentitySnapshot,
    getIdentityServerSnapshot,
  );
}

/** False during hydration, true on the first client render afterwards. */
function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

function freshToken() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function Stars({ value, large = false }: { value: number; large?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-0.5"
      aria-label={`${value} muri 5 inyenyeri`}
    >
      {RATINGS.map((star) => (
        <Star
          key={star}
          className={cn(
            large ? "h-5 w-5" : "h-4 w-4",
            star <= value ? "fill-rwanda-yellow text-rwanda-yellow" : "text-muted/50",
          )}
          aria-hidden
        />
      ))}
    </span>
  );
}

function StarPicker({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-foreground">{label}</legend>
      <div className="mt-1.5 flex items-center gap-1">
        {RATINGS.map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            aria-label={`${star} inyenyeri`}
            aria-pressed={value === star}
            className="rounded-lg p-1 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rwanda-blue"
          >
            <Star
              className={cn(
                "h-7 w-7",
                star <= value
                  ? "fill-rwanda-yellow text-rwanda-yellow"
                  : "text-muted/50",
              )}
              aria-hidden
            />
          </button>
        ))}
        {value > 0 && (
          <span className="ml-2 text-xs font-medium text-muted">{value}/5</span>
        )}
      </div>
    </fieldset>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return new Intl.DateTimeFormat("rw-RW", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

function averageOf(reviews: Review[]) {
  if (reviews.length === 0) return 0;
  return (
    Math.round(
      (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length) * 10,
    ) / 10
  );
}

export default function ReviewsSection() {
  const identity = useIdentity();
  const hydrated = useHydrated();
  const [data, setData] = useState<ReviewsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const tracked = useRef(false);

  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const name = nameOverride ?? identity?.name ?? "";
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");

  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyName, setReplyName] = useState("");
  const [replyText, setReplyText] = useState("");
  const [replyError, setReplyError] = useState("");
  const [replying, setReplying] = useState(false);

  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editReview, setEditReview] = useState({ name: "", rating: 0, comment: "" });
  const [editReviewError, setEditReviewError] = useState("");

  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editReplyText, setEditReplyText] = useState("");
  const [editReplyError, setEditReplyError] = useState("");

  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (!hydrated) return;
    const controller = new AbortController();

    (async () => {
      try {
        const headers: Record<string, string> = {};
        if (identity?.token) headers["x-review-owner"] = identity.token;
        const response = await fetch("/api/reviews", {
          signal: controller.signal,
          cache: "no-store",
          headers,
        });
        if (!response.ok) throw new Error("Failed to load reviews");
        const result = (await response.json()) as ReviewsResult;
        if (controller.signal.aborted) return;
        setData(result);
        if (!tracked.current) {
          track("reviews_viewed", { count: result.total });
          tracked.current = true;
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setLoadError("Ibyitekerezo ntibyashoboye kuzanwa. Ugerageze mu nyuma.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [hydrated, identity?.token]);

  function jsonHeaders() {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (identity?.token) headers["x-review-owner"] = identity.token;
    return headers;
  }

  function rememberIdentity(next: Identity) {
    writeIdentity(next);
    setNameOverride(null);
  }

  function resetForm() {
    setRating(0);
    setComment("");
    setWebsite("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({ name, rating, comment, website }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        ignored?: boolean;
        review?: Review;
        ownerToken?: string;
      };

      if (!response.ok) {
        setFormError(result.error ?? "Ntibyashobokaga kubika igitekerezo cyawe.");
        return;
      }
      if (result.ignored || !result.review) {
        setSuccess("Murakoze! Igitekerezo cyawe cyashyizweho.");
        resetForm();
        return;
      }

      const review = result.review;
      rememberIdentity({
        name: review.name,
        token: result.ownerToken ?? identity?.token ?? freshToken(),
      });
      setData((previous) => {
        const reviews = [review, ...(previous?.reviews ?? [])];
        return {
          reviews,
          average: averageOf(reviews),
          total: (previous?.total ?? 0) + 1,
        };
      });
      setSuccess("Murakoze! Igitekerezo cyawe cyashyizweho.");
      resetForm();
      track("review_submitted", { rating });
    } catch {
      setFormError("Ntibyashobokaga kubika igitekerezo cyawe. Ugerageze nanone.");
    } finally {
      setSubmitting(false);
    }
  }

  function startEditReview(review: Review) {
    setActionError("");
    setReplyingTo(null);
    setEditingReviewId(review.id);
    setEditReview({
      name: review.name,
      rating: review.rating,
      comment: review.comment,
    });
    setEditReviewError("");
  }

  async function saveEditReview(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    setEditReviewError("");
    setActionError("");
    setBusyId(`edit-review-${id}`);

    try {
      const response = await fetch(`/api/reviews/${id}`, {
        method: "PATCH",
        headers: jsonHeaders(),
        body: JSON.stringify(editReview),
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        review?: Review;
      };
      if (!response.ok || !result.review) {
        setEditReviewError(result.error ?? "Impinduka ntizashoboye kubikwa.");
        return;
      }

      const updated = result.review;
      rememberIdentity({ name: updated.name, token: identity?.token ?? freshToken() });
      setData((previous) => {
        if (!previous) return { reviews: [updated], average: updated.rating, total: 1 };
        const reviews = previous.reviews.map((review) =>
          review.id === id ? { ...updated, replies: review.replies } : review,
        );
        return { ...previous, reviews, average: averageOf(reviews) };
      });
      setEditingReviewId(null);
      setSuccess("Igitekerezo cyawe cyavuguruwe.");
      track("review_edited");
    } catch {
      setEditReviewError("Impinduka ntizashoboye kubikwa. Ugerageze nanone.");
    } finally {
      setBusyId(null);
    }
  }

  async function removeReview(id: string) {
    if (!window.confirm("Ushaka kusiba igitekerezo cyawe burundu?")) return;
    setActionError("");
    setBusyId(`delete-review-${id}`);

    try {
      const response = await fetch(`/api/reviews/${id}`, {
        method: "DELETE",
        headers: jsonHeaders(),
      });
      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setActionError(result.error ?? "Ntibyashobokaga kusiba igitekerezo.");
        return;
      }
      setData((previous) => {
        if (!previous) return { reviews: [], average: 0, total: 0 };
        const reviews = previous.reviews.filter((review) => review.id !== id);
        return {
          reviews,
          average: averageOf(reviews),
          total: Math.max(0, previous.total - 1),
        };
      });
      if (editingReviewId === id) setEditingReviewId(null);
      setSuccess("Igitekerezo cyawe cyasibwe.");
      track("review_deleted");
    } catch {
      setActionError("Ntibyashobokaga kusiba igitekerezo. Ugerageze nanone.");
    } finally {
      setBusyId(null);
    }
  }

  function toggleReply(reviewId: string) {
    setActionError("");
    setEditReviewError("");
    setEditingReviewId(null);
    setEditingReplyId(null);
    if (replyingTo === reviewId) {
      setReplyingTo(null);
      return;
    }
    setReplyingTo(reviewId);
    setReplyName(name || identity?.name || "");
    setReplyText("");
    setReplyError("");
  }

  async function submitReply(event: FormEvent<HTMLFormElement>, reviewId: string) {
    event.preventDefault();
    setReplyError("");
    setActionError("");
    setReplying(true);

    try {
      const response = await fetch(`/api/reviews/${reviewId}/replies`, {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({ name: replyName || name, comment: replyText }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        ignored?: boolean;
        reply?: Review["replies"][number];
        ownerToken?: string;
      };
      if (!response.ok) {
        setReplyError(result.error ?? "Ntibyashobokaga kubika igisubizo.");
        return;
      }
      if (result.ignored || !result.reply) {
        setReplyingTo(null);
        setReplyText("");
        return;
      }

      const reply = result.reply;
      rememberIdentity({
        name: reply.name,
        token: result.ownerToken ?? identity?.token ?? freshToken(),
      });
      setData((previous) => {
        if (!previous) return previous;
        return {
          ...previous,
          reviews: previous.reviews.map((review) =>
            review.id === reviewId
              ? { ...review, replies: [...review.replies, reply] }
              : review,
          ),
        };
      });
      setReplyingTo(null);
      setReplyText("");
      setSuccess("Igisubizo cyawe cyashyizweho.");
      track("reply_submitted");
    } catch {
      setReplyError("Ntibyashobokaga kubika igisubizo. Ugerageze nanone.");
    } finally {
      setReplying(false);
    }
  }

  function startEditReply(id: string, comment: string) {
    setActionError("");
    setEditingReviewId(null);
    setReplyingTo(null);
    setEditingReplyId(id);
    setEditReplyText(comment);
    setEditReplyError("");
  }

  async function saveEditReply(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    setEditReplyError("");
    setActionError("");
    setBusyId(`edit-reply-${id}`);

    try {
      const response = await fetch(`/api/reviews/replies/${id}`, {
        method: "PATCH",
        headers: jsonHeaders(),
        body: JSON.stringify({ comment: editReplyText }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        reply?: Review["replies"][number];
      };
      if (!response.ok || !result.reply) {
        setEditReplyError(result.error ?? "Impinduka ntizashoboye kubikwa.");
        return;
      }
      const updated = result.reply;
      setData((previous) => {
        if (!previous) return previous;
        return {
          ...previous,
          reviews: previous.reviews.map((review) => ({
            ...review,
            replies: review.replies.map((reply) =>
              reply.id === id ? updated : reply,
            ),
          })),
        };
      });
      setEditingReplyId(null);
      setSuccess("Igisubizo cyawe cyavuguruwe.");
      track("reply_edited");
    } catch {
      setEditReplyError("Impinduka ntizashoboye kubikwa. Ugerageze nanone.");
    } finally {
      setBusyId(null);
    }
  }

  async function removeReply(id: string) {
    if (!window.confirm("Ushaka kusiba igisubizo cyawe?")) return;
    setActionError("");
    setBusyId(`delete-reply-${id}`);

    try {
      const response = await fetch(`/api/reviews/replies/${id}`, {
        method: "DELETE",
        headers: jsonHeaders(),
      });
      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setActionError(result.error ?? "Ntibyashobokaga kusiba igisubizo.");
        return;
      }
      setData((previous) => {
        if (!previous) return previous;
        return {
          ...previous,
          reviews: previous.reviews.map((review) => ({
            ...review,
            replies: review.replies.filter((reply) => reply.id !== id),
          })),
        };
      });
      if (editingReplyId === id) setEditingReplyId(null);
      setSuccess("Igisubizo cyawe cyasibwe.");
      track("reply_deleted");
    } catch {
      setActionError("Ntibyashobokaga kusiba igisubizo. Ugerageze nanone.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section
      aria-labelledby="reviews-heading"
      className="relative mt-10 overflow-hidden rounded-3xl border border-border-soft bg-surface p-6 shadow-sm sm:p-8"
    >
      <div aria-hidden className="imigongo-band absolute inset-x-0 top-0 h-2" />

      <h2
        id="reviews-heading"
        className="flex items-center gap-2 text-lg font-semibold text-foreground"
      >
        <MessageSquare className="h-5 w-5 text-rwanda-blue" aria-hidden />
        Ibyitekerezo by&rsquo;abasura
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Sangira uko wabonye ikizami, hanyuma urebe abandi bavuga ki. Ibyo
        bandika ni iby&rsquo;abo, si ibya leta.
      </p>

      {/* Rating summary */}
      <div className="mt-5 min-h-20 rounded-2xl bg-rwanda-yellow/10 p-4">
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-muted">
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
            Hari kuzanwa ibitekerezo…
          </p>
        ) : loadError ? (
          <p className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
            <AlertCircle className="h-4 w-4" aria-hidden />
            {loadError}
          </p>
        ) : data ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="text-3xl font-bold tabular-nums text-foreground">
              {data.total > 0 ? data.average.toFixed(1) : "—"}
            </span>
            <div>
              <Stars value={Math.round(data.average)} large />
              <p className="mt-1 text-xs text-muted">
                {data.total === 0
                  ? "Nta gitekerezo kirimo"
                  : `${data.total} ${data.total === 1 ? "gitekerezo" : "ibitekerezo"}`}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {/* Submission form */}
      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="review-name" className="text-sm font-medium text-foreground">
            Izina ryawe
          </label>
          <input
            id="review-name"
            name="name"
            value={name}
            onChange={(event) => setNameOverride(event.target.value)}
            maxLength={40}
            required
            placeholder="Izina"
            className="mt-1.5 w-full rounded-xl border border-border-soft bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-rwanda-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rwanda-blue"
          />
          {identity && (
            <p className="mt-1 text-[11px] text-muted">
              Izina ryawe ryabitswe kuri iyi mudugudu: {identity.name}.
            </p>
          )}
        </div>

        <StarPicker value={rating} onChange={setRating} label="Igipimo" />

        <div className="sm:col-span-2">
          <label htmlFor="review-comment" className="text-sm font-medium text-foreground">
            Igitekerezo cyawe
          </label>
          <textarea
            id="review-comment"
            name="comment"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            minLength={10}
            maxLength={500}
            required
            rows={3}
            placeholder="Andika ibyo watekereje kuri iyi porogaramu…"
            className="mt-1.5 w-full resize-y rounded-xl border border-border-soft bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-rwanda-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rwanda-blue"
          />
          <p className="mt-1 text-right text-[11px] text-muted">{comment.length}/500</p>
        </div>

        {/* Hidden from humans; bots tend to fill it. */}
        <div className="absolute -left-[9999px]" aria-hidden>
          <label htmlFor="review-website">Website</label>
          <input
            id="review-website"
            name="website"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        {formError && (
          <p
            role="alert"
            className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300 sm:col-span-2"
          >
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
            {formError}
          </p>
        )}
        {success && (
          <p
            role="status"
            className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300 sm:col-span-2"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
            {success}
          </p>
        )}

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={submitting || rating === 0}
            className="inline-flex items-center gap-2 rounded-full bg-rwanda-green px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rwanda-green/30 transition-all duration-200 hover:scale-[1.02] hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rwanda-green active:scale-95 disabled:pointer-events-none disabled:opacity-50"
          >
            {submitting ? (
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Send className="h-4 w-4" aria-hidden />
            )}
            {submitting ? "Hari kubika…" : "Ohereza igitekerezo"}
          </button>
        </div>
      </form>

      {actionError && (
        <p
          role="alert"
          className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300"
        >
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
          {actionError}
        </p>
      )}

      {/* Existing reviews */}
      {data && data.reviews.length > 0 && (
        <ul className="mt-8 space-y-3">
          {data.reviews.map((review) => (
            <li
              key={review.id}
              className="rounded-2xl border border-border-soft bg-background p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">{review.name}</p>
                  <time
                    dateTime={review.createdAt}
                    className="text-[11px] text-muted"
                    title={review.createdAt}
                  >
                    {formatDateTime(review.createdAt)}
                    {review.updatedAt !== review.createdAt && " · yavuguruwe"}
                  </time>
                </div>
                <Stars value={review.rating} />
              </div>

              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted">
                {review.comment}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleReply(review.id)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-rwanda-blue transition-colors hover:text-rwanda-green focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rwanda-blue"
                >
                  <Reply className="h-3.5 w-3.5" aria-hidden />
                  {review.replies.length === 0
                    ? "Subiza"
                    : `${review.replies.length} ${
                        review.replies.length === 1 ? "gisubizo" : "ibisubizo"
                      }`}
                </button>
                {review.owned && (
                  <>
                    <button
                      type="button"
                      onClick={() => startEditReview(review)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-muted transition-colors hover:text-rwanda-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rwanda-blue"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                      Hindura
                    </button>
                    <button
                      type="button"
                      onClick={() => removeReview(review.id)}
                      disabled={busyId === `delete-review-${review.id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 transition-colors hover:text-red-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:opacity-50 dark:text-red-300"
                    >
                      {busyId === `delete-review-${review.id}` ? (
                        <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      )}
                      Siba
                    </button>
                  </>
                )}
              </div>

              {/* Edit form for this review */}
              {editingReviewId === review.id && (
                <form
                  onSubmit={(event) => saveEditReview(event, review.id)}
                  className="mt-4 grid gap-3 rounded-xl border border-rwanda-blue/30 bg-rwanda-blue/5 p-3 sm:grid-cols-2"
                >
                  <div>
                    <label
                      htmlFor={`edit-review-name-${review.id}`}
                      className="text-xs font-medium text-foreground"
                    >
                      Izina
                    </label>
                    <input
                      id={`edit-review-name-${review.id}`}
                      value={editReview.name}
                      maxLength={40}
                      required
                      onChange={(event) =>
                        setEditReview((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-border-soft bg-background px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-rwanda-blue"
                    />
                  </div>
                  <StarPicker
                    value={editReview.rating}
                    onChange={(value) =>
                      setEditReview((current) => ({ ...current, rating: value }))
                    }
                    label="Igipimo"
                  />
                  <div className="sm:col-span-2">
                    <label
                      htmlFor={`edit-review-comment-${review.id}`}
                      className="text-xs font-medium text-foreground"
                    >
                      Igitekerezo
                    </label>
                    <textarea
                      id={`edit-review-comment-${review.id}`}
                      value={editReview.comment}
                      minLength={10}
                      maxLength={500}
                      required
                      rows={3}
                      onChange={(event) =>
                        setEditReview((current) => ({
                          ...current,
                          comment: event.target.value,
                        }))
                      }
                      className="mt-1 w-full resize-y rounded-lg border border-border-soft bg-background px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-rwanda-blue"
                    />
                  </div>
                  {editReviewError && (
                    <p
                      role="alert"
                      className="flex items-center gap-1.5 text-xs text-red-700 sm:col-span-2 dark:text-red-300"
                    >
                      <AlertCircle className="h-3.5 w-3.5" aria-hidden />
                      {editReviewError}
                    </p>
                  )}
                  <div className="flex gap-2 sm:col-span-2">
                    <button
                      type="submit"
                      disabled={busyId === `edit-review-${review.id}` || editReview.rating === 0}
                      className="inline-flex items-center gap-1.5 rounded-full bg-rwanda-green px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {busyId === `edit-review-${review.id}` ? (
                        <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                      )}
                      Bika impinduka
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingReviewId(null)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border-soft px-4 py-2 text-xs font-medium text-muted transition-colors hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden />
                      Kureka
                    </button>
                  </div>
                </form>
              )}

              {/* Reply form */}
              {replyingTo === review.id && (
                <form
                  onSubmit={(event) => submitReply(event, review.id)}
                  className="mt-4 space-y-3 rounded-xl border border-rwanda-blue/30 bg-rwanda-blue/5 p-3"
                >
                  <div>
                    <label
                      htmlFor={`reply-name-${review.id}`}
                      className="text-xs font-medium text-foreground"
                    >
                      Izina ryawe
                    </label>
                    <input
                      id={`reply-name-${review.id}`}
                      value={replyName}
                      maxLength={40}
                      required
                      readOnly={Boolean(identity)}
                      onChange={(event) => setReplyName(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-border-soft bg-background px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-rwanda-blue read-only:text-muted"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`reply-comment-${review.id}`}
                      className="text-xs font-medium text-foreground"
                    >
                      Igisubizo cyawe
                    </label>
                    <textarea
                      id={`reply-comment-${review.id}`}
                      value={replyText}
                      minLength={10}
                      maxLength={500}
                      required
                      rows={2}
                      onChange={(event) => setReplyText(event.target.value)}
                      placeholder="Andika igisubizo…"
                      className="mt-1 w-full resize-y rounded-lg border border-border-soft bg-background px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-rwanda-blue"
                    />
                  </div>
                  {replyError && (
                    <p
                      role="alert"
                      className="flex items-center gap-1.5 text-xs text-red-700 dark:text-red-300"
                    >
                      <AlertCircle className="h-3.5 w-3.5" aria-hidden />
                      {replyError}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={replying}
                      className="inline-flex items-center gap-1.5 rounded-full bg-rwanda-green px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {replying ? (
                        <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      ) : (
                        <Send className="h-3.5 w-3.5" aria-hidden />
                      )}
                      Ohereza igisubizo
                    </button>
                    <button
                      type="button"
                      onClick={() => setReplyingTo(null)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border-soft px-4 py-2 text-xs font-medium text-muted transition-colors hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden />
                      Kureka
                    </button>
                  </div>
                </form>
              )}

              {/* Replies */}
              {review.replies.length > 0 && (
                <ul className="mt-4 space-y-2 border-l-2 border-rwanda-blue/20 pl-3 sm:pl-4">
                  {review.replies.map((reply) => (
                    <li
                      key={reply.id}
                      className="rounded-xl bg-rwanda-blue/5 p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <CornerDownRight
                            className="h-3.5 w-3.5 text-rwanda-blue"
                            aria-hidden
                          />
                          <p className="text-xs font-semibold text-foreground">
                            {reply.name}
                          </p>
                          <time
                            dateTime={reply.createdAt}
                            className="text-[10px] text-muted"
                            title={reply.createdAt}
                          >
                            {formatDateTime(reply.createdAt)}
                            {reply.updatedAt !== reply.createdAt && " · yavuguruwe"}
                          </time>
                        </div>
                        {reply.owned && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => startEditReply(reply.id, reply.comment)}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-muted transition-colors hover:text-rwanda-blue"
                            >
                              <Pencil className="h-3 w-3" aria-hidden />
                              Hindura
                            </button>
                            <button
                              type="button"
                              onClick={() => removeReply(reply.id)}
                              disabled={busyId === `delete-reply-${reply.id}`}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-red-700 transition-colors hover:text-red-900 disabled:opacity-50 dark:text-red-300"
                            >
                              {busyId === `delete-reply-${reply.id}` ? (
                                <LoaderCircle className="h-3 w-3 animate-spin" aria-hidden />
                              ) : (
                                <Trash2 className="h-3 w-3" aria-hidden />
                              )}
                              Siba
                            </button>
                          </div>
                        )}
                      </div>
                      <p className="mt-1.5 whitespace-pre-wrap break-words text-xs leading-relaxed text-muted">
                        {reply.comment}
                      </p>

                      {editingReplyId === reply.id && (
                        <form
                          onSubmit={(event) => saveEditReply(event, reply.id)}
                          className="mt-3 space-y-2"
                        >
                          <textarea
                            value={editReplyText}
                            minLength={10}
                            maxLength={500}
                            required
                            rows={2}
                            onChange={(event) => setEditReplyText(event.target.value)}
                            className="w-full resize-y rounded-lg border border-border-soft bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-rwanda-blue"
                          />
                          {editReplyError && (
                            <p
                              role="alert"
                              className="flex items-center gap-1.5 text-xs text-red-700 dark:text-red-300"
                            >
                              <AlertCircle className="h-3.5 w-3.5" aria-hidden />
                              {editReplyError}
                            </p>
                          )}
                          <div className="flex gap-2">
                            <button
                              type="submit"
                              disabled={busyId === `edit-reply-${reply.id}`}
                              className="inline-flex items-center gap-1.5 rounded-full bg-rwanda-green px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                            >
                              Bika
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingReplyId(null)}
                              className="rounded-full border border-border-soft px-3 py-1.5 text-[11px] font-medium text-muted transition-colors hover:text-foreground"
                            >
                              Kureka
                            </button>
                          </div>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
