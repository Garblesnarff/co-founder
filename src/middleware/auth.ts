import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { db } from '../db/client.js';
import { apiKeys } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';
import { verifyToken, type AuthTokenPayload } from '../lib/jwt.js';

export interface AuthContext {
  userId: string | null;
  roles: string[];
  isAnonymous: boolean;
}

async function verifyApiKey(token: string): Promise<AuthContext | null> {
  if (!token.startsWith('cofounder_')) {
    return null;
  }

  const keyHash = crypto.createHash('sha256').update(token).digest('hex');

  const [key] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, keyHash))
    .limit(1);

  if (!key || key.disabled) {
    return null;
  }

  // Update last used
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, key.id));

  return {
    userId: key.userId,
    roles: key.roles || ['authenticated'],
    isAnonymous: false,
  };
}

function verifyJwtToken(token: string): AuthContext | null {
  try {
    const payload = verifyToken(token);
    return {
      userId: payload.userId,
      roles: payload.roles || ['authenticated'],
      isAnonymous: false,
    };
  } catch {
    return null;
  }
}

export async function extractAuthContext(req: Request): Promise<AuthContext> {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);

    // Try API key first
    const apiKeyAuth = await verifyApiKey(token);
    if (apiKeyAuth) {
      return apiKeyAuth;
    }

    // Try JWT token (from OAuth)
    const jwtAuth = verifyJwtToken(token);
    if (jwtAuth) {
      return jwtAuth;
    }
  }

  // Anonymous
  return {
    userId: null,
    roles: ['anonymous'],
    isAnonymous: true,
  };
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    (req as any).auth = await extractAuthContext(req);
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    (req as any).auth = {
      userId: null,
      roles: ['anonymous'],
      isAnonymous: true,
    };
    next();
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const auth = (req as any).auth as AuthContext;
  if (auth.isAnonymous) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  next();
}
