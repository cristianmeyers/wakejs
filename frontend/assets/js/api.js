const getToken = () => localStorage.getItem("wakejs_token");

async function getConfig() {
  const response = await fetch("./assets/config/config.json");
  return await response.json();
}

export async function login(username, password) {
  const config = await getConfig();
  try {
    const res = await fetch(`${config.api.baseUrl}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) throw new Error("Authentication failed");

    const data = await res.json();
    localStorage.setItem("wakejs_token", data.token);
    return data;
  } catch (e) {
    throw new Error("Server unreachable");
  }
}

export async function verifyToken() {
  const config = await getConfig();
  if (!config.api.authEnabled) return true;

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

  const headers = { "Content-Type": "application/json" };
  if (config.api.authEnabled && token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${config.api.baseUrl}/api/action`, {
      method: "POST",
      headers: headers,
      body: JSON.stringify({ type, name, action, credentials }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.status === 401 || res.status === 403) {
      if (config.api.authEnabled) {
        localStorage.removeItem("wakejs_token");
        window.location.reload();
      }
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  } catch (e) {
    if (e.name === "AbortError") throw new Error("Request timeout");
    throw e;
  }
}

export async function fetchHostsData(salle) {
  try {
    const data = await callApi("Room", salle, "ping");
    return data.results || [];
  } catch (e) {
    console.warn("Backend offline, unable to fetch hosts");
    return [];
  }
}

export async function searchHosts(query) {
  const config = await getConfig();
  const token = getToken();

  const headers = {};
  if (config.api.authEnabled && token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(
      `${config.api.baseUrl}/api/search?q=${encodeURIComponent(query)}`,
      { headers },
    );
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    return [];
  }
}
