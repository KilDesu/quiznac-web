export default defineNuxtRouteMiddleware((to) => {
  const topic = validateTopic(to.params);

  if (!topic) {
    toast(`Le cours ${to.params.topic} est invalide`, "error");
    return navigateTo("/");
  }

  const subtopic = validateSubtopic(to.params, topic);

  if (!subtopic) {
    toast(`Le chapitre ${to.params.subtopic} est invalide`, "error");
    return navigateTo(`/configuration/${topic}`);
  }
});
