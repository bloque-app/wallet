const API_URL = 'https://api.bloque.app';

export const apiFetch = async (
  path: `/${string}`,
  init?: RequestInit,
): Promise<Response> => {
  const url = `${API_URL}${path}`;
  return await fetch(url, {
    credentials: 'include',
    ...init,
  });
};
