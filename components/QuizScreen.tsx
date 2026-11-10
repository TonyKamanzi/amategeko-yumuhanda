"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Flag,
  Target,
  XCircle,
} from "lucide-react";
import type { Question } from "@/lib/questions";
import { LOW_TIME_SECONDS, TOTAL_QUESTIONS, formatTime } from "@/lib/quiz";
import { playSound } from "@/lib/sound";
import { cn } from "@/lib/cn";

type QuizScreenProps = {
  questions: Question[];
  answers: (number | null)[];
  current: number;
  timeLeft: number;
  onSelect: (choiceIndex: number) => void;
  onNavigate: (questionIndex: number) => void;
  onFinish: () => void;
};

export default function QuizScreen({
  questions,
  answers,
  current,
  timeLeft,
  onSelect,
  onNavigate,
  onFinish,
}: QuizScreenProps) {
  const question = questions[current];
  const answeredCount = answers.filter((a) => a !== null).length;
  const score = answers.reduce<number>(
    (total, answer, i) => (answer !== null && answer === questions[i].correctIndex ? total + 1 : total),
    0,
  );
  const isAnswered = answers[current] !== null;
  const selected = answers[current];
  const isCorrect = selected === question.correctIndex;
  const lowTime = timeLeft <= LOW_TIME_SECONDS;
  const progress = (answeredCount / TOTAL_QUESTIONS) * 100;

  const feedbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAnswered && feedbackRef.current) {
      feedbackRef.current.focus();
    }
  }, [isAnswered, current]);

  function handleSelect(choiceIndex: number) {
    if (isAnswered) return;
    const correct = choiceIndex === question.correctIndex;
    playSound(correct ? "correct" : "incorrect");
    onSelect(choiceIndex);
  }

  function handleNavigate(index: number) {
    if (index === current || index < 0 || index >= TOTAL_QUESTIONS) return;
    playSound("select");
    onNavigate(index);
  }

  return (
    <div className="animate-fade-in">
      {/* Status bar: timer + progress + score */}
      <section
        aria-label="Imiterere y'ikizami"
        className="rounded-2xl border border-border-soft bg-surface p-4 shadow-sm sm:p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold uppercase tracking-wider text-muted">
            Ikibazo <span className="text-foreground">{current + 1}</span> /{" "}
            {TOTAL_QUESTIONS}
          </p>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold tabular-nums transition-colors",
                lowTime
                  ? "animate-pulse-ring bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"
                  : "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
              )}
            >
              <Clock3 className="h-4 w-4" aria-hidden />
              {formatTime(timeLeft)}
            </span>
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-bold tabular-nums text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
              aria-live="polite"
            >
              <Target className="h-4 w-4" aria-hidden />
              {score}/{TOTAL_QUESTIONS}
            </span>
          </div>
        </div>
        <div
          className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-800"
          role="progressbar"
          aria-valuenow={answeredCount}
          aria-valuemin={0}
          aria-valuemax={TOTAL_QUESTIONS}
          aria-label="Ibibazo byakozwe"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-rwanda-blue to-rwanda-green transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        {lowTime && (
          <p className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300" role="alert">
            <Clock3 className="h-4 w-4 shrink-0" aria-hidden />
            Igihe kigenda kiranira! Hashize amasaha make menshi &mdash; rangiza vuba.
          </p>
        )}
      </section>

      {/* Question card */}
      <section
        key={current}
        aria-label={`Ikibazo cya ${current + 1}`}
        className="mt-6 rounded-3xl border border-border-soft bg-surface p-6 shadow-lg shadow-slate-200/40 dark:shadow-black/20 sm:p-8"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rwanda-blue/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-rwanda-blue dark:text-sky-300">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            Ikibazo kivuye mu rutonde rw&rsquo;ikizami
          </span>
          <span className="text-xs font-medium tabular-nums text-muted">
            #{current + 1}
          </span>
        </div>

        <h2 className="mt-4 text-xl font-semibold leading-relaxed text-foreground sm:text-2xl">
          {question.question}
        </h2>

        {question.image && (
          <div className="mt-5 flex justify-center">
            <Image
              src={question.image.src}
              alt="Ishusho ijyanye n'iki kibazo"
              width={question.image.width}
              height={question.image.height}
              sizes="(min-width: 640px) 26rem, 92vw"
              className="h-auto w-full max-w-[26rem] rounded-2xl border border-border-soft bg-white p-2 shadow-sm dark:shadow-none"
            />
          </div>
        )}

        <fieldset className="mt-6" disabled={isAnswered}>
          <legend className="sr-only">Ibisubizo by&rsquo;ikibazo {current + 1}</legend>
          <ul className="flex flex-col gap-3">
            {question.choices.map((choice, index) => {
              const isChosen = selected === index;
              const isRight = index === question.correctIndex;
              return (
                <li key={index}>
                  <button
                    type="button"
                    onClick={() => handleSelect(index)}
                    aria-pressed={isChosen}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rwanda-blue",
                      !isAnswered &&
                        "border-border-soft bg-background hover:-translate-y-0.5 hover:border-rwanda-blue/50 hover:bg-rwanda-blue/5 active:translate-y-0 cursor-pointer",
                      isAnswered && !isRight && !isChosen && "border-border-soft bg-background opacity-55",
                      isAnswered && isRight && "border-emerald-500/60 bg-emerald-50 dark:bg-emerald-950/40",
                      isAnswered && isChosen && !isRight &&
                        "animate-shake border-red-500/60 bg-red-50 dark:bg-red-950/40",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors",
                        !isAnswered && "border-muted/40 text-muted",
                        isAnswered && isRight && "border-emerald-500 bg-emerald-500 text-white",
                        isAnswered && isChosen && !isRight && "border-red-500 bg-red-500 text-white",
                        isAnswered && !isRight && !isChosen && "border-muted/30 text-muted/60",
                      )}
                      aria-hidden
                    >
                      {isAnswered && isRight ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : isAnswered && isChosen && !isRight ? (
                        <XCircle className="h-4 w-4" />
                      ) : (
                        String.fromCharCode(65 + index)
                      )}
                    </span>
                    <span
                      className={cn(
                        "text-base leading-relaxed",
                        isAnswered && (isRight || isChosen) ? "font-semibold text-foreground" : "text-foreground/90",
                      )}
                    >
                      {choice}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </fieldset>

        {/* Feedback */}
        {isAnswered && (
          <div
            ref={feedbackRef}
            tabIndex={-1}
            role="status"
            className={cn(
              "mt-6 animate-pop rounded-2xl border p-5",
              isCorrect
                ? "border-emerald-500/40 bg-emerald-50/80 dark:bg-emerald-950/30"
                : "border-red-500/40 bg-red-50/80 dark:bg-red-950/30",
            )}
          >
            <p
              className={cn(
                "flex items-center gap-2 text-base font-bold",
                isCorrect ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300",
              )}
            >
              {isCorrect ? (
                <>
                  <CheckCircle2 className="h-5 w-5" aria-hidden />
                  Ni cyo cyo! Cyawe neza.
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5" aria-hidden />
                  Ntabwo ari cyo. Igisubizo cy&rsquo;ukuri ni{" "}
                  {String.fromCharCode(65 + question.correctIndex)}.
                </>
              )}
            </p>
          </div>
        )}

        {/* Prev / Next / Finish */}
        <div className="mt-8 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => handleNavigate(current - 1)}
            disabled={current === 0}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-border-soft bg-background px-6 py-3 text-sm font-semibold text-foreground transition-all duration-200 hover:border-rwanda-blue/50 hover:text-rwanda-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rwanda-blue active:scale-95 disabled:pointer-events-none disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Ibibazo birekuru
          </button>
          {current === TOTAL_QUESTIONS - 1 ? (
            <button
              type="button"
              onClick={onFinish}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-rwanda-green px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rwanda-green/30 transition-all duration-200 hover:scale-[1.02] hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rwanda-green active:scale-95"
            >
              <Flag className="h-4 w-4" aria-hidden />
              Rangiza Ikizami
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleNavigate(current + 1)}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-rwanda-blue px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rwanda-blue/30 transition-all duration-200 hover:scale-[1.02] hover:bg-sky-600 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rwanda-blue active:scale-95"
            >
              Ikibazo gikurikira
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
      </section>

      {/* Jump navigation grid */}
      <section
        aria-label="Kwirata mu bibazo"
        className="mt-6 rounded-3xl border border-border-soft bg-surface p-6 shadow-sm sm:p-8"
      >
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted">
          Jumper ku kibazo nawe
        </h2>
        <ol className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-10">
          {questions.map((q, index) => {
            const answer = answers[index];
            const answered = answer !== null;
            const correct = answered && answer === q.correctIndex;
            const isCurrent = index === current;
            return (
              <li key={index}>
                <button
                  type="button"
                  onClick={() => handleNavigate(index)}
                  aria-current={isCurrent ? "true" : undefined}
                  aria-label={`Ikibazo ${index + 1}${answered ? (correct ? " — cyakozwe neza" : " — cyakozwe nabi") : " — kitarakozwe"}`}
                  className={cn(
                    "flex h-10 w-full items-center justify-center rounded-xl border text-sm font-bold tabular-nums transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rwanda-blue active:scale-90",
                    isCurrent && "scale-110 border-rwanda-blue bg-rwanda-blue text-white shadow-md shadow-rwanda-blue/30",
                    !isCurrent && !answered && "border-border-soft bg-background text-muted hover:border-rwanda-blue/50 hover:text-rwanda-blue",
                    answered && correct && !isCurrent && "border-emerald-500/50 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300",
                    answered && !correct && !isCurrent && "border-red-500/50 bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300",
                  )}
                >
                  {index + 1}
                </button>
              </li>
            );
          })}
        </ol>
        <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-rwanda-blue" aria-hidden /> Uzamuriyeho
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-emerald-400" aria-hidden /> Byakozwe neza
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-red-400" aria-hidden /> Byakozwe nabi
          </span>
        </div>
      </section>
    </div>
  );
}
