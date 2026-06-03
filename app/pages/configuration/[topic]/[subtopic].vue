<script lang="ts" setup>
  import hljs from "highlight.js/lib/core";
  import typescript from "highlight.js/lib/languages/typescript";
  import "highlight.js/styles/github-dark.css";

  import type { Firestore } from "firebase/firestore";
  import type { Answer, Question, QuestionEdit } from "~/types";

  definePageMeta({
    middleware: "subtopic-validation",
  });

  hljs.registerLanguage("typescript", typescript);

  const code = hljs.highlight(
    `
/**
  * Représente une réponse de QCU/QCM.
  */
type Answer = {
  /**
    * La réponse.
    */
  label: string;
  /**
    * Est-ce que c'est une bonne réponse ou non.
    * Doit apparaître seulement si "true".
    */
  isAnswer: boolean | null;
};

/**
  * Représente une question de QCU/QCM.
  */
type Question = {
  /**
    * Le texte de la question.
    */
  label: string;
  /**
    * URL de l'image associée à la question s'il y en a.
    */
  image: string | null;
  /**
    * Les réponses possibles.
    */
  answers: Answer[];
  /**
    * L'explication des réponses.
    */
  explanation: string;
};
  `,
    { language: "typescript" },
  );

  const db = inject<Ref<Firestore | null>>("db");

  const route = useRoute();
  const data = useData();

  const questionToEdit = ref<Question | "new" | null>(null);
  const importDialog = ref(false);
  const importedFile = ref<File | null>(null);
  const questionToDelete = ref<Question | null>(null);

  const params = computed(() => getParams(route.params));

  const questions = computed(() => {
    const { topic, subtopic } = params.value;

    const subtopicData = data.value?.[topic]?.[subtopic];

    if (!subtopicData) {
      return [];
    }

    return subtopicData.toSorted((a, b) => a.label.localeCompare(b.label));
  });

  function getAnswerCountLabel(answers: Answer[]) {
    const correctAnswers = answers.filter((answer) => answer.isAnswer);

    return `${answers.length} ${handlePlural(
      "réponse",
      answers.length,
    )} dont ${correctAnswers.length} ${handlePlural(
      "correcte",
      correctAnswers.length,
    )}`;
  }

  async function handleJsonAdd() {
    if (!params.value || !db?.value || !importedFile.value) {
      return;
    }

    const { topic, subtopic } = params.value;

    const fileReader = new FileReader();
    fileReader.onload = async (e) => {
      const content = e.target?.result as string;
      if (!content) return;
      const questionsToImport = JSON.parse(content) as Question[];

      if (!validateData(questionsToImport)) {
        return;
      }

      await addQuestionsToSubtopic(
        db.value!,
        topic,
        subtopic,
        questionsToImport,
        data,
      );
      importDialog.value = false;
      importedFile.value = null;
    };
    fileReader.readAsText(importedFile.value);
  }

  async function handleQuestionDelete(question: Question) {
    if (!db?.value) {
      return;
    }

    const { topic, subtopic } = params.value;

    await removeQuestionsFromSubtopic(
      db.value,
      topic,
      subtopic,
      question,
      data,
    );

    questionToDelete.value = null;
  }

  async function handleQuestionSave(
    question: QuestionEdit,
    originalLabel?: string,
  ) {
    if (!db?.value || !questionToEdit.value) {
      return;
    }

    const { topic, subtopic } = params.value;

    if (typeof subtopic !== "string") {
      return;
    }

    if (questionToEdit.value === "new") {
      await addQuestionsToSubtopic(db.value, topic, subtopic, question, data);
    } else {
      await updateQuestionInSubtopic(
        db.value,
        topic,
        subtopic,
        question,
        data,
        originalLabel,
      );
    }

    questionToEdit.value = null;
  }

  function validateData(questions: Question[]) {
    for (const i in questions) {
      const question = questions[i]!;

      if (question.answers.length < 2) {
        toast(
          `La question n°${i} "${question.label}" doit avoir au moins 2 réponses pour être valide.`,
          "error",
        );
        return false;
      }

      if (question.answers.every((answer) => !answer.isAnswer)) {
        toast(
          `La question n°${i} "${question.label}" doit avoir au moins 1 bonne réponse pour être valide.`,
          "error",
        );
        return false;
      }
    }

    return true;
  }
