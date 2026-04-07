export const AUTH_SESSION_KEYS = {
  token: 'neprideAuthToken',
  role: 'userRole',
  access: 'isServiceAccessAllowed',
  status: 'verificationStatus',
  name: 'userName',
};

export const normalizeRole = (role) => {
  const normalized = String(role || '').trim().toLowerCase();

  if (normalized === 'customer' || normalized === 'costumer') return 'customer';
  if (normalized === 'vendor') return 'vendor';
  if (normalized === 'admin') return 'admin';

  return '';
};

export const getSessionToken = () => sessionStorage.getItem(AUTH_SESSION_KEYS.token) || '';

export const setSessionToken = (token) => {
  if (token) {
    sessionStorage.setItem(AUTH_SESSION_KEYS.token, token);
  } else {
    sessionStorage.removeItem(AUTH_SESSION_KEYS.token);
  }
};

export const setSessionAuth = ({ token, role, isServiceAccessAllowed, verificationStatus, userName }) => {
  setSessionToken(token);

  if (role !== undefined) {
    sessionStorage.setItem(AUTH_SESSION_KEYS.role, normalizeRole(role));
  }

  if (isServiceAccessAllowed !== undefined) {
    sessionStorage.setItem(AUTH_SESSION_KEYS.access, isServiceAccessAllowed ? 'true' : 'false');
  }

  if (verificationStatus !== undefined) {
    sessionStorage.setItem(AUTH_SESSION_KEYS.status, String(verificationStatus || 'NotSubmitted'));
  }

  if (userName !== undefined) {
    sessionStorage.setItem(AUTH_SESSION_KEYS.name, String(userName || ''));
  }
};

export const clearSessionAuth = () => {
  Object.values(AUTH_SESSION_KEYS).forEach((key) => sessionStorage.removeItem(key));
};

export const getStoredRole = () => normalizeRole(sessionStorage.getItem(AUTH_SESSION_KEYS.role));

export const getStoredServiceAccessAllowed = () => sessionStorage.getItem(AUTH_SESSION_KEYS.access) === 'true';

export const getStoredVerificationStatus = () => sessionStorage.getItem(AUTH_SESSION_KEYS.status) || 'NotSubmitted';

export const getStoredUserName = () => sessionStorage.getItem(AUTH_SESSION_KEYS.name) || '';
