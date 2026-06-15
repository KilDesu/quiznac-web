import type { QuestionData } from "~/pages/review/[course].vue";

export interface QuizSessionData {
  /** The course identifier — used to verify the session matches the current page */
  course: string;
  /** The full questions array (already shuffled with shuffled answers) */
  questions: QuestionData[];
  /** Current question index */
  viewIndex: number;
  /** Per-question validation state */
  validated: boolean[];
  /** Per-question correctness */
  wasCorrect: (boolean | null)[];
  /** Per-question single-choice draft */
  draftRadioIndex: (number | null)[];
  /** Per-question multi-choice draft */
  draftCheckboxIndices: number[][];
}

const STORAGE_KEY = "quiznac-session";

export function useQuizSession() {
  function save(session: QuizSessionData): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Storage full or unavailable — silently ignore
    }
  }

  function load(): QuizSessionData | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }
      return JSON.parse(raw) as QuizSessionData;
    } catch {
      // Corrupt data — discard
      clear();
      return null;
    }
  }

  function clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Unavailable — silently ignore
    }
  }

  return { save, load, clear };
}
