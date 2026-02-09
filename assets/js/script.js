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

const departementEl = document.getElementById("departement");
const salleInput = document.getElementById("salleInput");
const searchBtn = document.getElementById("searchBtn");
const sallesGrid = document.getElementById("sallesGrid");
const hostsGrid = document.getElementById("hostsGrid");
const wakeBtn = document.getElementById("wakeBtn");
const pingBtn = document.getElementById("pingBtn");

let currentSalle = null;
let currentHosts = [];

// Cargar departamentos
Object.keys(departements).forEach((d) => {
  const opt = document.createElement("option");
  opt.value = d;
  opt.textContent = d;
  departementEl.appendChild(opt);
});

// Mostrar salas como cards
function renderSalles(dept) {
  sallesGrid.innerHTML = "";
  if (!dept || !departements[dept]) return;
  departements[dept].forEach((s) => {
    const div = document.createElement("div");
    div.className =
      "card-hover bg-white rounded-xl p-4 border cursor-pointer text-center";
    div.textContent = s;
    div.addEventListener("click", () => {
      currentSalle = s;
      salleInput.value = s;
      Array.from(sallesGrid.children).forEach((c) =>
        c.classList.remove("border-blue-600", "border-4"),
      );
      div.classList.add("border-blue-600", "border-4");
    });
    sallesGrid.appendChild(div);
  });
}

// Eventos
departementEl.addEventListener("change", () =>
  renderSalles(departementEl.value),
);
searchBtn.addEventListener("click", fetchHosts);
pingBtn.addEventListener("click", () => doAction("ping"));
wakeBtn.addEventListener("click", () => doAction("awake"));

// Pedir hosts a la API y mostrar
async function fetchHosts() {
  if (!currentSalle && !salleInput.value) return alert("Seleccione sala");
  currentSalle = salleInput.value.trim();

  hostsGrid.innerHTML = "Chargement...";
  try {
    const res = await fetch("http://172.18.61.113:3000/api/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "Room",
        name: currentSalle,
        action: "ping",
      }),
    });
    const data = await res.json();
    currentHosts = data.results;
    renderHosts();
  } catch (e) {
    hostsGrid.innerHTML = "Erreur: " + e.message;
  }
}

function renderHosts() {
  hostsGrid.innerHTML = "";
  if (!currentHosts.length) {
    hostsGrid.innerHTML = "<p>Aucun host trouvé</p>";
    return;
  }
  currentHosts.forEach((h) => {
    const div = document.createElement("div");
    div.className =
      "card-hover bg-white rounded-xl p-4 border cursor-pointer flex flex-col items-center text-center";
    div.dataset.host = h.id;
    div.innerHTML = `
      <i class="fas fa-desktop text-4xl mb-2 ${h.online === true ? "host-online" : h.online === false ? "host-offline" : "host-na"}"></i>
      <div class="font-bold">${h.id}</div>
      <div class="text-sm">${h.online === true ? "Online" : h.online === false ? "Offline" : "N/A"}</div>
    `;
    div.addEventListener("click", () => {
      div.classList.toggle("border-4");
      div.classList.toggle("border-blue-600");
    });
    hostsGrid.appendChild(div);
  });
}

// Acción wake / ping
async function doAction(action) {
  const selectedHosts = Array.from(hostsGrid.querySelectorAll(".border-4")).map(
    (d) => d.dataset.host,
  );
  const type = selectedHosts.length ? "Hosts" : "Room";
  const name = selectedHosts.length ? selectedHosts.join(",") : currentSalle;

  if (!name) return alert("Aucun host à sélectionner");

  try {
    const res = await fetch("http://172.18.61.113:3000/api/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, name, action }),
    });
    const data = await res.json();
    currentHosts = data.results;
    renderHosts();

    if (action === "awake") setTimeout(() => doAction("ping"), 40000);
  } catch (e) {
    alert("Erreur: " + e.message);
  }
}
