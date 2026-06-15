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
  /** Per-question selected answer indices */
  draftSelections: number[][];
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
      const data = JSON.parse(raw);

      // Migrate old format (draftRadioIndex + draftCheckboxIndices) → draftSelections
      if (data.draftRadioIndex && !data.draftSelections) {
        data.draftSelections = (data.draftRadioIndex as (number | null)[]).map(
          (radio: number | null, i: number) => {
            const checkboxes: number[] =
              data.draftCheckboxIndices?.[i] ?? [];
            return checkboxes.length > 0
              ? checkboxes
              : radio !== null && radio !== undefined
                ? [radio]
                : [];
          },
        );
        delete data.draftRadioIndex;
        delete data.draftCheckboxIndices;
      }

      return data as QuizSessionData;
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
