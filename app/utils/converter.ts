import type {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
  WithFieldValue,
} from "firebase/firestore";
import type { ChapterData } from "~/types";

export const chapterDataConverter: FirestoreDataConverter<ChapterData> = {
  toFirestore(chapterData: WithFieldValue<ChapterData>): DocumentData {
    // When writing to Firestore, we can return the data as is since it
    // already matches the desired structure.
    // WithFieldValue allows for FieldValue types like serverTimestamp()
    return chapterData;
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions,
  ): ChapterData {
    const data = snapshot.data(options);
    // When reading from Firestore, we assert the data structure to our interface.
    // The converter ensures that `snapshot.data()` will return `ChapterData`
    // when using `.withConverter(chapterDataConverter)`.
    return {
      questions: data.questions || [],
    } as ChapterData; // Cast here is safe due to the converter contract
  },
};

export const MetadataConverter: FirestoreDataConverter<{ updatedAt: number }> =
  {
    toFirestore(data: WithFieldValue<{ updatedAt: number }>): DocumentData {
      return data;
    },
    fromFirestore(
      snapshot: QueryDocumentSnapshot,
      options: SnapshotOptions,
    ): { updatedAt: number } {
      const data = snapshot.data(options);
      return { updatedAt: data.updatedAt };
    },
  };
