import type { Question } from "~/types";

export type Chapter = string;

export interface ChapterData {
  questions: Question[];
}

export interface QuiznacRouteParams {
  course: Course;
  chapter: Chapter;
}

export type ChapterDocument = {
  [K in Chapter]: ChapterData;
};

export const Courses = [
  "Aéronef",
  "ATLA",
  "Équipements et systèmes",
  "Météo",
  "Moteur",
  "Navigation",
] as const;
export type Course = UnionFromArray<typeof Courses>;
