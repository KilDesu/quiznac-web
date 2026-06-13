import * as firestore from "firebase/firestore";

import { Courses } from "../types";
import type {
  Chapter,
  ChapterData,
  Course,
  Question,
  QuestionEdit,
} from "../types";
import { MetadataConverter, chapterDataConverter } from "./converter";

export async function addChapter(
  db: firestore.Firestore,
  course: Course,
  chapter: Chapter,
  data: Ref<Partial<Data>>,
) {
  const chapterRef = firestore.doc(db, course, chapter);

  await firestore.setDoc(chapterRef, {
    questions: [],
  });

  await saveDataLocally(course, chapter, { questions: [] });
  await updateTimestamps(db, course);
  data.value = await getAllQuestions(db, true);

  toast(`Chapitre "${chapter}" ajouté au cours "${course}"`);
  console.log(`Chapitre "${chapter}" ajouté au cours "${course}"`);
}

export async function removeChapter(
  db: firestore.Firestore,
  course: Course,
  chapter: Chapter,
  data: Ref<Partial<Data>>,
) {
  const chapterRef = firestore.doc(db, course, chapter);

  await firestore.deleteDoc(chapterRef);

  let courseData = data.value[course];
  if (!courseData) {
    return;
  }

  courseData = Object.fromEntries(
    Object.entries(courseData).filter(([key]) => key !== chapter),
  );
  data.value = {
    ...data.value,
    [course]: courseData,
  };

  await saveDataLocally(course, chapter, null);
  await updateTimestamps(db, course);

  toast(`Chapitre "${chapter}" supprimé du cours "${course}"`);
  console.log(`Chapitre "${chapter}" supprimé du cours "${course}"`);
}

export async function getAllQuestions(
  db: firestore.Firestore,
  useLocalData = false,
) {
  if (!db) return {};

  const fetchPromises = Courses.map(async (course) => {
    const shouldUpdate = await isDataOutOfDate(db, course);

    if (useLocalData || !shouldUpdate) {
      const localDataStr = localStorage.getItem(course);
      const localData = localDataStr ? JSON.parse(localDataStr) : null;

      // If there's up-to-date local data, we use it instead of calling firestore
      if (localData) {
        return [course, localData];
      }
    }

    const chaptersQuery = firestore
      .collectionGroup(db, course)
      .withConverter(chapterDataConverter);

    const snapshot = await tryAsync(
      firestore.getDocs(chaptersQuery),
      `Aucune donnée pour ${course}`,
    );

    const currentCourseQuestions: [Chapter, Question[]][] = [];

    snapshot.docs.forEach((docSnap) => {
      if (docSnap.id !== "metadata") {
        const data = docSnap.data();

        if (data.questions) {
          currentCourseQuestions.push([docSnap.id as Chapter, data.questions]);
        }
      }
    });

    if (!currentCourseQuestions.length) {
      // No questions for the current course
      return null;
    }

    const data = Object.fromEntries(currentCourseQuestions);
    // Saving new questions to local file
    localStorage.setItem(course, JSON.stringify(data));
    await updateTimestamps(db, course);

    return [course, data];
  });

  const results = await Promise.all(fetchPromises);
  const validResults = results.filter(
    (res): res is [Course, CourseData] => res !== null,
  );

  return Object.fromEntries(validResults);
}

export async function updateQuestionInChapter(
  db: firestore.Firestore,
  course: Course,
  chapter: Chapter,
  question: QuestionEdit,
  data: Ref<Partial<Data>>,
) {
  const convertedQuestion = await convertQuestions(question);

  const chapterRef = firestore
    .doc(db, course, chapter)
    .withConverter(chapterDataConverter);

  const docSnap = await tryAsync(
    firestore.getDoc(chapterRef),
    `Impossible de mettre à jour la question dans le chapitre "${chapter}".`,
  );

  if (!docSnap.exists()) {
    console.warn(
      `Le chapitre "${chapter}" n'existe pas, impossible de mettre à jour la question.`,
    );
    return;
  }

  const currentChapterData = docSnap.data();
  const updatedQuestions = currentChapterData.questions.map((q) =>
    q.id === convertedQuestion.id ? convertedQuestion : q,
  );

  await firestore.updateDoc(chapterRef, {
    questions: updatedQuestions,
  });

  await saveDataLocally(course, chapter, { questions: updatedQuestions });
  await updateTimestamps(db, course);
  data.value = await getAllQuestions(db, true);

  toast(`Question mise à jour dans le chapitre "${chapter}"`);
  console.log(`Question mise à jour dans le chapitre "${chapter}"`);
}

