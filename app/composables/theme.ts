import type { ThemePreference } from "~/types";

function Theme() {
  const current = ref<ThemePreference>("system");
  let cachedPreference: ThemePreference | null = null;

  async function init() {
    // Remove unused class added by Quasar
    document.body.classList.remove("body--light");

    const themeCookie = useCookie<ThemePreference>("theme_preference", {
      default: () => "system",
      maxAge: 60 * 60 * 24 * 365,
    });

    const userPreference = themeCookie.value;

    cachedPreference = userPreference;
    update(userPreference);
  }

  function isDark() {
    return (
      current.value === "dark" ||
      (current.value === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    );
  }

  async function update(theme: ThemePreference) {
    current.value = theme;

    const cls = isDark() ? "dark" : "light";
    const otherCls = isDark() ? "light" : "dark";

    document.body.classList.add(cls);
    document.body.classList.remove(otherCls);

    if (cachedPreference === theme) {
      return;
    }

    const themeCookie = useCookie<ThemePreference>("theme_preference");
    themeCookie.value = theme;
  }

  return {
    init,
    update,
    get isDark() {
      return isDark();
    },
    get current() {
      return current.value;
    },
  };
}

export const useTheme = Theme();
