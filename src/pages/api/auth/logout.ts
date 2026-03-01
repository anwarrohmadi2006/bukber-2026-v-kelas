import type { APIRoute } from 'astro';
import { COOKIE_NAME } from '../../../lib/middleware/adminAuth';

export const prerender = false;

export const POST: APIRoute = async () => {
    // Clear the JWT cookie
    const headers = new Headers({
        'Content-Type': 'application/json',
        'Set-Cookie': `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`
    });

    return new Response(JSON.stringify({ success: true, message: 'Logout berhasil' }), {
        status: 200,
        headers
    });
};
