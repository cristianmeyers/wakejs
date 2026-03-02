async function getConfig() {
  const response = await fetch("./assets/config/config.json");
  return await response.json();
}

export async function callApi(type, name, action) {
  const config = await getConfig();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.api.timeout);

  try {
    const res = await fetch(`${config.api.baseUrl}/api/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, name, action }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    throw new Error("Erreur API : " + e.message);
  }
}

export async function fetchHostsData(salle) {
  const data = await callApi("Room", salle, "ping");
  return data.results;
}