export async function addQuestionsToChapter(
  db: firestore.Firestore,
  course: Course,
  chapter: Chapter,
  questions: QuestionEdit | QuestionEdit[],
  data: Ref<Partial<Data>>,
) {
  const questionsToAdd = Array.isArray(questions) ? questions : [questions];

  const convertedQuestions = await convertQuestions(questionsToAdd);

  const chapterRef = firestore
    .doc(db, course, chapter)
    .withConverter(chapterDataConverter);

  const docSnap = await tryAsync(
    firestore.getDoc(chapterRef),
    `Impossible d'ajouter de question au chapitre "${chapter}".`,
  );

  let currentChapterData: ChapterData | null = null;

  if (!docSnap.exists()) {
    const initialData: ChapterData = {
      questions: convertedQuestions,
    };
    await firestore.setDoc(chapterRef, initialData);

    currentChapterData = initialData;
  } else {
    await firestore.updateDoc(chapterRef, {
      questions: firestore.arrayUnion(...convertedQuestions),
    });

    const updatedDocSnap = await firestore.getDoc(chapterRef);
    if (updatedDocSnap.exists()) {
      currentChapterData = updatedDocSnap.data();
    } else {
      throw new Error(
        `Erreur : Le document "${chapterRef.path}" a disparu après sa mise-à-jour.`,
      );
    }
  }

  await saveDataLocally(course, chapter, currentChapterData);
  await updateTimestamps(db, course);
  data.value = await getAllQuestions(db, true);

  toast(
    `${handlePlural("Question", questionsToAdd.length)} ${handlePlural("ajoutée", questionsToAdd.length)} au chapitre "${chapter}"`,
  );
  console.log(`Question(s) ajoutée(s) au chapitre "${chapter}"`);
}

export async function removeQuestionsFromChapter(
  db: firestore.Firestore,
  course: Course,
  chapter: Chapter,
  questions: Question | Question[],
  data: Ref<Partial<Data>>,
) {
  const questionsToRemove = Array.isArray(questions) ? questions : [questions];

  const chapterRef = firestore
    .doc(db, course, chapter)
    .withConverter(chapterDataConverter);

  const docSnap = await tryAsync(
    firestore.getDoc(chapterRef),
    `Impossible de supprimer la question du chapitre "${chapter}".`,
  );

  if (!docSnap.exists()) {
    console.warn(
      `Le chapitre "${chapter}" n'existe pas, aucune question à supprimer.`,
    );
    return;
  }

  await firestore.updateDoc(chapterRef, {
    questions: firestore.arrayRemove(...questionsToRemove),
  });

  const updatedDocSnap = await firestore.getDoc(chapterRef);
  let currentChapterData: ChapterData | null = null;

  if (updatedDocSnap.exists()) {
    currentChapterData = updatedDocSnap.data();
  } else {
    throw new Error(
      `Erreur : Le document "${chapterRef.path}" a disparu après sa mise-à-jour.`,
    );
  }

  await saveDataLocally(course, chapter, currentChapterData);
  await updateTimestamps(db, course);
  data.value = await getAllQuestions(db, true);

  toast(
    `${handlePlural("Question", questionsToRemove.length)} ${handlePlural(
      "supprimée",
      questionsToRemove.length,
    )} du chapitre "${chapter}"`,
  );
  console.log(`Question(s) supprimée(s) du chapitre "${chapter}"`);
}

async function isDataOutOfDate(db: firestore.Firestore, course: Course) {
  const timestampsStr = localStorage.getItem("timestamps");
  const timestamps = timestampsStr ? JSON.parse(timestampsStr) : {};
  const lastLocalUpdate = timestamps[course];

  if (!lastLocalUpdate) {
    return true;
  }

  const courseMetaRef = firestore
    .doc(db, course, "metadata")
    .withConverter(MetadataConverter);
  const lastRemoteUpdate = await firestore.getDoc(courseMetaRef);

  const remoteTimestamp = lastRemoteUpdate.data()?.updatedAt || 0;

  return remoteTimestamp > lastLocalUpdate;
}

async function updateTimestamps(db: firestore.Firestore, course: Course) {
  const courseMetaRef = firestore.doc(db, course, "metadata");
  const now = Date.now();

  await firestore.setDoc(courseMetaRef, { updatedAt: now }, { merge: true });

  const timestampsStr = localStorage.getItem("timestamps");
  const timestamps = timestampsStr ? JSON.parse(timestampsStr) : {};
  timestamps[course] = now;
  localStorage.setItem("timestamps", JSON.stringify(timestamps));
}

async function saveDataLocally(
  course: Course,
  chapter: Chapter,
  data: ChapterData | null,
) {
  const courseDataStr = localStorage.getItem(course);
  const courseData = courseDataStr ? JSON.parse(courseDataStr) : {};

  if (!data) {
    delete courseData[chapter];
  } else {
    courseData[chapter] = data.questions;
  }

  localStorage.setItem(course, JSON.stringify(courseData));
}

async function convertQuestions(questions: QuestionEdit): Promise<Question>;
async function convertQuestions(questions: QuestionEdit[]): Promise<Question[]>;
async function convertQuestions(
  questions: QuestionEdit | QuestionEdit[],
): Promise<Question | Question[]> {
  if (!Array.isArray(questions)) {
    const id = questions.id ?? crypto.randomUUID();

    if (!questions.image) {
      return { ...questions, id, image: null } as Question;
    }

    const url = await addImageToDb(questions.image);

    return {
      ...questions,
      id,
      image: url,
    };
  }

  return Promise.all(questions.map((q) => convertQuestions(q)));
}