</script>

<template>
  <div>
    <div :class="[useScreenMd('text-h3', 'text-h4'), 'q-mb-lg']">
      Chapitre "{{ route.params.subtopic }}"
    </div>

    <div class="flex q-mb-sm" :style="{ gap: useScreenMd('1rem') }">
      <QSpace />

      <AppBtn
        icon="upload"
        label="Importer"
        :no-caps="useScreenSm()"
        @click="importDialog = true"
      >
        <QTooltip class="surface-variant text-body2">
          Importer un fichier JSON
        </QTooltip>
      </AppBtn>
      <AppBtn
        icon="add"
        :label="useScreenMd('Ajouter une question', 'Ajouter')"
        :no-caps="useScreenSm()"
        @click="questionToEdit = 'new'"
      />
    </div>

    <QList class="surface-container">
      <QExpansionItem v-for="question in questions" :key="question.label">
        <template #header>
          <QItemSection>
            <QItemLabel>{{ question.label }}</QItemLabel>
            <QItemLabel caption>
              {{ getAnswerCountLabel(question.answers) }}
            </QItemLabel>
          </QItemSection>

          <QItemSection v-if="question.image" side>
            <AppIcon name="image" :size="useScreenSm('md', 'sm')" />
          </QItemSection>
          <QItemSection side :style="useScreenXs('padding-left: 0')">
            <AppBtn
              icon="edit"
              :size="useScreenSm('md', 'sm')"
              @click.stop="questionToEdit = question"
            />
          </QItemSection>
          <QItemSection side :style="useScreenXs('padding-left: 0')">
            <AppBtn
              icon="delete"
              :size="useScreenSm('md', 'sm')"
              class="error-container"
              @click.stop="questionToDelete = question"
            />
          </QItemSection>
        </template>

        <QList class="transparent" separator>
          <QItem v-for="answer in question.answers" :key="answer.label">
            <QItemSection>{{ answer.label }}</QItemSection>
            <QItemSection v-if="answer.isAnswer" side>
              <AppIcon name="check_circle" color="primary" filled />
            </QItemSection>
          </QItem>
        </QList>

        <QSeparator />

        <div class="q-pa-md">
          <b>Explication</b> : {{ question.explanation }}
        </div>
      </QExpansionItem>
    </QList>

    <QuestionEdit v-model="questionToEdit" @save="handleQuestionSave" />

    <DeleteDialog v-model="questionToDelete" @delete="handleQuestionDelete">
      cette question
    </DeleteDialog>

    <QDialog v-model="importDialog">
      <QCard class="surface-container-low text-body1">
        <QCardSection class="text-h4"> Importer un fichier JSON </QCardSection>

        <QCardSection>
          <AppFile
            v-model="importedFile"
            label="Fichier à importer"
            :accept="['json']"
          />
        </QCardSection>

        <QCardSection>
          Pour accélérer la saisie de questions, il est possible d'importer un
          fichier JSON contenant une liste de questions.
        </QCardSection>

        <QCardSection class="q-pt-none">
          Pour ça, chaque question et réponse doit avec un format particulier :
        </QCardSection>

        <pre
          class="text-body2 q-px-md q-ma-md overflow-auto shadow-out dark surface"
          style="border-radius: 0.5rem; max-height: 30rem"
        ><code v-html="code.value" /></pre>

        <QCardActions align="right">
          <AppBtn
            flat
            label="Annuler"
            @click="
              importDialog = false;
              importedFile = null;
            "
          />
          <AppBtn
            class="primary"
            label="Importer"
            :disable="!importedFile"
            @click="handleJsonAdd"
          />
        </QCardActions>
      </QCard>
    </QDialog>
  </div>
</template>
