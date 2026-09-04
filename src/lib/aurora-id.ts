// src/lib/aurora-id.ts

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'OPERATOR';

export interface UserProfile {
  userId: string;
  pin: string;
  fullName: string;
  phoneWA: string;
  role: UserRole;
}

// Akun Admin Default Awal
export const DEFAULT_ADMIN: UserProfile = {
  userId: 'AUROR61710',
  pin: '123456',
  fullName: 'Super Admin Aurora',
  phoneWA: '081234567890',
  role: 'SUPER_ADMIN',
};

export function getStoredUsers(): UserProfile[] {
  if (typeof window === 'undefined') return [DEFAULT_ADMIN];
  const users = localStorage.getItem('aurora_users');
  if (!users) {
    localStorage.setItem('aurora_users', JSON.stringify([DEFAULT_ADMIN]));
    return [DEFAULT_ADMIN];
  }
  return JSON.parse(users);
}

export function saveUsers(users: UserProfile[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('aurora_users', JSON.stringify(users));
  }
}

export function getActiveSession(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  const session = localStorage.getItem('aurora_active_session');
  return session ? JSON.parse(session) : null;
}

export function setActiveSession(user: UserProfile | null) {
  if (typeof window !== 'undefined') {
    if (user) {
      localStorage.setItem('aurora_active_session', JSON.stringify(user));
    } else {
      localStorage.removeItem('aurora_active_session');
    }
  }
}