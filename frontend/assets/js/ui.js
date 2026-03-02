import { callApi, fetchHostsData, searchHosts } from "./api.js";

const config = await fetch("./assets/config/config.json").then((r) => r.json());
const roomsData = await fetch("./assets/config/rooms.json").then((r) =>
  r.json(),
);
const enabledSiteKeys = Object.keys(config.sites).filter(
  (key) => config.sites[key].enabled,
);

const apiStatusText = document.getElementById("apiStatusText");
const apiStatusDot = document.getElementById("apiStatusDot");
const apiStatusPing = document.getElementById("apiStatusPing");
const deptGrid = document.getElementById("deptGrid");
const sallesGrid = document.getElementById("sallesGrid");
const hostsGrid = document.getElementById("hostsGrid");
const sectionSalles = document.getElementById("sectionSalles");
const sectionHosts = document.getElementById("sectionHosts");
const labelSalle = document.getElementById("labelSalle");
const hostCounter = document.getElementById("hostCounter");
const pingBtn = document.getElementById("pingBtn");
const wakeBtn = document.getElementById("wakeBtn");
const shutdownBtn = document.getElementById("shutdownBtn");
const selectAllBtn = document.getElementById("selectAllBtn");
const globalSearch = document.getElementById("globalSearch");
const searchResults = document.getElementById("searchResults");
const themeToggleContainer = document.getElementById("themeToggleContainer");

let currentSalle = null;
let autoRefreshInterval = null;

function applyTheme(isDark) {
  if (isDark) document.documentElement.classList.add("dark");
  else document.documentElement.classList.remove("dark");
}

function updateTheme() {
  const mode = config.ui.theme;
  let isDark = false;
  if (mode === "dark") isDark = true;
  else if (mode === "light") isDark = false;
  else if (mode === "auto") {
    isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (e) => {
        if (config.ui.theme === "auto") applyTheme(e.matches);
      });
  } else if (mode === "manual") {
    const cached = localStorage.getItem("wakejs-theme");
    isDark = cached
      ? cached === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    renderThemeToggle(isDark);
  }
  applyTheme(isDark);
}

function renderThemeToggle(currentIsDark) {
  const sunIcon = `<i class="fas fa-sun text-lg text-amber-400 absolute transition-all duration-500 ease-in-out ${currentIsDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50"}"></i>`;
  const moonIcon = `<i class="fas fa-moon text-lg text-blue-300 absolute transition-all duration-500 ease-in-out ${currentIsDark ? "opacity-0 rotate-90 scale-50" : "opacity-100 rotate-0 scale-100"}"></i>`;

  themeToggleContainer.innerHTML = `
        <button id="themeBtn" class="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-black/10 dark:bg-white/10 border border-white/10 hover:bg-black/20 dark:hover:bg-white/20 transition-all duration-300 group overflow-hidden shadow-inner" title="Changer le thème">
            <div class="relative w-6 h-6 flex items-center justify-center">
                ${sunIcon}
                ${moonIcon}
            </div>
        </button>
    `;

  document.getElementById("themeBtn").onclick = () => {
    const html = document.documentElement;
    const isNowDark = !html.classList.contains("dark");

    applyTheme(isNowDark);

    localStorage.setItem("wakejs-theme", isNowDark ? "dark" : "light");

    const sun = themeToggleContainer.querySelector(".fa-sun");
    const moon = themeToggleContainer.querySelector(".fa-moon");

    if (isNowDark) {
      sun.classList.remove("opacity-0", "-rotate-90", "scale-50");
      sun.classList.add("opacity-100", "rotate-0", "scale-100");
      moon.classList.remove("opacity-100", "rotate-0", "scale-100");
      moon.classList.add("opacity-0", "rotate-90", "scale-50");
    } else {
      sun.classList.remove("opacity-100", "rotate-0", "scale-100");
      sun.classList.add("opacity-0", "-rotate-90", "scale-50");
      moon.classList.remove("opacity-0", "rotate-90", "scale-50");
      moon.classList.add("opacity-100", "rotate-0", "scale-100");
    }
  };
}

function getDeptIcon(name) {
  const n = name.toLowerCase();
  if (n.includes("info")) return "fa-code";
  if (n.includes("reseau") || n.includes("rt")) return "fa-network-wired";
  if (n.includes("geii") || n.includes("elec")) return "fa-bolt";
  if (n.includes("mmi") || n.includes("com")) return "fa-clapperboard";
  if (n.includes("bio")) return "fa-dna";
  return "fa-building";
}

