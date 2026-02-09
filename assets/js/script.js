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
  // Agregar los demás departamentos
};

const departementEl = document.getElementById("departement");
const salleEl = document.getElementById("salle");
const searchBtn = document.getElementById("searchBtn");
const hostsGrid = document.getElementById("hostsGrid");
const wakeBtn = document.getElementById("wakeBtn");
const pingBtn = document.getElementById("pingBtn");

let currentHosts = [];

Object.keys(departements).forEach((d) => {
  const opt = document.createElement("option");
  opt.value = d;
  opt.textContent = d;
  departementEl.appendChild(opt);
});

departementEl.addEventListener("change", () => {
  const dep = departementEl.value;
  salleEl.innerHTML = '<option value="">-- Choisir Salle --</option>';
  if (!dep) return;
  departements[dep].forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    salleEl.appendChild(opt);
  });
});

searchBtn.addEventListener("click", fetchHosts);
pingBtn.addEventListener("click", () => doAction("ping"));
wakeBtn.addEventListener("click", () => doAction("awake"));

async function fetchHosts() {
  const salle = salleEl.value;
  if (!salle) return alert("Choisir une salle");

  hostsGrid.innerHTML = "Chargement...";
  try {
    const res = await fetch("http://172.18.61.113:3000/api/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "Room", name: salle, action: "ping" }),
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
      <i class="fas fa-desktop text-4xl mb-2 ${h.online ? "host-online" : h.online === false ? "host-offline" : "host-na"}"></i>
      <div class="font-bold">${h.id}</div>
      <div class="text-sm">${h.online === true ? "Online" : h.online === false ? "Offline" : "N/A"}</div>
    `;
    div.addEventListener("click", () => {
      div.classList.toggle("border-blue-500");
      div.classList.toggle("border-4");
    });

    hostsGrid.appendChild(div);
  });
}

async function doAction(action) {
  const selectedHosts = Array.from(hostsGrid.querySelectorAll(".border-4")).map(
    (d) => d.dataset.host,
  );
  if (!selectedHosts.length && !currentHosts.length)
    return alert("Aucun host à sélectionner");

  const type = selectedHosts.length ? "Hosts" : "Room";
  const name = selectedHosts.length ? selectedHosts.join(",") : salleEl.value;

  try {
    const res = await fetch("http://172.18.61.113:3000/api/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, name, action }),
    });
    const data = await res.json();
    currentHosts = data.results;
    renderHosts();

    if (action === "awake") {
      setTimeout(() => doAction("ping"), 40000);
    }
  } catch (e) {
    alert("Erreur: " + e.message);
  }
}
