"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { CarFront } from "lucide-react";
import ControlBar from "@/components/ControlBar";
import StartScreen from "@/components/StartScreen";
import QuizScreen from "@/components/QuizScreen";
import ResultsScreen from "@/components/ResultsScreen";
import type { Question } from "@/lib/questions";
import {
  LOW_TIME_SECONDS,
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
import { useDarkMode } from "@/lib/use-theme";

type Screen = "start" | "quiz" | "results";

export default function Home() {
  const { dark, toggle: toggleTheme } = useDarkMode();
  const muted = useSyncExternalStore(subscribeMute, getMutedSnapshot, getMutedServerSnapshot);

  const [screen, setScreen] = useState<Screen>("start");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [current, setCurrent] = useState(0);
  const [timeLeft, setTimeLeft] = useState(QUIZ_DURATION_SECONDS);
  const [timeUsed, setTimeUsed] = useState(0);

  // 20-minute countdown while the quiz is running.
  useEffect(() => {
    if (screen !== "quiz") return;
    const id = window.setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [screen]);

  // Gentle ticking reminder during the last 3 minutes.
  useEffect(() => {
    if (screen !== "quiz" || timeLeft <= 0) return;
    if (timeLeft <= LOW_TIME_SECONDS && timeLeft % 10 === 0) {
      playSound("tick");
    }
  }, [screen, timeLeft]);

  // Time expired — auto-submit (deferred so the interval state settles first).
  const expired = screen === "quiz" && timeLeft <= 0;
  useEffect(() => {
    if (!expired) return;
    const id = window.setTimeout(() => {
      setTimeUsed(QUIZ_DURATION_SECONDS);
      setScreen("results");
    }, 0);
    return () => window.clearTimeout(id);
  }, [expired]);

  const startQuiz = useCallback(() => {
    playSound("select");
    setQuestions(buildSession());
    setAnswers(Array<number | null>(TOTAL_QUESTIONS).fill(null));
    setCurrent(0);
    setTimeLeft(QUIZ_DURATION_SECONDS);
    setTimeUsed(0);
    setScreen("quiz");
  }, []);

  const handleSelect = useCallback(
    (choiceIndex: number) => {
      setAnswers((previous) => {
        const next = [...previous];
        next[current] = choiceIndex;
        return next;
      });
    },
    [current],
  );

  const handleFinish = useCallback(() => {
    setTimeUsed(QUIZ_DURATION_SECONDS - Math.max(0, timeLeft));
    playSound("select");
    setScreen("results");
  }, [timeLeft]);

  const toggleSound = useCallback(() => {
    const next = !muted;
    setMuted(next);
    if (!next) playSound("select");
  }, [muted]);

  return (
    <div className="bg-scene flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-border-soft/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-rwanda-blue to-rwanda-green text-white shadow-md shadow-rwanda-blue/20">
              <CarFront className="h-5 w-5" aria-hidden />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-bold text-foreground sm:text-base">
                Ikizami cy&rsquo;Umutekano
              </p>
              <p className="text-xs text-muted">mu Muhanda &middot; Kinyarwanda</p>
            </div>
          </div>
          <ControlBar
            dark={dark}
            onToggleTheme={toggleTheme}
            muted={muted}
            onToggleSound={toggleSound}
          />
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
      </main>

      <footer className="border-t border-border-soft/70 bg-background/60 py-6">
        <p className="mx-auto max-w-4xl px-4 text-center text-xs leading-relaxed text-muted sm:px-6">
          Kwitegura ikizami cy&rsquo;umutekano mu muhanda &mdash; ibiganiro n&rsquo;ibibazo
          ni ibigitegwa gusa. Menya amategeko y&rsquo;umu Rwanda mu gitabo cya
          Leta.
        </p>
      </footer>
    </div>
  );
}
