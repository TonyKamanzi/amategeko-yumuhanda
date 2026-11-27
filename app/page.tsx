"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { track } from "@vercel/analytics";
import { CarFront } from "lucide-react";
import ControlBar from "@/components/ControlBar";
import Footer from "@/components/Footer";
import StartScreen from "@/components/StartScreen";
import WhatsAppLink from "@/components/WhatsAppLink";
import QuizScreen from "@/components/QuizScreen";
import ResultsScreen from "@/components/ResultsScreen";
import ReviewsSection from "@/components/ReviewsSection";
import type { Question } from "@/lib/questions";
import {
  LOW_TIME_SECONDS,
  PASS_MARK,
  QUIZ_DURATION_SECONDS,
  TOTAL_QUESTIONS,
  buildSession,
} from "@/lib/quiz";
import {
  getMutedServerSnapshot,
  getMutedSnapshot,
  playSound,
  setMuted,
  subscribeMute,
} from "@/lib/sound";
import { useTextSize } from "@/lib/use-text-size";
import { useDarkMode } from "@/lib/use-theme";

type Screen = "start" | "quiz" | "results";

const SESSION_KEY = "driving-quiz-session-v1";

type PersistedSession = {
  screen: Screen;
  questions: Question[];
  answers: (number | null)[];
  current: number;
  timeUsed: number;
  expiresAt: number;
};

