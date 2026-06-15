<script lang="ts" setup>
  /**
   * @file QuestionsDisplay.vue
   * @description Composant principal d'affichage et de gestion d'un quiz interactif.
   *
   * Gère l'intégralité du cycle de vie d'une session de quiz :
   * - Navigation séquentielle entre les questions (avant/arrière)
   * - Saisie des réponses (radio pour choix unique, checkboxes pour choix multiples)
   * - Validation des réponses avec feedback immédiat (correct/incorrect + explication)
   * - Persistance de la session en cours via `useQuizSession` (localStorage)
   * - Restauration d'une session précédemment interrompue
   * - Calcul et affichage des résultats finaux avec revue des erreurs
   */

  import type { Question } from "~/types";
  import type { QuestionData } from "~/pages/review/[course].vue";
  import type { QuizSessionData } from "~/composables/quizSession";

  /**
   * @property {QuestionData[]} questions - Liste des questions à afficher, chacune contenant
   *   la question elle-même et le chapitre associé.
   * @property {string} [course] - Identifiant du cours. Nécessaire pour la sauvegarde
   *   de session ; si absent, la persistance est désactivée.
   * @property {QuizSessionData} [restoredState] - État d'une session précédente à restaurer.
   *   Quand fourni, l'état du quiz est réhydraté une seule fois au montage.
   */
  const props = defineProps<{
    /**
     * Liste des questions à afficher, chacune contenant
     * la question elle-même et le chapitre associé.
     */
    questions: QuestionData[];
    /**
     * Identifiant du cours. Nécessaire pour la sauvegarde
     * de session ; si absent, la persistance est désactivée.
     */
    course?: string;

    /**
     * État d'une session précédente à restaurer.
     * Quand fourni, l'état du quiz est réhydraté une seule fois au montage.
     */
    restoredState?: QuizSessionData;
  }>();

  /**
   * @event finished - Émis lorsque l'utilisateur termine le quiz (naturellement ou anticipément).
   * @param payload
   * @param payload.answered - Nombre de questions auxquelles l'utilisateur a répondu.
   * @param payload.correct - Nombre de bonnes réponses.
   * @param payload.total - Nombre total de questions dans le quiz.
   */
  const emit = defineEmits<{
    finished: [payload: { answered: number; correct: number; total: number }];
  }>();

  /** Méthodes de persistance de session (sauvegarde/suppression dans le localStorage). */
  const { save: saveToStorage, clear: clearStorage } = useQuizSession();

  /** Phase du composant : `"quiz"` pendant la session, `"results"` à l'affichage des résultats. */
  type Phase = "quiz" | "results";

  // ─── État réactif ─────────────────────────────────────────────────────────────

  /** Phase courante du quiz. */
  const phase = ref<Phase>("quiz");

  /** Index de la question actuellement affichée (0-based). */
  const viewIndex = ref(0);

  /**
   * Tableau de booléens indiquant, pour chaque question, si elle a été validée.
   * `validated[i] === true` signifie que la question `i` a reçu une réponse définitive.
   */
  const validated = ref<boolean[]>([]);

  /**
   * Résultat de la validation pour chaque question.
   * - `true` : réponse correcte
   * - `false` : réponse incorrecte
   * - `null` : pas encore validée
   */
  const wasCorrect = ref<(boolean | null)[]>([]);

  /**
   * Indices des réponses sélectionnées par l'utilisateur pour chaque question.
   * Représentation unifiée : un choix unique est un tableau à un élément (ex. `[2]`),
   * un choix multiple est un tableau trié de plusieurs indices (ex. `[0, 2, 3]`).
   */
  const draftSelections = ref<number[][]>([]);

  /** Message d'erreur affiché quand la validation est bloquée (ex. : aucune bonne réponse configurée). */
  const validateBlockedMessage = ref("");

  /**
   * Garde empêchant la restauration de s'exécuter plus d'une fois.
   * Non-réactif car il s'agit d'un flag interne consommé uniquement dans `initFromQuestions`.
   */
  let hasRestoredSession = false;

  // ─── Propriétés calculées ─────────────────────────────────────────────────────

  /** Données de la question courante, ou `null` si l'index est hors limites. */
  const currentQuestionData = computed(
    () => props.questions[viewIndex.value] ?? null,
  );

  /** Statistiques de la session en cours (questions répondues, correctes, total). */
  const resultsSummary = computed(() => answeredStats());

  /** Vrai si l'utilisateur peut revenir à la question précédente. */
  const canGoPrev = computed(
    () => phase.value === "quiz" && viewIndex.value > 0,
  );

  /**
   * Vrai si l'utilisateur peut avancer à la question suivante.
   * On ne peut avancer que vers une question déjà validée (en dessous de la frontière).
   * Ne peux pas avancer si aucune réponse n'est sélectionnée.
   */
  const canGoNext = computed(
    () => phase.value === "quiz" && viewIndex.value < frontier.value,
  );

  /**
   * La « frontière » représente l'index de la prochaine question non validée.
   * C'est la limite au-delà de laquelle l'utilisateur ne peut pas naviguer.
   *
   * - Si toutes les questions sont validées, vaut `questions.length` (fin du quiz).
   * - Sinon, vaut l'index de la première question non encore validée.
   */
  const frontier = computed(() => {
    const notValidatedIndex = validated.value.findIndex((v) => !v);
    return notValidatedIndex === -1
      ? props.questions.length
      : notValidatedIndex;
  });

  /**
   * Vrai si l'utilisateur peut modifier sa sélection de réponse pour la question courante.
   * Conditions : être en phase quiz, être sur la question frontière, et ne pas l'avoir encore validée.
   */
  const canEditSelection = computed(() => {
    if (phase.value !== "quiz") {
      return false;
    }

    const index = viewIndex.value;
    return (
      index === frontier.value &&
      index < props.questions.length &&
      !validated.value[index]
    );
  });

  /**
   * Options formatées pour le composant `QOptionGroup` (radio) de la question courante.
   * Chaque option contient un `label` et un `value` correspondant à l'index de la réponse.
   */
  const radioOptions = computed(() => {
    const question = currentQuestionData.value?.question;
    if (!question) {
      return [];
    }
    return question.answers.map((answer, index) => ({
      label: answer.label,
      value: index,
    }));
  });

  /**
   * Indices des questions auxquelles l'utilisateur a répondu incorrectement.
   * Utilisé dans la phase résultats pour la section « Revoir les erreurs ».
   */
  const errorReviewIndices = computed(() => {
    const out: number[] = [];

    for (let i = 0; i < props.questions.length; i++) {
      if (validated.value[i] && !wasCorrect.value[i]) {
        out.push(i);
      }
    }
    return out;
  });

  // ─── Watchers ─────────────────────────────────────────────────────────────────

  /**
   * Réinitialise (ou restaure) l'état du quiz à chaque changement de la liste
   * des questions. Déclenché immédiatement au montage (`immediate: true`).
   * La comparaison est superficielle (`deep: false`) : on réagit uniquement
   * quand la référence du tableau change, pas quand son contenu est muté.
   */
  watch(
    () => props.questions,
    () => {
      initFromQuestions();
    },
    { immediate: true, deep: false },
  );

  // ─── Utilitaires sur les questions ────────────────────────────────────────────

  /**
   * Retourne les indices des réponses correctes pour une question donnée.
   * @param question - La question à analyser.
   * @returns Indices (0-based) des réponses marquées comme correctes.
   */
  function correctIndices(question: Question): number[] {
    return question.answers
      .map((answer, index) => (answer.isAnswer ? index : -1))
      .filter((index) => index >= 0);
  }

  /**
   * Compte le nombre de réponses correctes pour une question.
   * @param question - La question à analyser.
   * @returns Nombre de réponses marquées comme correctes.
   */
  function countCorrectAnswers(question: Question): number {
    return question.answers.filter((answer) => answer.isAnswer).length;
  }

  /**
   * Détermine si une question admet plusieurs réponses correctes.
   * Utilisé pour choisir entre l'affichage radio (choix unique) et checkbox (choix multiples).
   * @param question - La question à analyser.
   * @returns `true` si plus d'une réponse est correcte.
   */
  function isMultipleCorrect(question: Question): boolean {
    return countCorrectAnswers(question) > 1;
  }

  // ─── Initialisation et persistance ────────────────────────────────────────────

  /**
   * Initialise l'état du quiz, soit en restaurant une session précédente,
   * soit en créant un état vierge.
   *
   * La restauration ne se produit qu'une seule fois (gardée par `hasRestoredSession`)
   * pour éviter d'écraser l'état en cas de re-déclenchement du watcher.
   */
  function initFromQuestions() {
    if (props.restoredState && !hasRestoredSession) {
      hasRestoredSession = true;
      viewIndex.value = props.restoredState.viewIndex;
      validated.value = [...props.restoredState.validated];
      wasCorrect.value = [...props.restoredState.wasCorrect];
      draftSelections.value = props.restoredState.draftSelections.map((arr) => [
        ...arr,
      ]);
      phase.value = "quiz";
      validateBlockedMessage.value = "";
      return;
    }

    const questionsCount = props.questions.length;
    validated.value = Array(questionsCount).fill(false);
    wasCorrect.value = Array(questionsCount).fill(null);
    draftSelections.value = Array.from({ length: questionsCount }, () => []);
    viewIndex.value = 0;
    phase.value = "quiz";
    validateBlockedMessage.value = "";
  }

  /**
   * Persiste l'état courant de la session dans le localStorage.
   * Ne fait rien si aucun identifiant de cours n'est fourni.
   */
  function saveSession() {
    if (!props.course) {
      return;
    }
    saveToStorage({
      course: props.course,
      questions: props.questions,
      viewIndex: viewIndex.value,
      validated: validated.value,
      wasCorrect: wasCorrect.value,
      draftSelections: draftSelections.value,
    });
  }

  // ─── Navigation ───────────────────────────────────────────────────────────────

  /** Recule d'une question si la navigation arrière est possible. */
  function goPrev() {
    if (canGoPrev.value) {
      viewIndex.value--;
    }
  }

  /**
   * Avance à la question suivante si la navigation avant est possible.
   * Sauvegarde la session après chaque avancement pour ne pas perdre la progression.
   */
  function goNext() {
    if (canGoNext.value) {
      viewIndex.value++;
      saveSession();
    }
  }

  // ─── Validation des réponses ──────────────────────────────────────────────────

  /**
   * Compare deux tableaux de nombres en tant qu'ensembles (ordre ignoré).
   * @param arr1 - Premier ensemble d'indices.
   * @param arr2 - Second ensemble d'indices.
   * @returns `true` si les deux ensembles contiennent exactement les mêmes éléments.
   */
  function setsEqual(arr1: number[], arr2: number[]): boolean {
    if (arr1.length !== arr2.length) {
      return false;
    }
    const sortedA = arr1.toSorted((x, y) => x - y);
    const sortedB = arr2.toSorted((x, y) => x - y);
    return sortedA.every((v, i) => v === sortedB[i]);
  }

  /**
   * Valide la réponse de l'utilisateur pour la question courante (celle à la frontière).
   *
   * Déroulement :
   * 1. Vérifie que la question n'est pas déjà validée et qu'elle existe.
   * 2. Vérifie qu'au moins une bonne réponse est configurée ; sinon, affiche un message d'erreur.
   * 3. Compare la sélection de l'utilisateur aux réponses correctes via `setsEqual`.
   * 4. Marque la question comme validée et enregistre le résultat (correct/incorrect).
   */
  function validateCurrent() {
    validateBlockedMessage.value = "";
    const i = frontier.value;
    if (i >= props.questions.length || validated.value[i]) {
      return;
    }
    const question = props.questions[i]?.question;
    if (!question) {
      return;
    }

    const correct = correctIndices(question);
    if (correct.length === 0) {
      validateBlockedMessage.value =
        "Cette question n'a aucune bonne réponse configurée.";
      return;
    }

    const picked = draftSelections.value[i] ?? [];
    const ok = setsEqual(picked, correct);

    validated.value[i] = true;
    wasCorrect.value[i] = ok;
    saveSession();
  }

  // ─── Statistiques et résultats ────────────────────────────────────────────────

  /**
   * Calcule les statistiques de la session en cours.
   * @returns
   *   - `answered` : nombre de questions validées
   *   - `correct` : nombre de bonnes réponses
   *   - `total` : nombre total de questions
   */
  function answeredStats() {
    let answered = 0;
    let correct = 0;
    const n = props.questions.length;
    for (let i = 0; i < n; i++) {
      if (validated.value[i]) {
        answered++;
        if (wasCorrect.value[i]) {
          correct++;
        }
      }
    }
    return { answered, correct, total: n };
  }

  /**
   * Passe à la phase résultats : supprime la session sauvegardée,
   * bascule sur l'écran de résultats, et émet l'événement `finished`.
   */
  function goToResults() {
    clearStorage();
    phase.value = "results";
    const { answered, correct, total } = answeredStats();
    emit("finished", { answered, correct, total });
  }

  /**
   * Raccourci pour terminer le quiz de manière anticipée.
   * Les questions non validées ne sont pas comptabilisées dans le score.
   */
  function finishEarly() {
    goToResults();
  }

  /**
   * Réinitialise complètement le quiz : supprime la session sauvegardée
   * et recrée un état vierge à partir des questions.
   */
  function resetQuiz() {
    clearStorage();
    initFromQuestions();
  }

  // ─── Gestion des sélections utilisateur ───────────────────────────────────────

  /**
   * Ajoute ou retire un index de réponse pour une question à choix multiples.
   * Ne fait rien si la question n'est pas modifiable ou si l'index ne correspond pas
   * à la question courante.
   *
   * @param questionIndex - Index de la question concernée.
   * @param answerIndex - Index de la réponse à cocher/décocher.
   * @param checked - `true` pour cocher, `false` pour décocher.
   */
  function toggleAnswer(
    questionIndex: number,
    answerIndex: number,
    checked: boolean,
  ) {
    if (!canEditSelection.value || viewIndex.value !== questionIndex) {
      return;
    }
    const row = draftSelections.value[questionIndex] ?? [];
    draftSelections.value[questionIndex] = checked
      ? [...new Set([...row, answerIndex])].sort((a, b) => a - b)
      : row.filter((x) => x !== answerIndex);
  }

  /**
   * Sélectionne une unique réponse pour une question à choix unique.
   * @param questionIndex - Index de la question concernée.
   * @param answerIndex - Index de la réponse sélectionnée.
   */
  function selectAnswer(questionIndex: number, answerIndex: number) {
    if (!canEditSelection.value || viewIndex.value !== questionIndex) {
      return;
    }
    draftSelections.value[questionIndex] = [answerIndex];
  }

  // ─── Formatage d'affichage ────────────────────────────────────────────────────

  /**
   * Construit une chaîne lisible à partir d'indices de réponses.
   * Utilisé pour afficher les réponses correctes ou les choix de l'utilisateur dans les résultats.
   *
   * @param question - La question dont on extrait les labels.
   * @param indices - Indices des réponses à afficher.
   * @returns Labels séparés par des virgules, avec fallback « Réponse N » si le label est vide.
   */
  function answerLabels(question: Question, indices: number[]): string {
    return indices
      .filter((i) => i >= 0 && i < question.answers.length)
      .map((i) => question.answers[i]!.label)
      .join(", ");
  }

  /**
   * Retourne les indices des réponses sélectionnées par l'utilisateur pour une question donnée.
   *
   * @param questionIndex - Index de la question dans le tableau.
   * @returns Indices des réponses choisies par l'utilisateur.
   */
  function userPickedIndices(questionIndex: number): number[] {
    return [...(draftSelections.value[questionIndex] ?? [])];
  }

  function getEndMessage(percentage: number) {
    switch (true) {
      case percentage === 100:
        return "Machine ! 🔥";
      case percentage >= 75:
        return "Ça passe ! 😎";
      case percentage >= 60:
        return "Pas loin, encore un petit effort ! 🏃‍♂️";
      case percentage >= 50:
        return "Il faut bosser, mais t'es sur la bonne voie ! 📚";
      case percentage >= 10:
        return "Va sérieusement falloir s'y mettre... 🫠";
      default:
        return "Bruh 💀";
    }
  }
