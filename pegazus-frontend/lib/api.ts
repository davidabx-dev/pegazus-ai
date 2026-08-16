const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

interface ApiFetchOptions extends RequestInit {
  headers?: Record<string, string>;
}

interface AuthTokensState {
  accessToken: string | null;
  refreshToken: string | null;
  updateTokens: (access: string, refresh: string) => void;
  logout: () => void;
}

export async function apiFetch<T>(
  endpoint: string,
  options: ApiFetchOptions = {},
  auth: AuthTokensState
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers: Record<string, string> = { ...options.headers };

  if (auth.accessToken && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${auth.accessToken}`;
  }

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (netErr: any) {
    throw new Error(`Falha de conexão com o servidor (${netErr?.message || 'Verifique se o backend está rodando na porta 8000'}).`);
  }

  // Interceptor de 401 Unauthorized -> Rotação Automática de Refresh Token
  if (response.status === 401 && auth.refreshToken) {
    try {
      const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: auth.refreshToken }),
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        auth.updateTokens(refreshData.access_token, refreshData.refresh_token);

        headers['Authorization'] = `Bearer ${refreshData.access_token}`;
        response = await fetch(url, { ...options, headers });
      } else {
        auth.logout();
        throw new Error('Sessão expirada. Faça login novamente.');
      }
    } catch (error) {
      auth.logout();
      throw error;
    }
  }

  if (!response.ok) {
    let errorDetail = `Erro HTTP ${response.status}`;
    try {
      const errJson = await response.json();
      if (typeof errJson.detail === 'string') {
        errorDetail = errJson.detail;
      } else if (Array.isArray(errJson.detail)) {
        errorDetail = errJson.detail.map((e: any) => e.msg || JSON.stringify(e)).join(', ');
      } else if (typeof errJson.detail === 'object') {
        errorDetail = JSON.stringify(errJson.detail);
      } else if (typeof errJson.message === 'string') {
        errorDetail = errJson.message;
      }
    } catch (_) {}
    throw new Error(errorDetail);
  }

  return response.json() as Promise<T>;
}
