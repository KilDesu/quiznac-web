export default defineNuxtRouteMiddleware((to) => {
  const topic = validateTopic(to.params);

  if (!topic) {
    toast(`Le cours ${to.params.topic} est invalide`, "error");
    return navigateTo("/");
  }
});
