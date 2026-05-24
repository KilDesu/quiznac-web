<script lang="ts" setup>
  import type { QFileProps, QFile } from "quasar";

  // #region:    --Types
  type Model = File[] | File | null;

  type ToExclude =
    | "color"
    | "labelColor"
    | "outlined"
    | "filled"
    | "rounded"
    | "standout"
    | "borderless"
    | "square"
    | "readonly"
    | "multiple"
    | "accept"
    | "modelValue";

  type Props = Omit<QFileProps, ToExclude> & {
    color?: "primary" | "secondary" | "tertiary";
    multiple?: boolean;
    accept?: string[];
    modelValue?: Model;
  };
  // #endregion: --Types

  // #region:    --Defs
  const model = defineModel<Model>({ default: null });

  const props = withDefaults(defineProps<Props>(), {
    modelValue: null,
    color: "primary",
    multiple: false,
    accept: () => ["*"],
  });

  const input = useTemplateRef<QFile>("input");
  // #endregion: --Defs

  // #region:    --Computed
  const highlightColor = computed(() => `var(--${props.color})`);

  const inputProps = computed(() => {
    const { modelValue: _, accept: __, ...rest } = props;
    return rest;
  });

  const acceptString = computed(() => {
    if (props.accept?.includes("*")) return undefined;
    return props.accept?.map((ext) => `.${ext}`).join(",");
  });

  const defaultHint = computed(() =>
    props.accept?.includes("*")
      ? "Fichiers acceptés : tous types de fichiers"
      : `Fichiers acceptés : ${props.accept?.map((ext) => `.${ext}`).join(", ")}`,
  );
  // #endregion: --Computed
</script>

<template>
  <QFile
    v-bind="inputProps"
    ref="input"
    v-model="model"
    clear-icon="sym_r_close"
    :hint="hint ?? defaultHint"
    :error="props.error"
    :error-message="props.errorMessage"
    :accept="acceptString"
    outlined
    clearable
    :style="`--highlight-color: ${highlightColor};`"
  >
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotData">
      <slot :name v-bind="slotData || {}" />
    </template>

    <template #prepend>
      <AppIcon name="attach_file" />
    </template>
  </QFile>
</template>

<style>
  .q-file__dnd {
    border-radius: inherit;
  }
</style>
