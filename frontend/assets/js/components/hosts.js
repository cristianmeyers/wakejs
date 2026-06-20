import { fetchHostsData, callApi } from "../api.js";

const hostsGrid = document.getElementById("hostsGrid");
const hostCounter = document.getElementById("hostCounter");
const sectionHosts = document.getElementById("sectionHosts");

const pendingHosts = new Set();

async function getSshCredentials() {
  return new Promise((resolve) => {
    const modal = document.getElementById("sshModal");
    const passInput = document.getElementById("sshPass");
    const confirmBtn = document.getElementById("confirmSshBtn");
    const closeBtn = document.getElementById("closeSshModal");
    const osButtons = document.querySelectorAll(".os-choice");

    let selectedOs = "windows";

    modal.classList.remove("hidden");
    passInput.value = "";
    passInput.focus();

    osButtons.forEach((btn) => {
      btn.onclick = () => {
        osButtons.forEach((b) =>
          b.classList.remove("active", "border-blue-500"),
        );
        btn.classList.add("active", "border-blue-500");
        selectedOs = btn.dataset.os;
      };
    });

    confirmBtn.onclick = () => {
      const password = passInput.value;
      if (!password) return;
      modal.classList.add("hidden");
      resolve({ password, os: selectedOs });
    };

    closeBtn.onclick = () => {
      modal.classList.add("hidden");
      resolve(null);
    };
  });
}

export const HostComponent = {
  async refresh(salle) {
    if (!salle) return;
    sectionHosts.classList.remove("hidden");

    if (hostsGrid.innerHTML === "" || hostsGrid.querySelector(".fa-spin")) {
      hostsGrid.innerHTML = `<div class="col-span-full py-20 text-center"><i class="fas fa-circle-notch fa-spin text-5xl text-blue-500"></i></div>`;
    }

    try {
      const hosts = await fetchHostsData(salle);
      this.render(hosts);
    } catch (e) {
      hostsGrid.innerHTML = `<div class="col-span-full text-red-500 text-center p-10 font-bold underline">ERREUR DE CONNEXION API</div>`;
    }
  },

  render(hosts) {
    const currentSelection = new Set(
      Array.from(hostsGrid.querySelectorAll(".ring-4")).map(
        (el) => el.dataset.hostId,
      ),
    );

    hostsGrid.innerHTML = "";
    if (!hosts || hosts.length === 0) {
      hostCounter.textContent = "AUCUN HÔTE";
      hostsGrid.innerHTML =
        "<p class='col-span-full text-gray-400 py-12 text-center italic'>Aucune machine détectée.</p>";
      return;
    }

    const online = hosts.filter((h) => h.online).length;
    hostCounter.innerHTML = `<span class="text-green-500 font-black">${online}</span> ON / ${hosts.length} TOTAL`;

    hosts.forEach((h) => {
      const isPending = pendingHosts.has(h.id);
      const isSelected = currentSelection.has(h.id);

      const statusColor = isPending
        ? "bg-amber-500 animate-pulse"
        : h.online
          ? "bg-green-500"
          : "bg-red-500";
      const iconColor = isPending
        ? "text-amber-500 opacity-50"
        : h.online
          ? "text-green-500"
          : "text-gray-200 dark:text-gray-700";

      const div = document.createElement("div");
      div.className = `host-card bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm cursor-pointer flex flex-col items-center transition-all hover:shadow-xl relative ${isSelected ? "ring-4 ring-blue-500/30 border-blue-500" : ""}`;
      div.dataset.hostId = h.id;

      div.innerHTML = `
                <div class="relative mb-4 pointer-events-none">
                    <i class="fas fa-desktop text-5xl ${iconColor} transition-colors duration-500"></i>
                    <div class="absolute -top-1 -right-1 w-4 h-4 rounded-full border-4 border-white dark:border-slate-800 ${statusColor}"></div>
                </div>
                <div class="font-black text-sm text-center pointer-events-none">${h.id}</div>
                <div class="text-[9px] text-gray-400 mt-2 font-mono bg-gray-50 dark:bg-slate-900/50 px-3 py-1 rounded-full border border-gray-100 dark:border-slate-700 pointer-events-none uppercase">
                    ${isPending ? "EN ATTENTE..." : h.ip || "---"}
                </div>
            `;

      div.onclick = () => {
        div.classList.toggle("ring-4");
        div.classList.toggle("ring-blue-500/30");
        div.classList.toggle("border-blue-500");
      };
      hostsGrid.appendChild(div);
    });
  },

  async execute(action, salle, config) {
    const selectedElements = Array.from(hostsGrid.querySelectorAll(".ring-4"));
    const targetedIds = selectedElements.map((el) => el.dataset.hostId);

    const type = targetedIds.length > 0 ? "Hosts" : "Room";
    const name = targetedIds.length > 0 ? targetedIds.join(",") : salle;

    if (!name) {
      console.error("Execute failed: No target (host or room) defined");
      return;
    }

    if (action === "awake" || action === "shutdown") {
      if (targetedIds.length > 0) {
        targetedIds.forEach((id) => pendingHosts.add(id));
      } else {
        Array.from(hostsGrid.querySelectorAll(".host-card")).forEach((el) =>
          pendingHosts.add(el.dataset.hostId),
        );
      }
      this.refresh(salle);
    }

    const btn = document.getElementById(
      `${action === "awake" ? "wake" : action}Btn`,
    );
    if (!btn) return;

    const originalContent = btn.innerHTML;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;
    btn.disabled = true;

    try {
      let response = await callApi(type, name, action);

      if (response.results?.some((r) => r.status === "AUTH_REQUIRED")) {
        const creds = await getSshCredentials();
        if (creds) await callApi(type, name, action, creds);
      }

      const refreshDelay =
        action === "awake"
          ? config.ui.awakeRefreshDelay || 40000
          : config.ui.shutdownRefreshDelay || 10000;

      setTimeout(() => {
        pendingHosts.clear();
        this.refresh(salle);
      }, refreshDelay);
    } catch (e) {
      alert(`Erreur API: ${e.message}`);
      pendingHosts.clear();
      this.refresh(salle);
    } finally {
      btn.innerHTML = originalContent;
      btn.disabled = false;
    }
  },

  toggleSelectAll() {
    const cards = hostsGrid.querySelectorAll(".host-card");
    const allSelected = Array.from(cards).every((c) =>
      c.classList.contains("ring-4"),
    );
    cards.forEach((c) => {
      if (allSelected) {
        c.classList.remove("ring-4", "ring-blue-500/30", "border-blue-500");
      } else {
        c.classList.add("ring-4", "ring-blue-500/30", "border-blue-500");
      }
    });
  },
};
