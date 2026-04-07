import { getSessionToken } from './sessionAuth';

export const apiFetch = (input, init = {}) => {
  const headers = new Headers(init.headers || {});
  const token = getSessionToken();

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(input, {
    ...init,
    headers,
    credentials: 'omit',
  });
};
