<script lang="ts" setup>
  import fuz from "fuzzysort";

  import type { QSelectProps } from "quasar";
  import type { Subtopic, Topic, Question } from "~/types";

  definePageMeta({
    middleware: "topic-validation",
  });

  interface RevisionOptions {
    limitQuestions: boolean;
    subtopics: Subtopic<Topic>[];
    questionsCount: number;
    splitEvenly: boolean;
  }

  export interface QuestionData {
    question: Question;
    subtopic: Subtopic<Topic>;
  }

  const route = useRoute();
  const data = useData();

  const options = ref<RevisionOptions>({
    subtopics: [],
    limitQuestions: true,
    questionsCount: 70,
    splitEvenly: true,
  });
  const subtopicsOptions = ref<Subtopic<Topic>[]>([]);
  const questions = ref<QuestionData[]>([]);
  const readyToRevise = ref(false);

  const topic = computed(() => getTopicParam(route.params));
  const topicData = computed(() => {
    if (!Object.keys(data.value).length) {
      return;
    }

    return useTopicData(topic.value, data.value);
  });
  const allSubtopics = computed(() =>
    (Object.keys(topicData.value || {}) as Subtopic<Topic>[])
      .filter((subtopic) => topicData.value![subtopic]?.length)
      .toSorted((a, b) => a.localeCompare(b)),
  );

  watch(topicData, () => {
    options.value = {
      subtopics: [],
      limitQuestions: true,
      questionsCount: 70,
      splitEvenly: true,
    };
  });

  watch(
    allSubtopics,
    (newVal) => {
      subtopicsOptions.value = newVal;
    },
    { immediate: true },
  );

  watch(
    options,
    (opts) => {
      if (!topicData.value) {
        return;
      }

      const result: QuestionData[] = [];
      const selectedSubtopics = opts.subtopics.length
        ? opts.subtopics.filter(
            (subtopic) => topicData.value![subtopic]?.length,
          )
        : allSubtopics.value;

      if (!opts.limitQuestions) {
        for (const subtopic of selectedSubtopics) {
          const questionsForSubtopic = topicData.value[subtopic];

          if (!questionsForSubtopic) {
            continue;
          }

          result.push(...withSubtopic(questionsForSubtopic, subtopic));
        }

        questions.value = shuffle(
          result.map((data) => ({
            subtopic: data.subtopic,
            question: {
              ...data.question,
              answers: shuffle(data.question.answers),
            },
          })),
        );
        return;
      }

      if (opts.splitEvenly) {
        const availablePools = selectedSubtopics
          .map((subtopic) => ({
            subtopic,
            questions: shuffle(topicData.value![subtopic] || []),
          }))
          .filter((pool) => pool.questions.length);

        // Shuffle pools to distribute remaining items randomly among tied lengths
        shuffle(availablePools);

        // Sort ascending by available questions so smaller chapters take what they can
        // and larger chapters make up the difference
        availablePools.sort((a, b) => a.questions.length - b.questions.length);

        let needed = opts.questionsCount;

        for (let i = 0; i < availablePools.length; i++) {
          const pool = availablePools[i]!;
          const remainingPoolsCount = availablePools.length - i;
          const fairShare = Math.ceil(needed / remainingPoolsCount);

          const toTake = Math.min(fairShare, pool.questions.length);
          result.push(
            ...withSubtopic(pool.questions.slice(0, toTake), pool.subtopic),
          );
          needed -= toTake;

          if (needed <= 0) break;
        }
      } else {
        const allAvailable: QuestionData[] = [];
        for (const subtopic of selectedSubtopics) {
          const questionsForSubtopic = topicData.value[subtopic];
          if (questionsForSubtopic) {
            allAvailable.push(...withSubtopic(questionsForSubtopic, subtopic));
          }
        }
        result.push(...shuffle(allAvailable).slice(0, opts.questionsCount));
      }

      questions.value = shuffle(
        result.map((q) => ({ ...q, answers: shuffle(q.question.answers) })),
      );
    },
    { deep: true, immediate: true },
  );

  const filterFn: QSelectProps["onFilter"] = (input, update) => {
    if (!input) {
      return update(() => {
        subtopicsOptions.value = allSubtopics.value;
      });
    }

    return update(() => {
      const result = fuz.go(input, allSubtopics.value, {
        threshold: 0.5,
      });

      subtopicsOptions.value = result.map(
        (res) => res.target,
      ) as Subtopic<Topic>[];
    });
  };

  function handleDeleteKey(e: KeyboardEvent & { target: HTMLInputElement }) {
    if (e.target.value) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    options.value.subtopics.pop();
  }

  function withSubtopic(
    questions: Question[],
    subtopic: Subtopic<Topic>,
  ): QuestionData[] {
    return questions.map((question) => ({
      question,
      subtopic,
    }));
  }
</script>

<template>
  <Transition>
    <template v-if="Object.keys(data).length">
      <QPage v-if="topicData && Object.values(topicData).some((q) => q.length)">
        <QCard v-if="!readyToRevise" class="surface-container-low">
          <QCardSection class="text-h6 q-pb-none">
            Avant de commencer à réviser
          </QCardSection>

          <QCardSection>
            <AppSelect
              v-model="options.subtopics"
              :options="subtopicsOptions"
              label="Chapitres à réviser"
              hint="Si aucun chapitre n'est sélectionné, tous les chapitres seront utilisés"
              input-debounce="500"
              use-input
              multiple
              @filter="filterFn"
              @keydown.delete="handleDeleteKey"
            />
          </QCardSection>

          <QCardSection class="text-body1">
            <span class="q-mr-md">Limiter le nombre de questions ?</span>

            <QBtnToggle
              v-model="options.limitQuestions"
              toggle-color="primary-container"
              toggle-text-color="on-primary-container"
              rounded
              :options="[
                {
                  label: 'Oui',
                  value: true,
                },
                {
                  label: 'Non',
                  value: false,
                },
              ]"
            />

            <div v-if="options.limitQuestions" class="q-mt-sm">
              <AppInput
                v-model.number="options.questionsCount"
                type="number"
                label="Nombre de questions"
              />

              <span class="q-mr-md">
                Homogénéiser le nombre de questions par chapitre ?
              </span>

              <QBtnToggle
                v-model="options.splitEvenly"
                toggle-color="primary-container"
                toggle-text-color="on-primary-container"
                rounded
                :options="[
                  {
                    label: 'Oui',
                    value: true,
                  },
                  {
                    label: 'Non',
                    value: false,
                  },
                ]"
              />
            </div>
          </QCardSection>

          <QCardActions align="center">
            <AppBtn
              :label="`Commencer à réviser ${questions.length} ${handlePlural('question', questions.length)}`"
              :disable="!questions.length"
              :class="questions.length ? 'primary' : 'surface-variant'"
              @click="readyToRevise = true"
            />
          </QCardActions>
        </QCard>

        <QuestionsDisplay v-else :questions />
      </QPage>

      <QPage v-else>
        <div class="text-h1 text-center">
          Ce cours n'a encore aucune question.
        </div>
      </QPage>
    </template>
  </Transition>
</template>

<style>
  input[type="number"] {
    -webkit-appearance: textfield;
    -moz-appearance: textfield;
    appearance: textfield;
  }
  input[type="number"]::-webkit-inner-spin-button,
  input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
  }

  .v-enter-active,
  .v-leave-active {
    transition: opacity 0.5s ease;
  }

  .v-enter-from,
  .v-leave-to {
    opacity: 0;
  }
</style>
