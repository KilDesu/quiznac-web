<script lang="ts" setup>
  import type { Firestore } from "firebase/firestore";
  import type { Chapter, Course } from "~/types";

  interface ToDelete {
    course: Course;
    chapter: Chapter<Course>;
  }

  const db = inject<Ref<Firestore | null>>("db");
  const data = useData();

  const courseToAddChapterTo = ref<Course | null>(null);
  const newChapterName = ref<Chapter<Course> | null>(null);
  const toDelete = ref<ToDelete | null>(null);

  async function addNewChapter() {
    if (!db?.value || !newChapterName.value || !courseToAddChapterTo.value) {
      return;
    }

    await addChapter(
      db.value,
      courseToAddChapterTo.value,
      newChapterName.value,
      data,
    );

    courseToAddChapterTo.value = null;
    newChapterName.value = null;
  }

  function sortObject<T extends Record<string, unknown>>(obj: T) {
    return Object.entries(obj).toSorted((a, b) => a[0].localeCompare(b[0])) as [
      keyof T,
      NonNullable<T[keyof T]>,
    ][];
  }

  async function deleteChapter({ course, chapter }: ToDelete) {
    if (!db?.value) {
      return;
    }

    await removeChapter(db.value, course, chapter, data);

    toDelete.value = null;
  }
</script>

<template>
  <div>
    <div class="text-h3 q-mb-lg">Configuration des cours</div>

    <QList class="surface-container-low">
      <QExpansionItem
        v-for="[course, courseData] in sortObject(data)"
        :key="course"
      >
        <template #header>
          <QItemSection avatar>
            <AppIcon name="book" />
          </QItemSection>

          <QItemSection>
            <QItemLabel class="text-h6">
              {{ course }}
            </QItemLabel>
            <QItemLabel class="text-body1 text-weight-light whitespace-nowrap">
              {{ Object.keys(courseData).length }}
              {{ handlePlural("chapitre", Object.keys(courseData).length) }}
            </QItemLabel>
          </QItemSection>

          <QItemSection side>
            <AppBtn
              icon="add"
              :label="useScreenSm('Ajouter un chapitre')"
              :size="useScreenMd('md', 'sm')"
              outline
              color="tertiary"
              @click.stop="courseToAddChapterTo = course as Course"
            />
          </QItemSection>
        </template>

        <QList separator>
          <QItem
            v-for="[chapter, questions] in sortObject(courseData)"
            :key="chapter"
            :inset-level="1"
            style="border-radius: inherit"
          >
            <QItemSection class="text-body1 text-weight-medium">
              <QItemLabel>
                {{ chapter }}
              </QItemLabel>
              <QItemLabel
                class="text-caption text-weight-light whitespace-nowrap"
              >
                {{ questions.length }}
                {{ handlePlural("question", questions.length) }}
              </QItemLabel>
            </QItemSection>

            <QItemSection side>
              <AppBtn
                :to="`configuration/${course}/${chapter}`"
                icon="edit"
                flat
                @click.stop
              />
            </QItemSection>
            <QItemSection side>
              <AppBtn
                icon="delete"
                class="error-container"
                @click.stop="
                  toDelete = { course, chapter: chapter as Chapter<Course> }
                "
              />
            </QItemSection>
          </QItem>
        </QList>
      </QExpansionItem>
    </QList>

    <QDialog :model-value="!!courseToAddChapterTo" persistent>
      <QCard class="surface-container-low">
        <QCardSection class="text-h6">
          Ajouter un chapitre pour {{ courseToAddChapterTo }}
        </QCardSection>

        <QCardSection>
          <AppInput
            v-model="newChapterName"
            label="Nom du chapitre à ajouter"
            required
            autofocus
          />
        </QCardSection>

        <QCardActions align="right">
          <AppBtn label="Annuler" flat @click="courseToAddChapterTo = null" />
          <AppBtn label="Ajouter" class="primary" @click="addNewChapter" />
        </QCardActions>
      </QCard>
    </QDialog>

    <DeleteDialog
      v-slot="props"
      v-model="toDelete"
      title="ce chapitre"
      @delete="deleteChapter"
    >
      le chapitre "{{ props.chapter }}" du cours {{ props.course }}
    </DeleteDialog>
  </div>
</template>
