import { WorkOS } from '@workos-inc/node';
import jwt from 'jsonwebtoken';
import { env, adminUserIds } from '../config/env.js';

export const workos = new WorkOS(env.WORKOS_API_KEY);

export const authConfig = {
  clientId: env.WORKOS_CLIENT_ID,
};

export interface WorkOSUser {
  userId: string;
  email: string;
}

export async function verifyWorkOSToken(accessToken: string): Promise<WorkOSUser | null> {
  try {
    const decoded = jwt.decode(accessToken) as Record<string, unknown> | null;

    if (!decoded || !decoded.sub) {
      return null;
    }

    return {
      userId: decoded.sub as string,
      email: (decoded.email as string) || '',
    };
  } catch (error) {
    console.error('WorkOS token verification failed:', error);
    return null;
  }
}

export function resolveUserRoles(userId: string): string[] {
  const roles: string[] = ['authenticated'];

  if (adminUserIds.includes(userId)) {
    roles.push('admin');
  }

  return roles;
}
