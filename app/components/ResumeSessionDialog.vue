<script lang="ts" setup>
  const modelValue = defineModel<boolean>();

  const emit = defineEmits<{
    resume: [];
    discard: [];
  }>();

  function handleResume() {
    modelValue.value = false;
    emit("resume");
  }

  function handleDiscard() {
    modelValue.value = false;
    emit("discard");
  }
</script>

<template>
  <QDialog :model-value="modelValue" persistent>
    <QCard class="surface-container-low text-body1">
      <QCardSection class="text-h6"> Session en cours </QCardSection>

      <QCardSection class="q-pt-none">
        Vous avez une session de quiz en cours. Voulez-vous la reprendre ?
      </QCardSection>

      <QCardActions align="right">
        <AppBtn label="Non merci" flat @click="handleDiscard" />
        <AppBtn label="Reprendre" class="primary" @click="handleResume" />
      </QCardActions>
    </QCard>
  </QDialog>
</template>
