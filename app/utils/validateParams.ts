import type { RouteParams } from "vue-router";
import {
  Subtopics,
  Topics,
  type QuiznacRouteParams,
  type Subtopic,
  type Topic,
} from "~/types";

export function validateTopic(params: RouteParams) {
  const { topic } = params;

  if (!topic || typeof topic !== "string" || !Topics.includes(topic as Topic)) {
    return null;
  }

  return topic as Topic;
}

export function validateSubtopic(params: RouteParams, topic: Topic) {
  const { subtopic } = params;

  if (
    !subtopic ||
    typeof subtopic !== "string" ||
    !Subtopics[topic].includes(subtopic as Subtopic<Topic>)
  ) {
    return null;
  }

  return subtopic as Subtopic<Topic>;
}

export function getTopicParam(params: RouteParams) {
  const { topic } = params;

  return topic as Topic;
}

export function getSubtopicParam(params: RouteParams) {
  const { subtopic } = params;

  return subtopic as Subtopic<Topic>;
}

export function getParams(params: RouteParams): QuiznacRouteParams {
  const topic = getTopicParam(params);
  const subtopic = getSubtopicParam(params);

  return { topic, subtopic };
}
