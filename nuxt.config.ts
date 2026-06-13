// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: false },
  modules: ["nuxt-quasar-ui", "@nuxt/eslint", "@nuxt/image"],
  css: ["~/css/main.css"],
  ssr: false,

  // Enables the development server to be discoverable by other devices when running on iOS physical devices
  devServer: {
    host: "0",
  },

  nitro: {
    preset: "vercel",
  },

  image: {
    domains: ["https://i.ibb.co"],
  },

  imports: {
    presets: [
      {
        from: "firebase/firestore",
        imports: [
          {
            name: "*",
            as: "firestore",
          },
        ],
      },
    ],
  },

  quasar: {
    extras: {
      font: "roboto-font",
      fontIcons: ["material-symbols-rounded"],
    },
    lang: "fr",
    plugins: ["Notify"],
  },
});
