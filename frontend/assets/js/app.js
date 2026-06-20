import { verifyToken, login } from "./api.js";
import { initTheme } from "./theme.js";
import { initNavigation } from "./components/navigation.js";
import { HostComponent } from "./components/hosts.js";
import { initSearch } from "./components/search.js";

const loginOverlay = document.getElementById("loginOverlay");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const logoutBtn = document.getElementById("logoutBtn");
const apiStatusText = document.getElementById("apiStatusText");
const apiStatusDot = document.getElementById("apiStatusDot");
const apiStatusPing = document.getElementById("apiStatusPing");

let config = null;
let roomsData = null;
let currentSalle = null;
let autoRefreshInterval = null;

async function checkApiHealth() {
  try {
    const res = await fetch(`${config.api.baseUrl}/api/health`);
    setVisualStatus(res.ok);
  } catch (e) {
    setVisualStatus(false);
  }
}

function setVisualStatus(isOnline) {
  if (isOnline) {
    apiStatusText.textContent = "EN LIGNE";
    apiStatusText.className =
      "text-[11px] font-mono font-black text-green-400 leading-none pt-0.5";
    apiStatusDot.className =
      "relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500 border border-blue-950";
    apiStatusPing.className =
      "absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping";
  } else {
    apiStatusText.textContent = "HORS LIGNE";
    apiStatusText.className =
      "text-[11px] font-mono font-black text-red-500 leading-none pt-0.5";
    apiStatusDot.className =
      "relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600 border border-blue-950";
    apiStatusPing.className = "hidden";
  }
}

async function startApp() {
  try {
    config = await fetch("./assets/config/config.json").then((r) => r.json());
    roomsData = await fetch("./assets/config/rooms.json").then((r) => r.json());

    initDashboard();
    checkApiHealth();
    setInterval(checkApiHealth, 30000);

    if (config.api.authEnabled) {
      const isAuthed = await verifyToken();
      if (!isAuthed) showLogin();
    }
  } catch (err) {
    console.error("Critical Start Error:", err);
  }
}

function showLogin() {
  loginOverlay.classList.remove("hidden");
  loginForm.onsubmit = async (e) => {
    e.preventDefault();
    loginError.classList.add("hidden");
    try {
      await login(
        document.getElementById("username").value,
        document.getElementById("password").value,
      );
      loginOverlay.classList.add("hidden");
    } catch (err) {
      loginError.classList.remove("hidden");
    }
  };
}

function initDashboard() {
  initTheme(config.ui);
  initNavigation(config, roomsData, (salle) => {
    currentSalle = salle;
    handleSalleSelection(salle);
  });
  initSearch(roomsData, (site, dept, salle, hostId) => {
    currentSalle = salle;
    handleTeleport(site, dept, salle, hostId);
  });
  setupEventListeners();
}

function handleSalleSelection(salle) {
  HostComponent.refresh(salle);
  if (autoRefreshInterval) clearInterval(autoRefreshInterval);
  if (config.ui.autoRefresh) {
    autoRefreshInterval = setInterval(() => {
      const hasSelection =
        document.querySelectorAll(".host-card.ring-4").length > 0;
      if (!hasSelection) HostComponent.refresh(salle);
    }, config.ui.refreshInterval || 30000);
  }
}

function handleTeleport(site, dept, salle, hostId) {
  document.getElementById("labelSalle").textContent = salle;
  handleSalleSelection(salle);
  setTimeout(() => {
    const hostEl = document.querySelector(`[data-host-id="${hostId}"]`);
    if (hostEl) {
      hostEl.scrollIntoView({ behavior: "smooth", block: "center" });
      hostEl.classList.add("ring-4", "ring-blue-500/30", "border-blue-500");
    }
  }, 500);
}

function setupEventListeners() {
  document.getElementById("selectAllBtn").onclick = () =>
    HostComponent.toggleSelectAll();
  document.getElementById("pingBtn").onclick = () =>
    HostComponent.execute("ping", currentSalle, config);
  document.getElementById("wakeBtn").onclick = () =>
    HostComponent.execute("awake", currentSalle, config);
  document.getElementById("shutdownBtn").onclick = () =>
    HostComponent.execute("shutdown", currentSalle, config);
  logoutBtn.onclick = () => {
    localStorage.removeItem("wakejs_token");
    window.location.reload();
  };
}

startApp();