</script>

<template>
  <div v-if="!questions.length" class="column items-center q-pa-lg">
    <QCard
      class="surface-container-low q-pa-lg"
      style="width: min(480px, 100%); border-radius: 0.75rem"
    >
      <div class="text-body1 text-on-surface-variant text-center">
        Aucune question à afficher.
      </div>
    </QCard>
  </div>

  <div v-else-if="phase === 'quiz'" class="column q-gutter-md">
    <QCard
      class="surface-container-low"
      style="border-radius: 0.75rem; border: 1px solid var(--outline)"
    >
      <QCardSection class="row items-center no-wrap q-py-sm">
        <div
          class="column"
          style="min-width: 0; overflow: hidden; white-space: nowrap"
        >
          <span class="text-subtitle2 text-on-surface-variant">
            Question {{ viewIndex + 1 }} / {{ questions.length }} -
            {{ currentQuestionData?.chapter || "Pas de question" }}
          </span>
        </div>
        <QSpace />
        <div class="row q-gutter-xs">
          <AppBtn
            flat
            dense
            round
            icon="chevron_left"
            :disable="!canGoPrev"
            aria-label="Précédent"
            @click="goPrev"
          />
          <AppBtn
            flat
            dense
            round
            icon="chevron_right"
            :disable="!canGoNext"
            aria-label="Suivant"
            @click="goNext"
          />
        </div>
      </QCardSection>

      <QSeparator style="background: var(--outline)" />

      <template v-if="currentQuestionData">
        <QCardSection class="column q-gutter-md">
          <div class="text-h6" style="word-break: break-word">
            {{ currentQuestionData.question.label }}
          </div>

          <div
            v-if="currentQuestionData.question.image"
            :key="currentQuestionData.question.id"
            class="flex justify-center q-pr-md"
            style="width: 100%; min-width: 0"
          >
            <NuxtImg
              v-slot="{ src, isLoaded }"
              :src="currentQuestionData.question.image"
              :custom="true"
            >
              <img
                v-if="isLoaded"
                :alt="`Image relative à la question &quot;${currentQuestionData.question.label}&quot;`"
                :src
                class="rounded-borders block"
                style="
                  max-width: 100vw;
                  max-height: 20rem;
                  object-fit: contain;
                  border-radius: 0.75rem;
                "
              />

              <QSkeleton
                v-else
                height="20rem"
                width="32rem"
                animation="pulse"
                class="rounded-borders block"
                style="
                  max-width: 100vw;
                  max-height: 20rem;
                  object-fit: contain;
                  border-radius: 0.75rem;
                "
              />
            </NuxtImg>
          </div>
        </QCardSection>

        <QCardSection v-if="validateBlockedMessage">
          <QBanner dense rounded class="error-container q-pa-sm">
            {{ validateBlockedMessage }}
          </QBanner>
        </QCardSection>

        <QCardSection>
          <div
            v-if="isMultipleCorrect(currentQuestionData.question)"
            class="column q-gutter-sm"
          >
            <span class="text-subtitle2 text-on-surface-variant">
              Plusieurs réponses correctes possibles
            </span>
            <div
              v-for="(answer, idx) in currentQuestionData.question.answers"
              :key="idx"
              class="row items-center no-wrap q-gutter-sm"
            >
              <QCheckbox
                :model-value="
                  draftSelections[viewIndex]?.includes(idx) ?? false
                "
                :disable="!canEditSelection"
                :label="answer.label"
                dense
                class="text-body1"
                @update:model-value="
                  (v) => toggleAnswer(viewIndex, idx, Boolean(v))
                "
              />
            </div>
          </div>

          <QOptionGroup
            v-else
            :model-value="draftSelections[viewIndex]?.[0] ?? null"
            :options="radioOptions"
            type="radio"
            color="primary"
            :disable="!canEditSelection"
            @update:model-value="(v) => selectAnswer(viewIndex, v as number)"
          />
        </QCardSection>
        <QCardSection v-if="validated[viewIndex]">
          <QBanner
            dense
            rounded
            :class="
              wasCorrect[viewIndex]
                ? 'primary-container q-pa-md'
                : 'error-container q-pa-md'
            "
          >
            <div class="text-weight-medium q-mb-sm">
              {{
                wasCorrect[viewIndex]
                  ? "Bonne réponse 🎉"
                  : "Mauvaise réponse 🫠"
              }}
            </div>
            <template v-if="!wasCorrect[viewIndex]">
              <div
                v-for="(correct, index) in [
                  correctIndices(currentQuestionData.question),
                ]"
                :key="index"
                class="text-body2 q-mb-sm"
              >
                <span class="text-weight-medium">
                  {{ handlePlural("Réponse", correct.length) }}
                  {{ handlePlural("attendue", correct.length) }} :
                </span>
                {{ answerLabels(currentQuestionData.question, correct) }}
              </div>
            </template>
            <div
              v-if="currentQuestionData.question.explanation.trim()"
              class="text-body2"
              style="white-space: pre-line"
            >
              <span class="text-weight-medium">Explication : </span>
              {{ currentQuestionData.question.explanation }}
            </div>
          </QBanner>
        </QCardSection>
      </template>

      <QSeparator style="background: var(--outline)" />

      <QCardActions class="q-pa-md row wrap q-gutter-sm justify-between">
        <div class="col"></div>

        <div
          v-for="(isLast, index) in [frontier === questions.length]"
          :key="index"
          class="col text-center"
        >
          <AppBtn
            v-if="canGoNext"
            :label="isLast ? 'Terminer' : 'Continuer'"
            no-caps
            class="primary"
            @click="() => (isLast ? goToResults() : goNext())"
          />

          <AppBtn
            v-else-if="canEditSelection"
            label="Valider"
            :disable="!(draftSelections[viewIndex] ?? []).length"
            no-caps
            class="primary"
            @click="validateCurrent"
          />
        </div>

        <div class="col text-right">
          <AppBtn flat no-caps label="Terminer le quiz" @click="finishEarly" />
        </div>
      </QCardActions>
    </QCard>
  </div>

  <div v-else class="column q-gutter-md">
    <QCard
      class="surface-container-low"
      style="border-radius: 0.75rem; border: 1px solid var(--outline)"
    >
      <QCardSection>
        <div class="text-h6 q-mb-md">Résultats</div>
        <div class="text-body1 column q-gutter-xs">
          <span
            v-for="(percent, index) in [
              (
                (resultsSummary.correct * 100) /
                resultsSummary.answered
              ).toFixed(0),
            ]"
            :key="index"
          >
            Score :
            <span class="text-weight-medium">
              <template v-if="resultsSummary.answered > 0">
                {{ percent }}% ({{ resultsSummary.correct }}/{{
                  resultsSummary.answered
                }})
              </template>
              —
              {{ getEndMessage(+percent) }}
            </span>
          </span>
          <span
            v-if="resultsSummary.answered === 0"
            class="text-on-surface-variant"
          >
            Aucune question validée — le score reflète uniquement les questions
            auxquelles vous avez répondu.
          </span>
        </div>
      </QCardSection>

      <QSeparator style="background: var(--outline)" />

      <QCardSection v-if="errorReviewIndices.length">
        <div class="text-subtitle1 q-mb-sm">Revoir les erreurs</div>
        <QList bordered separator class="rounded-borders surface-container">
          <QExpansionItem
            v-for="questionIndex in errorReviewIndices"
            :key="questionIndex"
            dense
            separator
            header-class="text-body2"
          >
            <template #header>
              <QItemSection avatar>
                <AppIcon name="error" color="error" filled />
              </QItemSection>
              <QItemSection>
                <div class="text-weight-medium ellipsis-2-lines">
                  {{ questions[questionIndex]!.question.label }}
                </div>
                <div class="text-caption text-on-surface-variant">
                  Question {{ questionIndex + 1 }}
                </div>
              </QItemSection>
            </template>
            <QCard flat class="surface-container-high q-ma-sm">
              <QCardSection class="column q-gutter-sm text-body2">
                <div>
                  <span class="text-weight-medium">Votre réponse : </span>
                  {{
                    answerLabels(
                      questions[questionIndex]!.question,
                      userPickedIndices(questionIndex),
                    ) || "—"
                  }}
                </div>
                <div
                  v-for="(correct, index) in [
                    correctIndices(questions[questionIndex]!.question),
                  ]"
                  :key="index"
                >
                  <span class="text-weight-medium">
                    {{ handlePlural("Réponse", correct.length) }}
                    {{ handlePlural("correcte", correct.length) }} :
                  </span>
                  {{
                    answerLabels(questions[questionIndex]!.question, correct)
                  }}
                </div>
                <div
                  v-if="questions[questionIndex]!.question.explanation.trim()"
                >
                  <span class="text-weight-medium">Explication : </span>
                  {{ questions[questionIndex]!.question.explanation }}
                </div>
              </QCardSection>
            </QCard>
          </QExpansionItem>
        </QList>
      </QCardSection>

      <QCardSection v-else-if="resultsSummary.answered > 0">
        <div class="text-body2 primary-container q-pa-md rounded-borders">
          Aucune erreur parmi les questions auxquelles vous avez répondu.
        </div>
      </QCardSection>

      <QSeparator style="background: var(--outline)" />

      <QCardActions align="center" class="q-pa-md">
        <AppBtn
          flat
          no-caps
          label="Rejouer"
          class="primary"
          @click="resetQuiz"
        />
      </QCardActions>
    </QCard>
  </div>
</template>

<style scoped>
  .rounded-borders {
    border-radius: 0.75rem;
  }

  .ellipsis-2-lines {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
