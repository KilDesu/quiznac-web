import type { RouteParams } from "vue-router";
import {
  Courses,
  type QuiznacRouteParams,
  type Chapter,
  type Course,
} from "~/types";

export function validateCourse(params: RouteParams) {
  const { course } = params;

  if (
    !course ||
    typeof course !== "string" ||
    !Courses.includes(course as Course)
  ) {
    return null;
  }

  return course as Course;
}

export function validateChapter(params: RouteParams) {
  const { chapter } = params;

  if (!chapter || typeof chapter !== "string") {
    return null;
  }

  return chapter;
}

export function getCourseParam(params: RouteParams) {
  const { course } = params;

  return course as Course;
}

export function getChapterParam(params: RouteParams) {
  const { chapter } = params;

  return chapter as Chapter;
}

export function getParams(params: RouteParams): QuiznacRouteParams {
  const course = getCourseParam(params);
  const chapter = getChapterParam(params);

  return { course, chapter };
}