function updateSelectButtonText() {
  const cards = hostsGrid.querySelectorAll(".host-card");
  if (!cards.length) return;
  const allSelected = Array.from(cards).every((c) =>
    c.classList.contains("ring-4"),
  );
  selectAllBtn.innerHTML = allSelected
    ? '<i class="fas fa-times mr-2"></i> Désélectionner tout'
    : '<i class="fas fa-check-double mr-2"></i> Tout sélectionner';
}

async function checkApiHealth() {
  try {
    const response = await fetch(`${config.api.baseUrl}/api/health`, {
      method: "GET",
      signal: AbortSignal.timeout(4000),
    });
    setVisualStatus(response.ok);
  } catch (e) {
    setVisualStatus(false);
  }
}

function setVisualStatus(isOnline) {
  if (isOnline) {
    apiStatusText.textContent = "ONLINE";
    apiStatusText.className =
      "text-[11px] font-mono font-black text-green-400 leading-none tracking-wider pt-0.5";
    apiStatusDot.className =
      "relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500 border border-blue-950 status-pulse";
    apiStatusPing.className =
      "absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping";
  } else {
    apiStatusText.textContent = "OFFLINE";
    apiStatusText.className =
      "text-[11px] font-mono font-black text-red-500 leading-none tracking-wider pt-0.5";
    apiStatusDot.className =
      "relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600 border border-blue-950";
    apiStatusPing.className = "hidden";
  }
}

function handleDeptChange(dept, siteKey) {
  sallesGrid.innerHTML = "";
  hostsGrid.innerHTML = "";
  sectionHosts.classList.add("hidden");
  currentSalle = null;
  if (autoRefreshInterval) clearInterval(autoRefreshInterval);
  if (dept && siteKey) {
    sectionSalles.classList.remove("hidden");
    renderSalles(dept, siteKey);
  } else sectionSalles.classList.add("hidden");
}

function renderSalles(dept, siteKey) {
  sallesGrid.innerHTML = "";
  roomsData.sites[siteKey].departments[dept].sort().forEach((salle) => {
    const card = document.createElement("div");
    const isSelected = salle === currentSalle;
    card.className = `border-2 p-6 rounded-3xl shadow-sm cursor-pointer hover:border-blue-400 transition-all text-center font-black tracking-tight text-lg ${isSelected ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-lg shadow-blue-500/10" : "bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 text-gray-500 dark:text-gray-400"}`;
    card.textContent = salle;
    card.addEventListener("click", async () => {
      document
        .querySelectorAll("#sallesGrid div")
        .forEach(
          (el) =>
            (el.className =
              "bg-white dark:bg-slate-800 border-2 border-gray-100 dark:border-slate-700 p-6 rounded-3xl shadow-sm cursor-pointer hover:border-blue-400 transition-all text-center font-black tracking-tight text-gray-500 dark:text-gray-400 text-lg"),
        );
      card.className =
        "bg-white dark:bg-slate-800 border-2 border-blue-500 p-6 rounded-3xl cursor-pointer transition-all text-center font-black tracking-tight bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-lg shadow-blue-500/10 text-lg";
      currentSalle = salle;
      labelSalle.textContent = salle;
      await displayHosts();
      if (config.ui.autoRefresh) {
        if (autoRefreshInterval) clearInterval(autoRefreshInterval);
        autoRefreshInterval = setInterval(
          displayHosts,
          config.ui.refreshInterval,
        );
      }
    });
    sallesGrid.appendChild(card);
  });
}

async function displayHosts() {
  if (!currentSalle) return;
  sectionHosts.classList.remove("hidden");
  hostsGrid.innerHTML = `<div class="col-span-full py-20 text-center"><i class="fas fa-circle-notch fa-spin text-5xl text-blue-500"></i></div>`;
  try {
    const hosts = await fetchHostsData(currentSalle);
    renderHosts(hosts);
  } catch (e) {
    hostsGrid.innerHTML = `<div class="col-span-full text-red-600 font-bold p-8 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/20 text-center">${e.message}</div>`;
  }
}

