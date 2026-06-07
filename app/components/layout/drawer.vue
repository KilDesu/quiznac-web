<script lang="ts" setup>
  const isDrawerOpen = defineModel<boolean>();
  // const isUpdateAvailable = ref(false);

  const data = useData();

  const courses = computed(() => Object.keys(data.value));
</script>

<template>
  <QDrawer
    :model-value="isDrawerOpen"
    side="left"
    :width="200"
    :breakpoint="900"
    persistent
    class="surface-container flex column justify-between"
  >
    <QList class="scroll col text-weight-bold">
      <QItem to="/">
        <QItemSection avatar>
          <AppIcon name="home" />
        </QItemSection>
        <QItemSection> Accueil </QItemSection>
      </QItem>

      <QItem to="/configuration">
        <QItemSection avatar>
          <AppIcon name="settings" />
        </QItemSection>
        <QItemSection> Configuration </QItemSection>
      </QItem>

      <QSeparator />

      <QItem
        v-for="course in courses"
        :key="course"
        :to="`/review/${encodeURI(course)}`"
      >
        <QItemSection avatar>
          <AppIcon name="chevron_right" />
        </QItemSection>
        <QItemSection> {{ course }} </QItemSection>
      </QItem>
    </QList>
  </QDrawer>
</template>

<style>
  .q-drawer__content {
    box-shadow: var(--inner-shadow);
  }
</style>
