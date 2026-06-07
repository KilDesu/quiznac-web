import type { Course } from "~/types";

export const useCourseData = (course: Course, data: Partial<Data>) => {
  const decoded = decodeURI(course);

  if (!(decoded in data)) {
    console.warn({
      decoded,
      data,
    });

    throw new Error(
      "Le cours demandé n'existe pas dans la base de données : " + decoded,
    );
  }

  return data[decoded as Course];
};
