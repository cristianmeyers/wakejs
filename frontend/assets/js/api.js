const getToken = () => localStorage.getItem("wakejs_token");

async function getConfig() {
  const response = await fetch("./assets/config/config.json");
  return await response.json();
}

export async function login(username, password) {
  const config = await getConfig();
  const res = await fetch(`${config.api.baseUrl}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) throw new Error("Échec d'authentification");

  const data = await res.json();
  localStorage.setItem("wakejs_token", data.token);
  return data;
}

export async function verifyToken() {
  const config = await getConfig();
  const token = getToken();
  if (!token) return false;

  try {
    const res = await fetch(`${config.api.baseUrl}/api/verify`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

export async function callApi(type, name, action, credentials = null) {
  const config = await getConfig();
  const token = getToken();
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    config.api.timeout || 15000,
  );

  try {
    const res = await fetch(`${config.api.baseUrl}/api/action`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ type, name, action, credentials }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem("wakejs_token");
      window.location.reload();
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    throw e;
  }
}

export async function fetchHostsData(salle) {
  const data = await callApi("Room", salle, "ping");
  return data.results;
}

export async function searchHosts(query) {
  const config = await getConfig();
  const token = getToken();

  const res = await fetch(
    `${config.api.baseUrl}/api/search?q=${encodeURIComponent(query)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!res.ok) return [];
  return await res.json();
}
