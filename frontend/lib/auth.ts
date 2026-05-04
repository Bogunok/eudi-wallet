import api from './api';

export type Role = 'HOLDER' | 'ISSUER' | 'VERIFIER' | 'ADMIN';

export interface CurrentUser {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const response = await api.get<{
      success: boolean;
      message: string;
      data: CurrentUser;
    }>('/user');
    return response.data.data;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout', {});
  } catch {}
  if (typeof window !== 'undefined') {
    // savedEmail запам'ятати пристрій для PIN-логіну
    // localStorage.removeItem('savedEmail');
    window.location.href = '/login';
  }
}

export function hasRole(user: CurrentUser | null, ...allowed: Role[]): boolean {
  if (!user) return false;
  return allowed.includes(user.role);
}

export function defaultRouteForRole(role: Role): string {
  switch (role) {
    case 'HOLDER':
      return '/wallet';
    case 'ISSUER':
      return '/issuer';
    case 'VERIFIER':
      return '/verifier';
    case 'ADMIN':
      return '/admin';
  }
}
