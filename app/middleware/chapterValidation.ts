export default defineNuxtRouteMiddleware((to) => {
  const course = validateCourse(to.params);

  if (!course) {
    toast(`Le cours ${to.params.course} est invalide`, "error");
    return navigateTo("/");
  }

  const chapter = validateChapter(to.params);

  if (!chapter) {
    toast(`Le chapitre ${to.params.chapter} est invalide`, "error");
    return navigateTo(`/configuration/${course}`);
  }
});
