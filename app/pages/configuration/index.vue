<script lang="ts" setup>
  import type { Firestore } from "firebase/firestore";
  import type { Subtopic, Topic } from "~/types";

  interface ToDelete {
    topic: Topic;
    subtopic: Subtopic<Topic>;
  }

  const db = inject<Ref<Firestore | null>>("db");
  const data = useData();

  const topicToAddSubtopicTo = ref<Topic | null>(null);
  const newSubtopicName = ref<Subtopic<Topic> | null>(null);
  const toDelete = ref<ToDelete | null>(null);

  async function addNewSubtopic() {
    if (!db?.value || !newSubtopicName.value || !topicToAddSubtopicTo.value) {
      return;
    }

    await addSubtopic(
      db.value,
      topicToAddSubtopicTo.value,
      newSubtopicName.value,
      data,
    );

    topicToAddSubtopicTo.value = null;
    newSubtopicName.value = null;
  }

  function sortObject<T extends Record<string, unknown>>(obj: T) {
    return Object.entries(obj).toSorted((a, b) => a[0].localeCompare(b[0])) as [
      keyof T,
      NonNullable<T[keyof T]>,
    ][];
  }

  async function deleteSubtopic({ topic, subtopic }: ToDelete) {
    if (!db?.value) {
      return;
    }

    await removeSubtopic(db.value, topic, subtopic, data);

    toDelete.value = null;
  }
</script>

<template>
  <div>
    <div class="text-h3 q-mb-lg">Configuration des cours</div>

    <QList class="surface-container-low">
      <QExpansionItem
        v-for="[topic, topicData] in sortObject(data)"
        :key="topic"
      >
        <template #header>
          <QItemSection avatar>
            <AppIcon name="book" />
          </QItemSection>

          <QItemSection>
            <QItemLabel class="text-h6">
              {{ topic }}
            </QItemLabel>
            <QItemLabel class="text-body1 text-weight-light whitespace-nowrap">
              {{ Object.keys(topicData).length }}
              {{ handlePlural("chapitre", Object.keys(topicData).length) }}
            </QItemLabel>
          </QItemSection>

          <QItemSection side>
            <AppBtn
              icon="add"
              :label="useScreenSm('Ajouter un chapitre')"
              :size="useScreenMd('md', 'sm')"
              outline
              color="tertiary"
              @click.stop="topicToAddSubtopicTo = topic as Topic"
            />
          </QItemSection>
        </template>

        <QList separator>
          <QItem
            v-for="[subtopic, questions] in sortObject(topicData)"
            :key="subtopic"
            :inset-level="1"
            style="border-radius: inherit"
          >
            <QItemSection class="text-body1 text-weight-medium">
              <QItemLabel>
                {{ subtopic }}
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
                :to="`configuration/${topic}/${subtopic}`"
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
                  toDelete = { topic, subtopic: subtopic as Subtopic<Topic> }
                "
              />
            </QItemSection>
          </QItem>
        </QList>
      </QExpansionItem>
    </QList>

    <QDialog :model-value="!!topicToAddSubtopicTo" persistent>
      <QCard class="surface-container-low">
        <QCardSection class="text-h6">
          Ajouter un chapitre pour {{ topicToAddSubtopicTo }}
        </QCardSection>

        <QCardSection>
          <AppInput
            v-model="newSubtopicName"
            label="Nom du chapitre à ajouter"
            required
            autofocus
          />
        </QCardSection>

        <QCardActions align="right">
          <AppBtn label="Annuler" flat @click="topicToAddSubtopicTo = null" />
          <AppBtn label="Ajouter" class="primary" @click="addNewSubtopic" />
        </QCardActions>
      </QCard>
    </QDialog>

    <DeleteDialog
      v-slot="props"
      v-model="toDelete"
      title="ce chapitre"
      @delete="deleteSubtopic"
    >
      le chapitre "{{ props.subtopic }}" du cours {{ props.topic }}
    </DeleteDialog>
  </div>
</template>
