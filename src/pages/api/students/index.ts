import type { APIRoute } from "astro";
import type { D1Database } from "@cloudflare/workers-types"; export const GET: APIRoute = async ({ request, locals }) => {
    try {
        const db = (locals as any).runtime.env.DB as D1Database;
        const url = new URL(request.url);
        const nim = url.searchParams.get("nim");

        if (nim) {
            const { results } = await db.prepare("SELECT * FROM students WHERE nim = ?").bind(nim).all();
            if (results && results.length > 0) {
                return new Response(JSON.stringify(results[0]), { status: 200 });
            }
            return new Response(JSON.stringify({ error: "Student not found" }), { status: 404 });
        }

        const { results } = await db.prepare("SELECT * FROM students ORDER BY no ASC").all();
        return new Response(JSON.stringify({ students: results }), { status: 200 });
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}

import { requireAdminAuth } from "../../../lib/middleware/adminAuth";

export const PUT: APIRoute = async ({ request, locals }) => {
    try {
        const isAuthenticated = await requireAdminAuth({ request } as any);
        if (!isAuthenticated) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }

        const db = (locals as any).runtime.env.DB as D1Database;
        const payload = await request.json();
        const { originalNim, no, nama, nim } = payload;

        if (!originalNim || !nama || !nim || no === undefined) {
            return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
        }

        const result = await db.prepare(`
            UPDATE students 
            SET no = ?, nama = ?, nim = ?
            WHERE nim = ?
        `).bind(no, nama, nim, originalNim).run();

        if (result.meta?.changes === 0) {
            return new Response(JSON.stringify({ error: "Student not found or no changes made" }), { status: 404 });
        }

        return new Response(JSON.stringify({ success: true, message: "Student updated successfully" }), { status: 200 });
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
