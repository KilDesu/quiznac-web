export default defineNuxtRouteMiddleware((to) => {
  const course = validateCourse(to.params);

  if (!course) {
    toast(`Le cours ${to.params.course} est invalide`, "error");
    return navigateTo("/");
  }
});
