"use client";

import { useEffect, useState, type FormEvent } from "react";
import { track } from "@vercel/analytics";
import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  MessageSquare,
  Send,
  Star,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { Review, ReviewsResult } from "@/lib/review-types";

const RATINGS = [1, 2, 3, 4, 5];

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

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return new Intl.DateTimeFormat("rw-RW", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  } catch {
    return date.toLocaleDateString();
  }
}

export default function ReviewsSection() {
  const [data, setData] = useState<ReviewsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [name, setName] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const response = await fetch("/api/reviews", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Failed to load reviews");
        const result = (await response.json()) as ReviewsResult;
        if (controller.signal.aborted) return;
        setData(result);
        track("reviews_viewed", { count: result.total });
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setLoadError("Ibyitekerezo ntibyashoboye kuzanwa. Ugerageze mu nyuma.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  function resetForm() {
    setName("");
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, rating, comment, website }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        ignored?: boolean;
        review?: Review;
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
      setData((previous) => {
        if (!previous) {
          return { reviews: [review], total: 1, average: review.rating };
        }
        const count = previous.reviews.length + 1;
        return {
          reviews: [review, ...previous.reviews],
          total: previous.total + 1,
          average:
            Math.round(
              ((previous.average * previous.reviews.length + review.rating) / count) * 10,
            ) / 10,
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
            Hari kuzanwa ibitekerezo&hellip;
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
            onChange={(event) => setName(event.target.value)}
            maxLength={40}
            required
            placeholder="Izina"
            className="mt-1.5 w-full rounded-xl border border-border-soft bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-rwanda-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rwanda-blue"
          />
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-foreground">Igipimo</legend>
          <div className="mt-1.5 flex items-center gap-1">
            {RATINGS.map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                aria-label={`${star} inyenyeri`}
                aria-pressed={rating === star}
                className="rounded-lg p-1 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rwanda-blue"
              >
                <Star
                  className={cn(
                    "h-7 w-7",
                    star <= rating
                      ? "fill-rwanda-yellow text-rwanda-yellow"
                      : "text-muted/50",
                  )}
                  aria-hidden
                />
              </button>
            ))}
            {rating > 0 && (
              <span className="ml-2 text-xs font-medium text-muted">
                {rating}/5
              </span>
            )}
          </div>
        </fieldset>

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

      {/* Existing reviews */}
      {data && data.reviews.length > 0 && (
        <ul className="mt-8 space-y-3">
          {data.reviews.map((review) => (
            <li
              key={review.id}
              className="rounded-2xl border border-border-soft bg-background p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">{review.name}</p>
                <div className="flex items-center gap-2">
                  <Stars value={review.rating} />
                  <time
                    dateTime={review.createdAt}
                    className="text-[11px] text-muted"
                  >
                    {formatDate(review.createdAt)}
                  </time>
                </div>
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted">
                {review.comment}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