function renderHosts(hosts) {
  hostsGrid.innerHTML = "";
  if (!hosts || hosts.length === 0) {
    hostCounter.textContent = "AUCUNE MACHINE";
    hostsGrid.innerHTML =
      "<p class='col-span-full text-gray-400 py-12 text-center italic'>Salle vide.</p>";
    return;
  }
  const onlineCount = hosts.filter((h) => h.online === true).length;
  hostCounter.innerHTML = `<span class="text-green-600 dark:text-green-400 font-black">${onlineCount}</span> ACTIFS / <span class="text-gray-800 dark:text-gray-300">${hosts.length}</span> TOTAL`;
  hosts.forEach((h) => {
    const isOnline = h.online === true;
    const div = document.createElement("div");
    div.className =
      "host-card bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-3xl p-8 shadow-sm hover:shadow-2xl transition-all cursor-pointer flex flex-col items-center group relative overflow-hidden text-gray-800 dark:text-gray-100";
    div.dataset.hostId = h.id;
    div.innerHTML = `<div class="relative mb-6 pointer-events-none"><i class="fas fa-desktop text-6xl ${isOnline ? "text-green-500" : "text-gray-200 dark:text-gray-700"} transiton-all"></i><div class="absolute -top-1 -right-1 w-5 h-5 rounded-full ${isOnline ? "bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.6)]" : "bg-red-500"} border-4 border-white dark:border-slate-800"></div></div><div class="font-black text-gray-800 dark:text-gray-100 tracking-tight text-base pointer-events-none text-center">${h.id}</div><div class="text-[10px] text-gray-400 dark:text-gray-500 mt-3 font-mono bg-gray-50 dark:bg-slate-900/50 px-3 py-1 rounded-full border border-gray-100 dark:border-slate-700 pointer-events-none tracking-wider">${h.ip || "NO IP"}</div>`;
    div.onclick = () => {
      div.classList.toggle("ring-4");
      div.classList.toggle("ring-blue-500/30");
      div.classList.toggle("border-blue-500");
      div.classList.toggle("bg-blue-50/50");
      div.classList.toggle("dark:bg-blue-900/20");
      updateSelectButtonText();
    };
    hostsGrid.appendChild(div);
  });
  updateSelectButtonText();
}

async function handleAction(action) {
  const selected = Array.from(hostsGrid.querySelectorAll(".ring-4"));
  const type = selected.length ? "Hosts" : "Room";
  const name = selected.length
    ? selected.map((el) => el.dataset.hostId).join(",")
    : currentSalle;
  if (!name) return;
  if (action === "shutdown" && !confirm(`Confirmer SHUTDOWN: ${name}?`)) return;
  const btn =
    action === "ping" ? pingBtn : action === "awake" ? wakeBtn : shutdownBtn;
  const original = btn.innerHTML;
  btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;
  btn.disabled = true;
  try {
    await callApi(type, name, action);
    setVisualStatus(true);
    setTimeout(displayHosts, action === "ping" ? 0 : 5000);
  } catch (e) {
    alert("API Error");
  } finally {
    btn.innerHTML = original;
    btn.disabled = false;
  }
}

