import { callApi, fetchHostsData } from "./api.js";

const config = await fetch("../config/config.json").then((r) => r.json());
const roomsData = await fetch("../config/rooms.json").then((r) => r.json());

const activeSiteKey = Object.keys(config.sites).find(
  (site) => config.sites[site].enabled,
);
if (!activeSiteKey) throw new Error("No hay sitio habilitado en config.json");

const siteData = roomsData.sites[activeSiteKey];
const departements = siteData.departments;

const departementEl = document.getElementById("departement");
const sallesGrid = document.getElementById("sallesGrid");
const hostsGrid = document.getElementById("hostsGrid");
const sectionSalles = document.getElementById("sectionSalles");
const sectionHosts = document.getElementById("sectionHosts");
const labelSalle = document.getElementById("labelSalle");
const pingBtn = document.getElementById("pingBtn");
const wakeBtn = document.getElementById("wakeBtn");

let currentSalle = null;
let autoRefreshInterval = null;

export function initUI() {
  Object.keys(departements)
    .sort()
    .forEach((d) => {
      const opt = document.createElement("option");
      opt.value = d;
      opt.textContent = d;
      departementEl.appendChild(opt);
    });
}

departementEl.addEventListener("change", (e) => {
  const dept = e.target.value;
  sallesGrid.innerHTML = "";
  hostsGrid.innerHTML = "";
  sectionHosts.classList.add("hidden");
  currentSalle = null;

  if (dept && departements[dept]) {
    sectionSalles.classList.remove("hidden");
    renderSalles(dept);
  } else {
    sectionSalles.classList.add("hidden");
  }
});

function renderSalles(dept) {
  departements[dept].forEach((salle) => {
    const card = document.createElement("div");
    card.className =
      "bg-white border-2 border-gray-200 p-3 rounded-lg shadow-sm cursor-pointer hover:border-blue-400 hover:shadow-md transition-all text-center font-medium text-gray-700";
    card.textContent = salle;

    card.addEventListener("click", async () => {
      document
        .querySelectorAll("#sallesGrid div")
        .forEach((el) =>
          el.classList.remove("selected-room", "border-blue-500", "bg-blue-50"),
        );
      card.classList.add("selected-room", "border-blue-500", "bg-blue-50");

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
  hostsGrid.innerHTML = `<div class="col-span-full py-10 text-center"><i class="fas fa-circle-notch fa-spin text-3xl text-blue-500 mb-2"></i><p class="text-gray-500 italic">Interrogation des machines de la salle ${currentSalle}...</p></div>`;

  try {
    const hosts = await fetchHostsData(currentSalle);
    renderHosts(hosts);
  } catch (e) {
    hostsGrid.innerHTML = `<div class="col-span-full bg-red-50 text-red-600 p-4 rounded-lg border border-red-200"><i class="fas fa-exclamation-triangle mr-2"></i>${e.message}</div>`;
  }
}

function renderHosts(hosts) {
  hostsGrid.innerHTML = "";
  if (!hosts || hosts.length === 0) {
    hostsGrid.innerHTML =
      "<p class='col-span-full text-gray-500 py-8'>Aucun hôte trouvé.</p>";
    return;
  }

  hosts.forEach((h) => {
    const isOnline = h.online === true;
    const div = document.createElement("div");
    div.className =
      "bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col items-center group";
    div.dataset.hostId = h.id;

    div.innerHTML = `
      <div class="relative mb-3">
        <i class="fas fa-desktop text-4xl ${isOnline ? "host-online" : "host-offline"} transition-transform group-hover:scale-110"></i>
        <div class="absolute -top-1 -right-1 w-3 h-3 rounded-full ${isOnline ? "bg-green-500" : "bg-red-500"} border-2 border-white"></div>
      </div>
      <div class="font-bold text-gray-800">${h.id}</div>
      <div class="text-xs font-semibold uppercase mt-1 ${isOnline ? "text-green-600" : "text-red-500"}">${isOnline ? "En ligne" : "Hors ligne"}</div>
      <div class="text-[10px] text-gray-400 mt-2 font-mono">${h.ip || "Pas d'IP"}</div>
    `;

    div.addEventListener("click", () => {
      div.classList.toggle("ring-2");
      div.classList.toggle("ring-blue-500");
      div.classList.toggle("border-blue-500");
    });

    hostsGrid.appendChild(div);
  });
}

pingBtn.addEventListener("click", () => handleAction("ping"));
wakeBtn.addEventListener("click", () => handleAction("awake"));

async function handleAction(action) {
  const selectedElements = Array.from(hostsGrid.querySelectorAll(".ring-2"));
  const selectedIds = selectedElements.map((el) => el.dataset.hostId);

  const type = selectedIds.length ? "Hosts" : "Room";
  const name = selectedIds.length ? selectedIds.join(",") : currentSalle;

  if (!name) return alert("Veuillez sélectionner une salle ou des machines.");

  const btn = action === "ping" ? pingBtn : wakeBtn;
  const originalContent = btn.innerHTML;
  btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> En cours...`;
  btn.disabled = true;

  try {
    const data = await callApi(type, name, action);

    if (action === "awake") {
      alert(
        `Signal Wake-on-LAN envoyé ! Rafraîchissement dans ${config.ui.awakeRefreshDelay / 1000}s...`,
      );
      setTimeout(displayHosts, config.ui.awakeRefreshDelay);
    } else {
      renderHosts(data.results);
    }
  } catch (e) {
    alert("Erreur lors de l'action: " + e.message);
  } finally {
    btn.innerHTML = originalContent;
    btn.disabled = false;
  }
}

initUI();
