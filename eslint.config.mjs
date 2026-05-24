// @ts-check
import withNuxt from "./.nuxt/eslint.config.mjs";

export default withNuxt(
  // Your custom configs here
  [
    {
      rules: {
        "vue/html-self-closing": "off",
        "vue/no-v-html": "off",
        "@typescript-eslint/no-dynamic-delete": "off",
      },
    },
  ],
);
