<script lang="ts" setup>
  const route = useRoute();
  const isDrawerOpen = ref(true);

  watch(route, () => {
    if (!useScreenMd()) {
      isDrawerOpen.value = false;
    }
  });
</script>

<template>
  <QLayout view="hHh Lpr lFf">
    <LayoutHeader v-model="isDrawerOpen" />

    <LayoutDrawer v-model="isDrawerOpen" />

    <QPageContainer>
      <QPage padding class="q-mx-auto" style="max-width: 75rem">
        <slot />
      </QPage>
    </QPageContainer>
  </QLayout>
</template>
