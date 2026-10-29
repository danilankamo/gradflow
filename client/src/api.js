export const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:5000';

export async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(`${API_URL}${path}`, {
      credentials: 'include', ...options,
      signal: options.signal ? AbortSignal.any([options.signal, controller.signal]) : controller.signal,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = data?.message || data?.error;
      const fallback = response.status === 429
        ? 'Too many requests. Please wait before trying again.'
        : response.status === 401 ? 'Your session has expired. Please sign in again.'
          : 'The request could not be completed. Please try again.';
      throw Object.assign(new Error(Array.isArray(detail) ? detail.join(' ') : detail || fallback), { status: response.status });
    }
    if (!data) throw new Error('The server returned an unexpected response. Please try again.');
    return data;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The request timed out. Please try again.');
    if (error instanceof TypeError) throw new Error('Cannot reach GradFlow. Check your connection and try again.');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
