import { callApi, fetchHostsData } from "./api.js";

const config = await fetch("./assets/config/config.json").then((r) => r.json());
const roomsData = await fetch("./assets/config/rooms.json").then((r) =>
  r.json(),
);

const enabledSiteKeys = Object.keys(config.sites).filter(
  (key) => config.sites[key].enabled,
);

const departementEl = document.getElementById("departement");
const sallesGrid = document.getElementById("sallesGrid");
const hostsGrid = document.getElementById("hostsGrid");
const sectionSalles = document.getElementById("sectionSalles");
const sectionHosts = document.getElementById("sectionHosts");
const labelSalle = document.getElementById("labelSalle");
const pingBtn = document.getElementById("pingBtn");
const wakeBtn = document.getElementById("wakeBtn");

let currentSalle = null;
let currentSiteForSalle = null; // Pour savoir dans quel site chercher la salle
let autoRefreshInterval = null;

export function initUI() {
  const allDepts = {};

  enabledSiteKeys.forEach((siteKey) => {
    const siteDepts = roomsData.sites[siteKey]?.departments || {};
    Object.keys(siteDepts).forEach((deptName) => {
      // On stocke le nom du département et son site d'origine
      allDepts[deptName] = siteKey;
    });
  });

  Object.keys(allDepts)
    .sort()
    .forEach((d) => {
      departementEl.add(new Option(d, d));
    });

  // On attache l'info du site au changement
  departementEl.addEventListener("change", (e) => {
    const dept = e.target.value;
    const siteKey = allDepts[dept];
    handleDeptChange(dept, siteKey);
  });
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
  } else {
    sectionSalles.classList.add("hidden");
  }
}

function renderSalles(dept, siteKey) {
  const salles = roomsData.sites[siteKey].departments[dept];

  salles.sort().forEach((salle) => {
    const card = document.createElement("div");
    card.className =
      "bg-white border-2 border-gray-200 p-3 rounded-lg shadow-sm cursor-pointer hover:border-blue-400 hover:shadow-md transition-all text-center font-medium text-gray-700 card-hover";
    card.textContent = salle;

    card.addEventListener("click", async () => {
      document
        .querySelectorAll("#sallesGrid div")
        .forEach((el) =>
          el.classList.remove("border-blue-500", "bg-blue-50", "selected-room"),
        );
      card.classList.add("border-blue-500", "bg-blue-50", "selected-room");

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
  hostsGrid.innerHTML = `<div class="col-span-full py-10 text-center"><i class="fas fa-circle-notch fa-spin text-3xl text-blue-500 mb-2"></i><p class="text-gray-500 italic">Interrogation de ${currentSalle}...</p></div>`;
  try {
    const hosts = await fetchHostsData(currentSalle);
    renderHosts(hosts);
  } catch (e) {
    hostsGrid.innerHTML = `<div class="col-span-full bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">${e.message}</div>`;
  }
}

function renderHosts(hosts) {
  hostsGrid.innerHTML = "";
  if (!hosts || hosts.length === 0) {
    hostsGrid.innerHTML =
      "<p class='col-span-full text-gray-500 py-8'>Aucune machine trouvée.</p>";
    return;
  }
  hosts.forEach((h) => {
    const isOnline = h.online === true;
    const div = document.createElement("div");
    div.className =
      "bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col items-center group card-hover glass-card";
    div.dataset.hostId = h.id;
    div.innerHTML = `
            <div class="relative mb-3">
                <i class="fas fa-desktop text-4xl ${isOnline ? "text-green-500" : "text-gray-300"} transition-transform group-hover:scale-110"></i>
                <div class="absolute -top-1 -right-1 w-3 h-3 rounded-full ${isOnline ? "bg-green-500" : "bg-red-500"} border-2 border-white"></div>
            </div>
            <div class="font-bold text-gray-800">${h.id}</div>
            <div class="text-[10px] text-gray-400 mt-2 font-mono">${h.ip || "N/A"}</div>`;
    div.addEventListener("click", () => {
      div.classList.toggle("ring-2");
      div.classList.toggle("ring-blue-500");
    });
    hostsGrid.appendChild(div);
  });
}

async function handleAction(action) {
  const selectedElements = Array.from(hostsGrid.querySelectorAll(".ring-2"));
  const selectedIds = selectedElements.map((el) => el.dataset.hostId);
  const type = selectedIds.length ? "Hosts" : "Room";
  const name = selectedIds.length ? selectedIds.join(",") : currentSalle;

  if (!name) return;

  const btn = action === "ping" ? pingBtn : wakeBtn;
  const original = btn.innerHTML;
  btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i>`;
  btn.disabled = true;

  try {
    const data = await callApi(type, name, action);
    if (action === "awake") {
      alert(
        `Signal envoyé ! Refresh dans ${config.ui.awakeRefreshDelay / 1000}s...`,
      );
      setTimeout(displayHosts, config.ui.awakeRefreshDelay);
    } else {
      renderHosts(data.results);
    }
  } catch (e) {
    alert("Erreur: " + e.message);
  } finally {
    btn.innerHTML = original;
    btn.disabled = false;
  }
}

pingBtn.addEventListener("click", () => handleAction("ping"));
wakeBtn.addEventListener("click", () => handleAction("awake"));

initUI();
