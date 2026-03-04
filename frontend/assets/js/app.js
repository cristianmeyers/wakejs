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
    apiStatusText.textContent = "ONLINE";
    apiStatusText.className =
      "text-[11px] font-mono font-black text-green-400 leading-none pt-0.5";
    apiStatusDot.className =
      "relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500 border border-blue-950";
    apiStatusPing.className =
      "absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping";
  } else {
    apiStatusText.textContent = "OFFLINE";
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
    checkApiHealth();
    const isAuthed = await verifyToken();
    if (!isAuthed) showLogin();
    else initDashboard();
  } catch (err) {
    console.error("Error:", err);
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
      initDashboard();
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
      if (!hasSelection) {
        HostComponent.refresh(salle);
      }
    }, config.ui.refreshInterval || 30000);
  }
}

function handleTeleport(site, dept, salle, hostId) {
  const deptCards = document.querySelectorAll(".dept-card");
  deptCards.forEach((c) => {
    const isMatch = c.querySelector("h3").textContent === dept;
    c.className = isMatch
      ? "dept-card group bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500 p-6 rounded-3xl cursor-pointer transition-all flex items-center gap-5 shadow-xl shadow-blue-500/10"
      : "dept-card group bg-white dark:bg-slate-800 border-2 border-gray-100 dark:border-slate-700 p-6 rounded-3xl cursor-pointer hover:border-blue-300 transition-all flex items-center gap-5 shadow-sm";
  });
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
