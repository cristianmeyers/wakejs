const config = await fetch("../conf/config.json").then((r) => r.json());

const API_URL = config.api.baseUrl + "/action";
const TIMEOUT = config.api.timeout || 15000;

export async function callApi(type, name, action) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, name, action }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    throw new Error(`Erreur de connexion API: ${e.message}`);
  }
}

export async function fetchHostsData(salle) {
  const data = await callApi("Room", salle, "ping");
  return data.results;
}
