import * as firestore from "firebase/firestore";

import { Topics } from "../types";
import type {
  Subtopic,
  SubtopicData,
  Topic,
  Question,
  QuestionEdit,
} from "../types";
import { MetadataConverter, subtopicDataConverter } from "./converter";

export async function addSubtopic(
  db: firestore.Firestore,
  topic: Topic,
  subtopic: Subtopic<Topic>,
  data: Ref<Partial<Data>>,
) {
  const subtopicRef = firestore.doc(db, topic, subtopic);

  await firestore.setDoc(subtopicRef, {
    questions: [],
  });

  await saveDataLocally(topic, subtopic, { questions: [] });
  await updateTimestamps(db, topic);
  data.value = await getAllQuestions(db, true);

  toast(`Chapitre "${subtopic}" ajouté au cours "${topic}"`);
  console.log(`Chapitre "${subtopic}" ajouté au cours "${topic}"`);
}

export async function removeSubtopic(
  db: firestore.Firestore,
  topic: Topic,
  subtopic: Subtopic<Topic>,
  data: Ref<Partial<Data>>,
) {
  const subtopicRef = firestore.doc(db, topic, subtopic);

  await firestore.deleteDoc(subtopicRef);

  let topicData = data.value[topic];
  if (!topicData) {
    return;
  }

  topicData = Object.fromEntries(
    Object.entries(topicData).filter(([key]) => key !== subtopic),
  );
  data.value = {
    ...data.value,
    [topic]: topicData,
  };

  await saveDataLocally(topic, subtopic, null);
  await updateTimestamps(db, topic);

  toast(`Chapitre "${subtopic}" supprimé du cours "${topic}"`);
  console.log(`Chapitre "${subtopic}" supprimé du cours "${topic}"`);
}

export async function getAllQuestions(
  db: firestore.Firestore,
  useLocalData = false,
) {
  if (!db) return {};

  const fetchPromises = Topics.map(async (topic) => {
    const shouldUpdate = await isDataOutOfDate(db, topic);

    if (useLocalData || !shouldUpdate) {
      const localDataStr = localStorage.getItem(topic);
      const localData = localDataStr ? JSON.parse(localDataStr) : null;

      // If there's up-to-date local data, we use it instead of calling firestore
      if (localData) {
        return [topic, localData];
      }
    }

    const subtopicsQuery = firestore
      .collectionGroup(db, topic)
      .withConverter(subtopicDataConverter);

    const snapshot = await tryAsync(
      firestore.getDocs(subtopicsQuery),
      `Aucune donnée pour ${topic}`,
    );

    const currentTopicQuestions: [Subtopic<Topic>, Question[]][] = [];

    snapshot.docs.forEach((docSnap) => {
      if (docSnap.id !== "metadata") {
        const data = docSnap.data();

        if (data.questions) {
          currentTopicQuestions.push([
            docSnap.id as Subtopic<Topic>,
            data.questions,
          ]);
        }
      }
    });

    if (!currentTopicQuestions.length) {
      // No questions for the current topic
      return null;
    }

    const data = Object.fromEntries(currentTopicQuestions);
    // Saving new questions to local file
    localStorage.setItem(topic, JSON.stringify(data));
    await updateTimestamps(db, topic);

    return [topic, data];
  });

  const results = await Promise.all(fetchPromises);
  const validResults = results.filter(
    (res): res is [Topic, TopicData] => res !== null,
  );

  return Object.fromEntries(validResults);
}

export async function updateQuestionInSubtopic(
  db: firestore.Firestore,
  topic: Topic,
  subtopic: Subtopic<Topic>,
  question: QuestionEdit,
  data: Ref<Partial<Data>>,
  originalLabel?: string,
) {
  const convertedQuestion = await convertQuestions(question);

  const subtopicRef = firestore
    .doc(db, topic, subtopic)
    .withConverter(subtopicDataConverter);

  const docSnap = await tryAsync(
    firestore.getDoc(subtopicRef),
    `Impossible de mettre à jour la question dans le chapitre "${subtopic}".`,
  );

  if (!docSnap.exists()) {
    console.warn(
      `Le chapitre "${subtopic}" n'existe pas, impossible de mettre à jour la question.`,
    );
    return;
  }

  const currentSubtopicData = docSnap.data();
  const updatedQuestions = currentSubtopicData.questions.map((q) =>
    q.label === (originalLabel ?? convertedQuestion.label)
      ? convertedQuestion
      : q,
  );

  await firestore.updateDoc(subtopicRef, {
    questions: updatedQuestions,
  });

  await saveDataLocally(topic, subtopic, { questions: updatedQuestions });
  await updateTimestamps(db, topic);
  data.value = await getAllQuestions(db, true);

  toast(`Question mise à jour dans le chapitre "${subtopic}"`);
  console.log(`Question mise à jour dans le chapitre "${subtopic}"`);
}

