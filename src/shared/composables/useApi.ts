import { ref, readonly, type Ref } from 'vue';
import type { Result } from '../utils/result';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

export function useApi() {
  const loading = ref(false);
  const error: Ref<string | null> = ref(null);

  async function request<T>(url: string, options?: RequestInit): Promise<Result<T>> {
    loading.value = true;
    error.value = null;
    try {
      const response = await fetch(`${BASE_URL}${url}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        error.value = body.error ?? `HTTP ${response.status}`;
        return { ok: false, error: error.value! };
      }
      return { ok: true, value: await response.json() };
    } catch {
      error.value = 'Network error';
      return { ok: false, error: 'Network error' };
    } finally {
      loading.value = false;
    }
  }

  return { request, loading: readonly(loading), error: readonly(error) };
}
