// ==========================================
// Main JavaScript for WakeJS Frontend
// ==========================================
const API_URL = "/api/action";

const departements = {
  SG: [
    "A004",
    "A005",
    "A007",
    "A011",
    "A012",
    "A014",
    "A016",
    "A018",
    "A102",
    "A104",
    "A106",
    "A108",
    "A110",
    "A112",
    "A114",
    "A116",
    "B-001",
    "B-007",
    "B-009",
    "C005",
    "C101A",
    "C101B",
    "C107",
    "CAFET",
  ],
  GB: [
    "B001",
    "B-001",
    "B001A",
    "B001B",
    "B001C",
    "B006",
    "B007A",
    "B008A",
    "B009A",
    "B010",
    "B-010",
    "B011",
    "B013",
    "B014",
    "B015",
    "B016",
    "B017",
    "B018",
    "B023",
    "B025",
    "B102A",
    "B105",
    "B109",
    "B110",
    "B111",
    "B112",
    "B112B",
    "B114",
    "B116",
    "B117",
    "B118",
    "B119",
    "B120",
    "B121",
    "B123",
    "B126",
    "B132",
    "B134",
    "B136",
    "B202B",
    "B204",
    "B206",
    "B207",
    "B208",
    "B209",
    "B210",
    "B212",
    "B213",
    "B214",
    "B215",
    "B216",
    "B217",
    "B218",
    "B219",
    "C003",
  ],
  GEA: [
    "B304",
    "B306",
    "B307",
    "B308",
    "B309",
    "B311",
    "B312",
    "B314",
    "B315",
    "B316",
    "B318",
    "B319",
    "B320",
    "B404",
    "B407",
    "B408",
    "B409",
    "B410",
    "B411",
    "B413",
    "B414",
    "B417",
    "B418",
    "B420",
    "B422",
    "B424",
    "B428",
  ],
  GMP: [
    "D001",
    "D005",
    "D007",
    "D011",
    "D-020",
    "D-022",
    "D-024",
    "D-026",
    "D037",
    "D-041",
    "D043",
    "D-043",
    "D-049",
    "D-051",
    "D049",
    "D063",
    "D067",
    "D069",
    "D071",
    "D077",
    "D079",
    "D081",
    "D083",
    "D085",
    "D087",
    "D093",
    "D093B",
    "D095",
  ],
  GEII: [
    "C109",
    "C111",
    "C113",
    "D-001",
    "D-003",
    "D-004",
    "D006",
    "D-006",
    "D008",
    "D-008",
    "D-009",
    "D010",
    "D012",
    "D014",
    "D-015",
    "D018",
    "D-019",
    "D020",
    "D024",
    "D032",
    "D034",
    "D034B",
    "D036",
    "D044",
    "D060",
    "D062",
    "D064",
    "D066",
    "D072",
    "D072A",
    "D074",
    "D078",
    "D084",
    "D086",
    "D086C",
    "D090",
    "D092",
    "D094",
    "D098",
    "D098A",
  ],
  GACOD: [
    "J006",
    "J007",
    "J101",
    "J103",
    "J105",
    "J107",
    "J109",
    "J111",
    "J113",
    "J115",
    "J117",
    "J203",
    "J211",
  ],
  GC: ["L003", "L004", "L005", "L011", "L101", "L201", "L205"],
  FC: ["C007", "C009", "C011", "C021"],
  LBMS: ["C103", "C105B"],
};

// 2. Referencias al DOM
const departementEl = document.getElementById("departement");
const sallesGrid = document.getElementById("sallesGrid");
const hostsGrid = document.getElementById("hostsGrid");
const sectionSalles = document.getElementById("sectionSalles");
const sectionHosts = document.getElementById("sectionHosts");
const labelSalle = document.getElementById("labelSalle");
const pingBtn = document.getElementById("pingBtn");
const wakeBtn = document.getElementById("wakeBtn");

let currentSalle = null;

// 3. Inicialización
function init() {
  Object.keys(departements)
    .sort()
    .forEach((d) => {
      const opt = document.createElement("option");
      opt.value = d;
      opt.textContent = d;
      departementEl.appendChild(opt);
    });
}

// 4. Gestión de Salas
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

    card.addEventListener("click", () => {
      document
        .querySelectorAll("#sallesGrid div")
        .forEach((el) =>
          el.classList.remove("selected-room", "border-blue-500", "bg-blue-50"),
        );
      card.classList.add("selected-room", "border-blue-500", "bg-blue-50");

      currentSalle = salle;
      labelSalle.textContent = salle;
      fetchHosts();
    });

    sallesGrid.appendChild(card);
  });
}

// 5. Gestión de Hosts (API con Variable Global)
async function fetchHosts() {
  if (!currentSalle) return;

  sectionHosts.classList.remove("hidden");
  hostsGrid.innerHTML = `
        <div class="col-span-full py-10 text-center">
            <i class="fas fa-circle-notch fa-spin text-3xl text-blue-500 mb-2"></i>
            <p class="text-gray-500 italic">Interrogation des machines de la salle ${currentSalle}...</p>
        </div>`;

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "Room",
        name: currentSalle,
        action: "ping",
      }),
    });
    const data = await res.json();
    renderHosts(data.results);
  } catch (e) {
    hostsGrid.innerHTML = `
            <div class="col-span-full bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">
                <i class="fas fa-exclamation-triangle mr-2"></i> Erreur de connexion API: ${e.message}
            </div>`;
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
    const statusText = isOnline
      ? "En ligne"
      : h.online === false
        ? "Hors ligne"
        : "Inconnu";
    const statusClass = isOnline ? "host-online" : "host-offline";

    const div = document.createElement("div");
    div.className =
      "bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col items-center group";
    div.dataset.hostId = h.id;

    div.innerHTML = `
            <div class="relative mb-3">
                <i class="fas fa-desktop text-4xl ${statusClass} transition-transform group-hover:scale-110"></i>
                <div class="absolute -top-1 -right-1 w-3 h-3 rounded-full ${isOnline ? "bg-green-500" : "bg-red-500"} border-2 border-white"></div>
            </div>
            <div class="font-bold text-gray-800">${h.id}</div>
            <div class="text-xs font-semibold uppercase mt-1 ${isOnline ? "text-green-600" : "text-red-500"}">${statusText}</div>
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

// 6. Acciones (Ping / Wake con Variable Global)
async function handleAction(action) {
  const selectedElements = Array.from(hostsGrid.querySelectorAll(".ring-2"));
  const selectedIds = selectedElements.map((el) => el.dataset.hostId);

  const type = selectedIds.length ? "Hosts" : "Room";
  const name = selectedIds.length ? selectedIds.join(",") : currentSalle;

  if (!name) return alert("Veuillez sélectionner une salle o des machines.");

  const btn = action === "ping" ? pingBtn : wakeBtn;
  const originalContent = btn.innerHTML;
  btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> En cours...`;
  btn.disabled = true;

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, name, action }),
    });
    const data = await res.json();

    if (action === "awake") {
      alert("Signal Wake-on-LAN envoyé ! Rafraîchissement dans 20s...");
      setTimeout(fetchHosts, 20000);
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

// Event Listeners
pingBtn.addEventListener("click", () => handleAction("ping"));
wakeBtn.addEventListener("click", () => handleAction("awake"));

init();
