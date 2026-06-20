export function initTheme(uiConfig) {
  const html = document.documentElement;
  const themeToggleContainer = document.getElementById("themeToggleContainer");
  const mode = uiConfig.theme;

  const applyTheme = (isDark) => {
    if (isDark) html.classList.add("dark");
    else html.classList.remove("dark");
  };

  const getSystemPreference = () =>
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  let isDark = false;

  if (mode === "dark") {
    isDark = true;
  } else if (mode === "light") {
    isDark = false;
  } else if (mode === "auto") {
    isDark = getSystemPreference();
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (e) => {
        if (uiConfig.theme === "auto") applyTheme(e.matches);
      });
  } else if (mode === "manual") {
    const cached = localStorage.getItem("wakejs-theme");
    isDark = cached ? cached === "dark" : getSystemPreference();
  }

  applyTheme(isDark);

  if (themeToggleContainer) {
    renderThemeButton(themeToggleContainer, isDark, applyTheme);
  }
}

function renderThemeButton(container, currentIsDark, applyTheme) {
  container.innerHTML = `
        <button id="themeBtn" class="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-black/10 dark:bg-white/10 border border-white/10 hover:bg-black/20 dark:hover:bg-white/20 transition-all duration-300 group overflow-hidden shadow-inner" title="Changer le thème">
            <div class="relative w-6 h-6 flex items-center justify-center">
                <i class="fas fa-sun text-lg text-amber-400 absolute transition-all duration-500 ${currentIsDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50"}"></i>
                <i class="fas fa-moon text-lg text-blue-300 absolute transition-all duration-500 ${currentIsDark ? "opacity-0 rotate-90 scale-50" : "opacity-100 rotate-0 scale-100"}"></i>
            </div>
        </button>
    `;

  const btn = document.getElementById("themeBtn");
  btn.onclick = () => {
    const isNowDark = !document.documentElement.classList.contains("dark");
    applyTheme(isNowDark);
    localStorage.setItem("wakejs-theme", isNowDark ? "dark" : "light");

    const sun = btn.querySelector(".fa-sun");
    const moon = btn.querySelector(".fa-moon");

    if (isNowDark) {
      sun.classList.replace("opacity-0", "opacity-100");
      sun.classList.remove("-rotate-90", "scale-50");
      moon.classList.replace("opacity-100", "opacity-0");
      moon.classList.add("rotate-90", "scale-50");
    } else {
      sun.classList.replace("opacity-100", "opacity-0");
      sun.classList.add("-rotate-90", "scale-50");
      moon.classList.replace("opacity-0", "opacity-100");
      moon.classList.remove("rotate-90", "scale-50");
    }
  };
}
