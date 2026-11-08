const API = '/api';
export async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    credentials: options.credentials || 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed.');
  return data;
}
