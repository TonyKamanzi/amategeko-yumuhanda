import { questionBank, type Question } from "./questions";

export const TOTAL_QUESTIONS = 20;
export const QUIZ_DURATION_SECONDS = 20 * 60;
export const LOW_TIME_SECONDS = 3 * 60;
export const PASS_MARK = 12;
export const TOTAL_BANK = questionBank.length;

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Build a fresh quiz session: 20 random questions from the bank.
 * Choice order is preserved exactly as printed in the source PDF.
 */
export function buildSession(count = TOTAL_QUESTIONS): Question[] {
  return shuffle(questionBank).slice(0, count);
}

export function formatTime(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
