const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').trim();

function buildUrl(path) {
  if (!path) return API_BASE_URL || '/';
  if (/^https?:\/\//i.test(path)) return path;

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (!API_BASE_URL) return normalizedPath;

  const normalizedBase = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  return `${normalizedBase}${normalizedPath}`;
}

export async function apiRequest(path, options = {}) {
  const method = String(options.method || 'GET').toUpperCase();
  const maxAttempts = method === 'GET' ? 3 : 1;

  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const headers = {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    };

    try {
      const response = await fetch(buildUrl(path), {
        credentials: 'include',
        ...options,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      const contentType = response.headers.get('content-type') || '';
      const payload = contentType.includes('application/json')
        ? await response.json().catch(() => null)
        : await response.text().catch(() => '');

      if (!response.ok) {
        const message =
          (payload && typeof payload === 'object' && (payload.message || payload.error)) ||
          (typeof payload === 'string' && payload) ||
          `Request failed with status ${response.status}`;

        const canRetry = method === 'GET' && response.status >= 500 && attempt < maxAttempts;
        if (canRetry) {
          lastError = new Error(message);
          continue;
        }

        throw new Error(message);
      }

      return payload;
    } catch (error) {
      lastError = error;
      const canRetry = method === 'GET' && attempt < maxAttempts;
      if (!canRetry) break;
    }
  }

  throw lastError || new Error('Request failed.');
}
