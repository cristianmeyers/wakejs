const deptGrid = document.getElementById("deptGrid");
const sallesGrid = document.getElementById("sallesGrid");
const sectionSalles = document.getElementById("sectionSalles");
const labelSalle = document.getElementById("labelSalle");

function getDeptIcon(name) {
  const n = name.toLowerCase();
  if (n.includes("info")) return "fa-code";
  if (n.includes("reseau") || n.includes("rt")) return "fa-network-wired";
  if (n.includes("geii") || n.includes("elec")) return "fa-bolt";
  if (n.includes("mmi") || n.includes("com")) return "fa-clapperboard";
  if (n.includes("bio")) return "fa-dna";
  return "fa-building";
}

export function initNavigation(config, roomsData, onSalleSelected) {
  const enabledSiteKeys = Object.keys(config.sites).filter(
    (k) => config.sites[k].enabled,
  );
  deptGrid.innerHTML = "";

  const baseDeptClass =
    "dept-card group bg-white dark:bg-slate-800 border-2 border-gray-100 dark:border-slate-700 p-6 rounded-3xl cursor-pointer hover:border-blue-300 transition-all flex items-center gap-5 shadow-sm";
  const activeDeptClass =
    "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-xl shadow-blue-500/10";

  enabledSiteKeys.forEach((siteKey) => {
    const siteDepts = roomsData.sites[siteKey]?.departments || {};
    Object.keys(siteDepts)
      .sort()
      .forEach((deptName) => {
        const card = document.createElement("div");
        card.className = baseDeptClass;

        card.innerHTML = `
                <div class="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-slate-900 flex items-center justify-center text-gray-400 group-hover:text-blue-500 transition-all pointer-events-none">
                    <i class="fas ${getDeptIcon(deptName)} text-2xl"></i>
                </div>
                <div class="pointer-events-none">
                    <h3 class="font-black text-gray-800 dark:text-gray-200 text-lg tracking-tight">${deptName}</h3>
                    <p class="text-[9px] uppercase tracking-[0.2em] text-gray-400 font-black">${siteKey}</p>
                </div>`;

        card.onclick = () => {
          document.querySelectorAll(".dept-card").forEach((c) => {
            c.className = baseDeptClass;
          });
          card.className = `${baseDeptClass} ${activeDeptClass}`;

          renderSalles(siteDepts[deptName], onSalleSelected);
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
  });
}

function renderSalles(salles, onSalleSelected) {
  sectionSalles.classList.remove("hidden");
  sallesGrid.innerHTML = "";

  const baseSalleClass =
    "bg-white dark:bg-slate-800 border-2 border-gray-100 dark:border-slate-700 p-6 rounded-3xl shadow-sm cursor-pointer hover:border-blue-400 transition-all text-center font-black text-gray-500 text-lg";
  const activeSalleClass =
    "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-lg shadow-blue-500/10";

  salles.sort().forEach((salle) => {
    const btn = document.createElement("div");
    btn.className = baseSalleClass;
    btn.textContent = salle;

    btn.onclick = () => {
      document.querySelectorAll("#sallesGrid div").forEach((el) => {
        el.className = baseSalleClass;
      });
      btn.className = `${baseSalleClass} ${activeSalleClass}`;

      labelSalle.textContent = salle;
      onSalleSelected(salle);
    };
    sallesGrid.appendChild(btn);
  });
}
