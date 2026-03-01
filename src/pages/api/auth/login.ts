import type { APIRoute } from 'astro';
import { SignJWT } from 'jose';
import { COOKIE_NAME, getSecret } from '../../../lib/middleware/adminAuth';

export const prerender = false;

// Admin credentials — in production use env vars
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'bukber2026';

export const POST: APIRoute = async ({ request, locals }) => {
    try {
        const body = await request.json();
        const { username, password } = body;

        if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
            return new Response(JSON.stringify({ error: 'Username atau password salah' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const env = (locals as any).runtime?.env;
        const secret = getSecret(env);

        // Generate JWT token — expires in 24 hours
        const token = await new SignJWT({ username, role: 'admin' })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('24h')
            .sign(secret);

        const headers = new Headers({
            'Content-Type': 'application/json',
            'Set-Cookie': `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`
        });

        return new Response(JSON.stringify({ success: true, message: 'Login berhasil' }), {
            status: 200,
            headers
        });
    } catch (error) {
        console.error('Login error:', error);
        return new Response(JSON.stringify({ error: 'Terjadi kesalahan saat login' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
