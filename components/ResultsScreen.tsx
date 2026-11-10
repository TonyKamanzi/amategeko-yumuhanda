"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  BookOpenCheck,
  CheckCircle2,
  ChevronDown,
  PartyPopper,
  Percent,
  RotateCcw,
  Target,
  Trophy,
  XCircle,
  XOctagon,
} from "lucide-react";import type { Question } from "@/lib/questions";
import { PASS_MARK, TOTAL_QUESTIONS } from "@/lib/quiz";
import { playSound } from "@/lib/sound";
import { cn } from "@/lib/cn";

type ResultsScreenProps = {
  questions: Question[];
  answers: (number | null)[];
  timeUsedSeconds: number;
  onRestart: () => void;
};

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}m ${String(rest).padStart(2, "0")}s`;
}

export default function ResultsScreen({
  questions,
  answers,
  timeUsedSeconds,
  onRestart,
}: ResultsScreenProps) {
  const [showReview, setShowReview] = useState(false);

  const correctCount = answers.reduce<number>(
    (total, answer, i) => (answer !== null && answer === questions[i].correctIndex ? total + 1 : total),
    0,
  );
  const wrongCount = answers.filter((a) => a !== null).length - correctCount;
  const skippedCount = answers.filter((a) => a === null).length;
  const percentage = Math.round((correctCount / TOTAL_QUESTIONS) * 100);
  const passed = correctCount >= PASS_MARK;

  // Celebrate (or console) once when the results screen appears.
  useEffect(() => {
    playSound("finish");
  }, []);

  const stats = [
    {
      icon: Target,
      label: "Umutwe wa ribwe",
      value: `${correctCount}/${TOTAL_QUESTIONS}`,
      tone: "text-rwanda-blue",
      bg: "bg-rwanda-blue/10",
    },
    {
      icon: Percent,
      label: "Ijanisha",
      value: `${percentage}%`,
      tone: "text-rwanda-yellow dark:text-amber-400",
      bg: "bg-rwanda-yellow/15",
    },
    {
      icon: CheckCircle2,
      label: "Byakozwe neza",
      value: String(correctCount),
      tone: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      icon: XCircle,
      label: "Byakozwe nabi",
      value: String(wrongCount),
      tone: "text-red-600 dark:text-red-400",
      bg: "bg-red-500/10",
    },
  ];

  return (
    <div className="animate-slide-up">
      {/* Pass / Fail banner */}
      <section
        role="status"
        className={cn(
          "relative overflow-hidden rounded-3xl border p-8 text-center shadow-xl sm:p-12",
          passed
            ? "border-emerald-500/40 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/30"
            : "border-red-500/40 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/50 dark:to-rose-950/30",
        )}
      >
        <div
          className={cn(
            "mx-auto flex h-20 w-20 items-center justify-center rounded-3xl",
            passed ? "bg-emerald-500/15" : "bg-red-500/15",
          )}
        >
          {passed ? (
            <PartyPopper className="h-10 w-10 text-emerald-600 dark:text-emerald-400" aria-hidden />
          ) : (
            <XOctagon className="h-10 w-10 text-red-600 dark:text-red-400" aria-hidden />
          )}
        </div>
        <h1
          className={cn(
            "mt-5 text-3xl font-bold tracking-tight sm:text-4xl",
            passed ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300",
          )}
        >
          {passed ? "Uratsinze! Congrats!" : "Ntabwo waratsinze"}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-muted">
          {passed ? (
            <>
              Wabonye umutwe <strong className="text-emerald-700 dark:text-emerald-300">{correctCount}/{TOTAL_QUESTIONS}</strong>{" "}
              ({percentage}%). Urazi neza umutekano mu muhanda &mdash;{" "}
              <strong>waratsinze</strong> ikizami cy&rsquo;agaciro. Gerageza nanze
              ibibazo bikomeye mu gusubiramo!
            </>
          ) : (
            <>
              Wabonye umutwe <strong className="text-red-700 dark:text-red-300">{correctCount}/{TOTAL_QUESTIONS}</strong>{" "}
              ({percentage}%). Kwitondera: ugomba byibura <strong>{PASS_MARK}/{TOTAL_QUESTIONS}</strong> ngo
              utsinde. Subiramo ibisobanuro hano hasi, hanyuma ongera ugerageze!
            </>
          )}
        </p>
        {skippedCount > 0 && (
          <p className="mt-3 inline-block rounded-full bg-slate-500/10 px-4 py-1.5 text-sm font-medium text-muted">
            Ibibazo {skippedCount} ntarabikoze (igihe cyarangiye cyangwa utarabyigera)
          </p>
        )}
      </section>

      {/* Stats breakdown */}
      <section aria-label="Imibare y&rsquo;ikizami" className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ icon: Icon, label, value, tone, bg }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-2 rounded-2xl border border-border-soft bg-surface p-6 text-center shadow-sm"
          >
            <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", bg)}>
              <Icon className={cn("h-5 w-5", tone)} aria-hidden />
            </span>
            <p className="text-2xl font-bold tabular-nums text-foreground">{value}</p>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
          </div>
        ))}
      </section>

      {/* Time used */}
      <p className="mt-4 text-center text-sm text-muted">
        Igihe wakoze: <span className="font-semibold tabular-nums text-foreground">{formatDuration(timeUsedSeconds)}</span>
      </p>

      {/* Actions */}
      <div className="mt-8 flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={onRestart}
          className="group inline-flex items-center gap-3 rounded-full bg-rwanda-blue px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-rwanda-blue/30 transition-all duration-200 hover:scale-[1.03] hover:bg-sky-600 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rwanda-blue active:scale-95"
        >
          <RotateCcw
            className="h-5 w-5 transition-transform duration-300 group-hover:-rotate-180"
            aria-hidden
          />
          Tangira Ikizami Gishya
        </button>
        <button
          type="button"
          onClick={() => setShowReview((s) => !s)}
          aria-expanded={showReview}
          aria-controls="review-section"
          className="inline-flex items-center gap-2 rounded-full border border-border-soft bg-surface px-6 py-3 text-sm font-semibold text-foreground shadow-sm transition-all duration-200 hover:border-rwanda-green/50 hover:text-rwanda-green dark:hover:text-emerald-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rwanda-green active:scale-95"
        >
          <BookOpenCheck className="h-4 w-4" aria-hidden />
          {showReview ? "Hisha Isubiramo" : "Reba Isubiramo Ryose"}
          <ChevronDown
            className={cn("h-4 w-4 transition-transform duration-300", showReview && "rotate-180")}
            aria-hidden
          />
        </button>
      </div>

      {/* Full review */}
      {showReview && (
        <section
          id="review-section"
          aria-label="Isubiramo ry&rsquo;ibibazo byose"
          className="mt-8 animate-fade-in space-y-4"
        >
          {questions.map((question, index) => {
            const answer = answers[index];
            const isCorrect = answer !== null && answer === question.correctIndex;
            return (
              <article
                key={index}
                className={cn(
                  "rounded-2xl border bg-surface p-5 shadow-sm sm:p-6",
                  isCorrect
                    ? "border-emerald-500/30"
                    : answer === null
                      ? "border-border-soft"
                      : "border-red-500/30",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-semibold leading-relaxed text-foreground sm:text-lg">
                    <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-200" aria-hidden>
                      {index + 1}
                    </span>
                    {question.question}
                  </h3>
                  <span
                    className={cn(
                      "mt-0.5 shrink-0 rounded-full px-3 py-1 text-xs font-bold",
                      isCorrect
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : answer === null
                          ? "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                          : "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300",
                    )}
                  >
                    {isCorrect ? "Neza +1" : answer === null ? "Ntarabyikorwa" : "Ikosa"}
                  </span>
                </div>

                {question.image && (
                  <div className="mt-4 flex justify-center">
                    <Image
                      src={question.image.src}
                      alt="Ishusho ijyanye n'iki kibazo"
                      width={question.image.width}
                      height={question.image.height}
                      sizes="(min-width: 640px) 22rem, 92vw"
                      className="h-auto w-full max-w-[22rem] rounded-2xl border border-border-soft bg-white p-2 shadow-sm dark:shadow-none"
                    />
                  </div>
                )}

                <ul className="mt-4 space-y-2">
                  {question.choices.map((choice, choiceIndex) => {
                    const isRight = choiceIndex === question.correctIndex;
                    const isChosen = answer === choiceIndex;
                    return (
                      <li
                        key={choiceIndex}
                        className={cn(
                          "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm leading-relaxed",
                          isRight
                            ? "border-emerald-500/60 bg-emerald-50 font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                            : isChosen
                              ? "border-red-500/60 bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200"
                              : "border-border-soft bg-background text-muted",
                        )}
                      >
                        <span
                          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold"
                          aria-hidden
                        >
                          {String.fromCharCode(65 + choiceIndex)}
                        </span>
                        <span className="flex-1">{choice}</span>
                        {isRight && (
                          <span className="ml-2 inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 className="h-3 w-3" aria-hidden />
                            Igisubizo cy&rsquo;ukuri
                          </span>
                        )}
                        {isChosen && !isRight && (
                          <span className="ml-2 inline-flex shrink-0 items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700 dark:text-red-300">
                            <XCircle className="h-3 w-3" aria-hidden />
                            Uwatoye
                          </span>
                        )}
                        {isChosen && isRight && (
                          <span className="ml-2 inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                            <Trophy className="h-3 w-3" aria-hidden />
                            Uwatoye
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
