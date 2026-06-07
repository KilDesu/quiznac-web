<script lang="ts" setup>
  import fuz from "fuzzysort";

  import type { QSelectProps } from "quasar";
  import type { Chapter, Question } from "~/types";

  definePageMeta({
    middleware: "course-validation",
  });

  interface RevisionOptions {
    limitQuestions: boolean;
    chapters: Chapter[];
    questionsCount: number;
    splitEvenly: boolean;
  }

  export interface QuestionData {
    question: Question;
    chapter: Chapter;
  }

  const route = useRoute();
  const data = useData();

  const options = ref<RevisionOptions>({
    chapters: [],
    limitQuestions: true,
    questionsCount: 70,
    splitEvenly: true,
  });
  const chaptersOptions = ref<Chapter[]>([]);
  const questions = ref<QuestionData[]>([]);
  const readyToRevise = ref(false);

  const course = computed(() => getCourseParam(route.params));
  const courseData = computed(() => {
    if (!Object.keys(data.value).length) {
      return;
    }

    return useCourseData(course.value, data.value);
  });
  const allChapters = computed(() =>
    (Object.keys(courseData.value || {}) as Chapter[])
      .filter((chapter) => courseData.value![chapter]?.length)
      .toSorted((a, b) => a.localeCompare(b)),
  );

  watch(courseData, () => {
    options.value = {
      chapters: [],
      limitQuestions: true,
      questionsCount: 70,
      splitEvenly: true,
    };
  });

  watch(
    allChapters,
    (newVal) => {
      chaptersOptions.value = newVal;
    },
    { immediate: true },
  );

  watch(
    options,
    (opts) => {
      if (!courseData.value) {
        return;
      }

      const result: QuestionData[] = [];
      const selectedChapters = opts.chapters.length
        ? opts.chapters.filter((chapter) => courseData.value![chapter]?.length)
        : allChapters.value;

      if (!opts.limitQuestions) {
        for (const chapter of selectedChapters) {
          const questionsForChapter = courseData.value[chapter];

          if (!questionsForChapter) {
            continue;
          }

          result.push(...withChapter(questionsForChapter, chapter));
        }

        questions.value = shuffle(
          result.map((data) => ({
            chapter: data.chapter,
            question: {
              ...data.question,
              answers: shuffle(data.question.answers),
            },
          })),
        );
        return;
      }

      if (opts.splitEvenly) {
        const availablePools = selectedChapters
          .map((chapter) => ({
            chapter,
            questions: shuffle(courseData.value![chapter] || []),
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
            ...withChapter(pool.questions.slice(0, toTake), pool.chapter),
          );
          needed -= toTake;

          if (needed <= 0) break;
        }
      } else {
        const allAvailable: QuestionData[] = [];
        for (const chapter of selectedChapters) {
          const questionsForChapter = courseData.value[chapter];
          if (questionsForChapter) {
            allAvailable.push(...withChapter(questionsForChapter, chapter));
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
        chaptersOptions.value = allChapters.value;
      });
    }

    return update(() => {
      const result = fuz.go(input, allChapters.value, {
        threshold: 0.5,
      });

      chaptersOptions.value = result.map((res) => res.target) as Chapter[];
    });
  };

  function handleDeleteKey(e: KeyboardEvent & { target: HTMLInputElement }) {
    if (e.target.value) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    options.value.chapters.pop();
  }

  function withChapter(
    questions: Question[],
    chapter: Chapter,
  ): QuestionData[] {
    return questions.map((question) => ({
      question,
      chapter,
    }));
  }
</script>

<template>
  <Transition>
    <template v-if="Object.keys(data).length">
      <QPage
        v-if="courseData && Object.values(courseData).some((q) => q.length)"
      >
        <QCard v-if="!readyToRevise" class="surface-container-low">
          <QCardSection class="text-h6 q-pb-none">
            Avant de commencer à réviser
          </QCardSection>

          <QCardSection>
            <AppSelect
              v-model="options.chapters"
              :options="chaptersOptions"
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
