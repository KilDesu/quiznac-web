import type {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
  WithFieldValue,
} from "firebase/firestore";
import type { SubtopicData } from "~/types";

export const subtopicDataConverter: FirestoreDataConverter<SubtopicData> = {
  toFirestore(subtopicData: WithFieldValue<SubtopicData>): DocumentData {
    // When writing to Firestore, we can return the data as is since it
    // already matches the desired structure.
    // WithFieldValue allows for FieldValue types like serverTimestamp()
    return subtopicData;
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions,
  ): SubtopicData {
    const data = snapshot.data(options);
    // When reading from Firestore, we assert the data structure to our interface.
    // The converter ensures that `snapshot.data()` will return `SubtopicData`
    // when using `.withConverter(subtopicDataConverter)`.
    return {
      questions: data.questions || [],
    } as SubtopicData; // Cast here is safe due to the converter contract
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
