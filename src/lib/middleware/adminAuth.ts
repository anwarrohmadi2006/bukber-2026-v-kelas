/**
 * JWT-based admin authentication middleware.
 * Uses jose library for JWT verification (Cloudflare Workers compatible).
 */
import { jwtVerify } from 'jose';

const COOKIE_NAME = 'admin_token';
const DEFAULT_SECRET = 'bukber2026-secret-key-change-in-production';

function getSecret(env?: any): Uint8Array {
    const secret = env?.JWT_SECRET || DEFAULT_SECRET;
    return new TextEncoder().encode(secret);
}

function parseCookies(cookieHeader: string): Record<string, string> {
    const cookies: Record<string, string> = {};
    cookieHeader.split(';').forEach((cookie) => {
        const [name, ...rest] = cookie.split('=');
        if (name) {
            cookies[name.trim()] = rest.join('=').trim();
        }
    });
    return cookies;
}

export async function requireAdminAuth(context: { request: Request; locals?: any }): Promise<boolean> {
    try {
        const cookieHeader = context.request.headers.get('cookie') || '';
        const cookies = parseCookies(cookieHeader);
        const token = cookies[COOKIE_NAME];

        if (!token) {
            return false;
        }

        const env = context.locals?.runtime?.env;
        const secret = getSecret(env);

        const { payload } = await jwtVerify(token, secret);
        return payload.role === 'admin';
    } catch (error) {
        console.error('JWT verification failed:', error);
        return false;
    }
}

export { COOKIE_NAME, getSecret };