export default function Home() {
  const { dark, toggle: toggleTheme } = useDarkMode();
  const { textSize, cycle: cycleTextSize } = useTextSize();
  const muted = useSyncExternalStore(subscribeMute, getMutedSnapshot, getMutedServerSnapshot);

  const [screen, setScreen] = useState<Screen>("start");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [current, setCurrent] = useState(0);
  const [timeLeft, setTimeLeft] = useState(QUIZ_DURATION_SECONDS);
  const [timeUsed, setTimeUsed] = useState(0);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Resume an in-progress quiz after a refresh. Storage is read after mount so
  // the server-rendered start screen still matches the first client render.
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as PersistedSession;
          const valid =
            saved.screen === "quiz" &&
            Array.isArray(saved.questions) &&
            saved.questions.length === TOTAL_QUESTIONS &&
            Array.isArray(saved.answers) &&
            saved.answers.length === TOTAL_QUESTIONS &&
            typeof saved.expiresAt === "number" &&
            Number.isFinite(saved.expiresAt);

          if (valid) {
            const remaining = Math.max(
              0,
              Math.ceil((saved.expiresAt - Date.now()) / 1000),
            );
            setQuestions(saved.questions);
            setAnswers(saved.answers);
            setCurrent(
              Math.min(Math.max(0, saved.current), TOTAL_QUESTIONS - 1),
            );
            setTimeLeft(remaining);
            setTimeUsed(Math.min(QUIZ_DURATION_SECONDS, QUIZ_DURATION_SECONDS - remaining));
            setExpiresAt(saved.expiresAt);
            setScreen(remaining > 0 ? "quiz" : "results");
          }
        }
      } catch {
        // Ignore corrupt or unavailable storage and start normally.
      }
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist only while a quiz is active; clear it on start/results screens.
  useEffect(() => {
    if (!hydrated) return;
    try {
      if (screen === "quiz" && questions.length > 0 && expiresAt !== null) {
        const session: PersistedSession = {
          screen,
          questions,
          answers,
          current,
          timeUsed,
          expiresAt,
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      } else {
        localStorage.removeItem(SESSION_KEY);
      }
    } catch {
      // Storage may be blocked; the quiz still works in memory.
    }
  }, [hydrated, screen, questions, answers, current, timeUsed, expiresAt]);

  // Countdown derived from the deadline so time keeps running across refreshes.
  useEffect(() => {
    if (screen !== "quiz" || expiresAt === null) return;
    const update = () =>
      setTimeLeft(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [screen, expiresAt]);

  // Gentle ticking reminder during the last 3 minutes.
  useEffect(() => {
    if (screen !== "quiz" || timeLeft <= 0) return;
    if (timeLeft <= LOW_TIME_SECONDS && timeLeft % 10 === 0) {
      playSound("tick");
    }
  }, [screen, timeLeft]);

  const completeQuiz = useCallback(
    (source: "manual" | "timeout") => {
      const used =
        source === "timeout"
          ? QUIZ_DURATION_SECONDS
          : QUIZ_DURATION_SECONDS - Math.max(0, timeLeft);
      const score = answers.reduce<number>(
        (total, answer, i) =>
          answer !== null && answer === questions[i].correctIndex
            ? total + 1
            : total,
        0,
      );

      track("quiz_completed", {
        score,
        total: TOTAL_QUESTIONS,
        passed: score >= PASS_MARK,
        duration_seconds: used,
        source,
      });

      setTimeUsed(used);
      setScreen("results");
    },
    [answers, questions, timeLeft],
  );

  // Time expired — auto-submit (deferred so the interval state settles first).
  const expired = screen === "quiz" && timeLeft <= 0;
  useEffect(() => {
    if (!expired) return;
    const id = window.setTimeout(() => completeQuiz("timeout"), 0);
    return () => window.clearTimeout(id);
  }, [expired, completeQuiz]);

  const startQuiz = useCallback(() => {
    playSound("select");
    setQuestions(buildSession());
    setAnswers(Array<number | null>(TOTAL_QUESTIONS).fill(null));
    setCurrent(0);
    setTimeLeft(QUIZ_DURATION_SECONDS);
    setTimeUsed(0);
    setExpiresAt(Date.now() + QUIZ_DURATION_SECONDS * 1000);
    setScreen("quiz");
    track("quiz_start", {
      question_count: TOTAL_QUESTIONS,
      duration_seconds: QUIZ_DURATION_SECONDS,
    });
  }, []);

  const handleSelect = useCallback(
    (choiceIndex: number) => {
      setAnswers((previous) => {
        const next = [...previous];
        next[current] = choiceIndex;
        return next;
      });
      const question = questions[current];
      if (question) {
        track("question_answered", {
          question: current + 1,
          correct: choiceIndex === question.correctIndex,
        });
      }
    },
    [current, questions],
  );

  const handleFinish = useCallback(() => {
    playSound("select");
    completeQuiz("manual");
  }, [completeQuiz]);

  const toggleSound = useCallback(() => {
    const next = !muted;
    setMuted(next);
    if (!next) playSound("select");
  }, [muted]);

  return (
    <div className="bg-scene flex min-h-screen flex-col">
      <div aria-hidden className="imigongo-rail imigongo-rail-left hidden lg:block" />
      <div aria-hidden className="imigongo-rail imigongo-rail-right hidden lg:block" />
      <header className="relative sticky top-0 z-20 border-b border-border-soft/70 bg-background/85 backdrop-blur-md">
        <div aria-hidden className="imigongo-band absolute inset-x-0 bottom-0 h-1.5" />
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-rwanda-blue to-rwanda-green text-white shadow-md shadow-rwanda-blue/20">
              <CarFront className="h-5 w-5" aria-hidden />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-bold text-foreground sm:text-base">
                Ikizami cy&rsquo;Umutekano
              </p>
              <p className="text-xs text-muted">wo Muhanda &middot; Kinyarwanda</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <WhatsAppLink />
            <ControlBar
              dark={dark}
              onToggleTheme={toggleTheme}
              muted={muted}
              onToggleSound={toggleSound}
              textSize={textSize}
              onCycleTextSize={cycleTextSize}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        {screen === "start" && <StartScreen onStart={startQuiz} />}
        {screen === "quiz" && questions.length > 0 && (
          <QuizScreen
            questions={questions}
            answers={answers}
            current={current}
            timeLeft={Math.max(0, timeLeft)}
            onSelect={handleSelect}
            onNavigate={setCurrent}
            onFinish={handleFinish}
          />
        )}
        {screen === "results" && questions.length > 0 && (
          <ResultsScreen
            questions={questions}
            answers={answers}
            timeUsedSeconds={timeUsed}
            onRestart={startQuiz}
          />
        )}
        {screen !== "quiz" && <ReviewsSection />}
      </main>

      <Footer />
    </div>
  );
}
