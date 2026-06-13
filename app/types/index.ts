import type { Course } from "./chapter";

export type ThemePreference = "light" | "dark" | "system";

/**
 * Représente une réponse de QCU/QCM.
 */
export type Answer = {
  /**
   * La réponse.
   */
  label: string;
  /**
   * Est-ce que c'est une bonne réponse ou non.
   * Est Some seulement si `true`, sinon None.
   */
  isAnswer: boolean | null;
};

/**
 * Représente une question de QCU/QCM.
 */
export type Question = {
  /**
   * L'id unique de la question, permettant plusieurs questions avec le même label.
   * Généré automatiquement avec crypto.randomUUID() lors de la création de la question.
   */
  id: string;
  /**
   * Le texte de la question.
   */
  label: string;
  /**
   * URL de l'image associée à la question s'il y en a.
   */
  image: string | null;
  /**
   * Les réponses possibles.
   */
  answers: Array<Answer>;
  /**
   * L'explication de pourquoi les réponses correctes le sont.
   */
  explanation: string;
};

export type QuestionEdit = Omit<Question, "id" | "image"> & {
  id?: string;
  image: string | File | null;
};

export * from "./chapter";

declare global {
  export type UnionFromArray<T extends Readonly<Array<unknown>>> = T[number];

  type CourseData = Record<string, Question[]>;
  type Data = Record<Course, CourseData>;
}
