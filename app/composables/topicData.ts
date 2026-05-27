import type { Topic } from "~/types";

export const useTopicData = (topic: Topic, data: Partial<Data>) => {
  const decoded = decodeURI(topic);

  if (!(decoded in data)) {
    console.warn({
      decoded,
      data,
    });

    throw new Error(
      "Le cours demandé n'existe pas dans la base de données : " + decoded,
    );
  }

  return data[decoded as Topic];
};