export function initUI() {
  updateTheme();
  checkApiHealth();
  const allDepts = {};
  enabledSiteKeys.forEach((siteKey) => {
    const siteDepts = roomsData.sites[siteKey]?.departments || {};
    Object.keys(siteDepts).forEach(
      (deptName) => (allDepts[deptName] = siteKey),
    );
  });
  deptGrid.innerHTML = "";
  Object.keys(allDepts)
    .sort()
    .forEach((dept) => {
      const siteKey = allDepts[dept];
      const card = document.createElement("div");
      card.className =
        "dept-card group bg-white dark:bg-slate-800 border-2 border-gray-100 dark:border-slate-700 p-6 rounded-3xl cursor-pointer hover:border-blue-300 transition-all flex items-center gap-5 shadow-sm hover:shadow-xl";
      card.innerHTML = `<div class="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-slate-900 flex items-center justify-center text-gray-400 group-hover:text-blue-500 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-all pointer-events-none"><i class="fas ${getDeptIcon(dept)} text-2xl"></i></div><div class="pointer-events-none"><h3 class="font-black text-gray-800 dark:text-gray-200 text-lg group-hover:text-blue-700 dark:group-hover:text-blue-400 tracking-tight">${dept}</h3><p class="text-[9px] uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 font-black">${siteKey}</p></div>`;
      card.onclick = () => {
        document
          .querySelectorAll(".dept-card")
          .forEach(
            (c) =>
              (c.className =
                "dept-card group bg-white dark:bg-slate-800 border-2 border-gray-100 dark:border-slate-700 p-6 rounded-3xl cursor-pointer hover:border-blue-300 transition-all flex items-center gap-5 shadow-sm hover:shadow-xl"),
          );
        card.className =
          "dept-card group bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500 p-6 rounded-3xl cursor-pointer transition-all flex items-center gap-5 shadow-xl shadow-blue-500/10";
        handleDeptChange(dept, siteKey);
        setTimeout(
          () =>
            sectionSalles.scrollIntoView({
              behavior: "smooth",
              block: "start",
            }),
          100,
        );
      };
      deptGrid.appendChild(card);
    });

  globalSearch.addEventListener("input", async (e) => {
    const q = e.target.value;
    if (q.length < 2) {
      searchResults.classList.add("hidden");
      return;
    }
    try {
      const results = await searchHosts(q);
      if (results.length > 0) {
        searchResults.innerHTML = results
          .map(
            (h) =>
              `<div class="p-5 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer border-b border-gray-50 dark:border-slate-800 last:border-0 flex justify-between items-center group" onclick="window.teleportToHost('${h.id}', '${h.room}')"><div class="pointer-events-none"><div class="font-black text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">${h.id}</div><div class="text-[9px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-widest">${h.room}</div></div><i class="fas fa-arrow-right text-gray-200 dark:text-gray-700 group-hover:text-blue-500 transition-all"></i></div>`,
          )
          .join("");
        searchResults.classList.remove("hidden");
      } else {
        searchResults.innerHTML = `<div class="p-5 text-gray-400 italic text-center text-sm dark:bg-slate-900">Aucun résultat</div>`;
        searchResults.classList.remove("hidden");
      }
    } catch (e) {}
  });

  document.addEventListener("click", (e) => {
    if (!globalSearch.contains(e.target) && !searchResults.contains(e.target))
      searchResults.classList.add("hidden");
  });
  selectAllBtn.onclick = () => {
    const cards = hostsGrid.querySelectorAll(".host-card");
    const allSelected = Array.from(cards).every((c) =>
      c.classList.contains("ring-4"),
    );
    cards.forEach((card) => {
      if (allSelected)
        card.classList.remove(
          "ring-4",
          "ring-blue-500/30",
          "border-blue-500",
          "bg-blue-50/50",
          "dark:bg-blue-900/20",
        );
      else
        card.classList.add(
          "ring-4",
          "ring-blue-500/30",
          "border-blue-500",
          "bg-blue-50/50",
          "dark:bg-blue-900/20",
        );
    });
    updateSelectButtonText();
  };
  pingBtn.onclick = () => handleAction("ping");
  wakeBtn.onclick = () => handleAction("awake");
  shutdownBtn.onclick = () => handleAction("shutdown");
}

window.teleportToHost = async (hostId, roomName) => {
  globalSearch.value = "";
  searchResults.classList.add("hidden");
  let targetDept = null;
  let targetSite = null;
  for (const siteKey in roomsData.sites) {
    const depts = roomsData.sites[siteKey].departments;
    for (const deptName in depts) {
      if (depts[deptName].includes(roomName)) {
        targetDept = deptName;
        targetSite = siteKey;
        break;
      }
    }
  }
  if (targetDept) {
    handleDeptChange(targetDept, targetSite);
    document.querySelectorAll(".dept-card").forEach((c) => {
      const isMatch = c.querySelector("h3").textContent === targetDept;
      c.className = isMatch
        ? "dept-card group bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500 p-6 rounded-3xl cursor-pointer transition-all flex items-center gap-5 shadow-xl shadow-blue-500/10"
        : "dept-card group bg-white dark:bg-slate-800 border-2 border-gray-100 dark:border-slate-700 p-6 rounded-3xl cursor-pointer hover:border-blue-300 transition-all flex items-center gap-5 shadow-sm hover:shadow-xl";
    });
    currentSalle = roomName;
    labelSalle.textContent = roomName;
    sectionSalles.classList.remove("hidden");
    renderSalles(targetDept, targetSite);
    await displayHosts();
    setTimeout(() => {
      const hostEl = document.querySelector(`[data-host-id="${hostId}"]`);
      if (hostEl) {
        hostEl.scrollIntoView({ behavior: "smooth", block: "center" });
        hostEl.classList.add(
          "ring-4",
          "ring-blue-500/30",
          "border-blue-500",
          "bg-blue-50/50",
          "dark:bg-blue-900/20",
        );
      }
    }, 300);
  }
};

initUI();