export async function addQuestionsToSubtopic(
  db: firestore.Firestore,
  topic: Topic,
  subtopic: Subtopic<Topic>,
  questions: QuestionEdit | QuestionEdit[],
  data: Ref<Partial<Data>>,
) {
  const questionsToAdd = Array.isArray(questions) ? questions : [questions];

  const convertedQuestions = await convertQuestions(questionsToAdd);

  const subtopicRef = firestore
    .doc(db, topic, subtopic)
    .withConverter(subtopicDataConverter);

  const docSnap = await tryAsync(
    firestore.getDoc(subtopicRef),
    `Impossible d'ajouter de question au chapitre "${subtopic}".`,
  );

  let currentSubtopicData: SubtopicData | null = null;

  if (!docSnap.exists()) {
    const initialData: SubtopicData = {
      questions: convertedQuestions,
    };
    await firestore.setDoc(subtopicRef, initialData);

    currentSubtopicData = initialData;
  } else {
    await firestore.updateDoc(subtopicRef, {
      questions: firestore.arrayUnion(...questionsToAdd),
    });

    const updatedDocSnap = await firestore.getDoc(subtopicRef);
    if (updatedDocSnap.exists()) {
      currentSubtopicData = updatedDocSnap.data();
    } else {
      throw new Error(
        `Erreur : Le document "${subtopicRef.path}" a disparu après sa mise-à-jour.`,
      );
    }
  }

  await saveDataLocally(topic, subtopic, currentSubtopicData);
  await updateTimestamps(db, topic);
  data.value = await getAllQuestions(db, true);

  toast(
    `${handlePlural("Question", questionsToAdd.length)} ${handlePlural("ajoutée", questionsToAdd.length)} au chapitre "${subtopic}"`,
  );
  console.log(`Question(s) ajoutée(s) au chapitre "${subtopic}"`);
}

export async function removeQuestionsFromSubtopic(
  db: firestore.Firestore,
  topic: Topic,
  subtopic: Subtopic<Topic>,
  questions: Question | Question[],
  data: Ref<Partial<Data>>,
) {
  const questionsToRemove = Array.isArray(questions) ? questions : [questions];

  const subtopicRef = firestore
    .doc(db, topic, subtopic)
    .withConverter(subtopicDataConverter);

  const docSnap = await tryAsync(
    firestore.getDoc(subtopicRef),
    `Impossible de supprimer la question du chapitre "${subtopic}".`,
  );

  if (!docSnap.exists()) {
    console.warn(
      `Le chapitre "${subtopic}" n'existe pas, aucune question à supprimer.`,
    );
    return;
  }

  await firestore.updateDoc(subtopicRef, {
    questions: firestore.arrayRemove(...questionsToRemove),
  });

  const updatedDocSnap = await firestore.getDoc(subtopicRef);
  let currentSubtopicData: SubtopicData | null = null;

  if (updatedDocSnap.exists()) {
    currentSubtopicData = updatedDocSnap.data();
  } else {
    throw new Error(
      `Erreur : Le document "${subtopicRef.path}" a disparu après sa mise-à-jour.`,
    );
  }

  await saveDataLocally(topic, subtopic, currentSubtopicData);
  await updateTimestamps(db, topic);
  data.value = await getAllQuestions(db, true);

  toast(
    `${handlePlural("Question", questionsToRemove.length)} ${handlePlural(
      "supprimée",
      questionsToRemove.length,
    )} du chapitre "${subtopic}"`,
  );
  console.log(`Question(s) supprimée(s) du chapitre "${subtopic}"`);
}

async function isDataOutOfDate(db: firestore.Firestore, topic: Topic) {
  const timestampsStr = localStorage.getItem("timestamps");
  const timestamps = timestampsStr ? JSON.parse(timestampsStr) : {};
  const lastLocalUpdate = timestamps[topic];

  if (!lastLocalUpdate) {
    return true;
  }

  const topicMetaRef = firestore
    .doc(db, topic, "metadata")
    .withConverter(MetadataConverter);
  const lastRemoteUpdate = await firestore.getDoc(topicMetaRef);

  const remoteTimestamp = lastRemoteUpdate.data()?.updatedAt || 0;

  return remoteTimestamp > lastLocalUpdate;
}

async function updateTimestamps(db: firestore.Firestore, topic: Topic) {
  const topicMetaRef = firestore.doc(db, topic, "metadata");
  const now = Date.now();

  await firestore.setDoc(topicMetaRef, { updatedAt: now }, { merge: true });

  const timestampsStr = localStorage.getItem("timestamps");
  const timestamps = timestampsStr ? JSON.parse(timestampsStr) : {};
  timestamps[topic] = now;
  localStorage.setItem("timestamps", JSON.stringify(timestamps));
}

async function saveDataLocally(
  topic: Topic,
  subtopic: Subtopic<Topic>,
  data: SubtopicData | null,
) {
  const topicDataStr = localStorage.getItem(topic);
  const topicData = topicDataStr ? JSON.parse(topicDataStr) : {};

  if (!data) {
    delete topicData[subtopic];
  } else {
    topicData[subtopic] = data.questions;
  }

  localStorage.setItem(topic, JSON.stringify(topicData));
}

async function convertQuestions(questions: QuestionEdit): Promise<Question>;
async function convertQuestions(questions: QuestionEdit[]): Promise<Question[]>;
async function convertQuestions(
  questions: QuestionEdit | QuestionEdit[],
): Promise<Question | Question[]> {
  if (!Array.isArray(questions)) {
    if (!questions.image) {
      return questions as Question;
    }

    return {
      ...questions,
      image: await addImageToDb(questions.image),
    };
  }

  return Promise.all(questions.map((q) => convertQuestions(q)));
}
