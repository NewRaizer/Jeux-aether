const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function getTokens() {
  try {
    return JSON.parse(localStorage.getItem("immersyte_tokens") || "null");
  } catch {
    return null;
  }
}

export function setTokens(tokens) {
  if (tokens) localStorage.setItem("immersyte_tokens", JSON.stringify(tokens));
  else localStorage.removeItem("immersyte_tokens");
}

async function request(path, { method = "GET", body, auth = false, raw = false } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const tokens = getTokens();
    if (tokens?.access_token) headers["Authorization"] = `Bearer ${tokens.access_token}`;
  }

  let res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Try a token refresh once on 401.
  if (res.status === 401 && auth) {
    const tokens = getTokens();
    if (tokens?.refresh_token) {
      const refreshed = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: tokens.refresh_token }),
      });
      if (refreshed.ok) {
        const newTokens = await refreshed.json();
        setTokens(newTokens);
        headers["Authorization"] = `Bearer ${newTokens.access_token}`;
        res = await fetch(`${API_URL}${path}`, {
          method,
          headers,
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });
      } else {
        setTokens(null);
      }
    }
  }

  if (raw) return res;

  if (!res.ok) {
    let detail = `Error ${res.status}`;
    try {
      const data = await res.json();
      detail = data.detail || detail;
    } catch {
      /* ignore */
    }
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }

  if (res.status === 204) return null;
  return res.json();
}

async function upload(path, file, fieldName = "file") {
  const form = new FormData();
  form.append(fieldName, file);
  const headers = {};
  const tokens = getTokens();
  if (tokens?.access_token)
    headers["Authorization"] = `Bearer ${tokens.access_token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers,
    body: form,
  });

  if (!res.ok) {
    let detail = `Error ${res.status}`;
    try {
      const data = await res.json();
      detail = data.detail || detail;
    } catch {
      /* ignore */
    }
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return res.json();
}

export const api = {
  url: API_URL,
  get: (p, auth = true) => request(p, { auth }),
  post: (p, body, auth = true) => request(p, { method: "POST", body, auth }),
  put: (p, body, auth = true) => request(p, { method: "PUT", body, auth }),
  patch: (p, body, auth = true) => request(p, { method: "PATCH", body, auth }),
  del: (p, auth = true) => request(p, { method: "DELETE", auth }),
  raw: (p, auth = true) => request(p, { auth, raw: true }),
  upload,
};
