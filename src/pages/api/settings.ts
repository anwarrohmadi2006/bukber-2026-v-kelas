import type { APIRoute } from 'astro';
import { requireAdminAuth } from '../../lib/middleware/adminAuth';

export const prerender = false;

// In-memory fallback for dev mode
let devSubsidyAmount = 30000;

async function ensureSettingsTable(db: any) {
    try {
        await db.prepare(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `).run();

        // Insert default subsidy if not exists
        await db.prepare(`
      INSERT OR IGNORE INTO settings (key, value) VALUES ('subsidy_amount', '30000')
    `).run();
    } catch (e) {
        // Table might already exist
    }
}

export const GET: APIRoute = async ({ locals }) => {
    try {
        const db = (locals as any).runtime?.env?.DB;

        if (!db) {
            return new Response(JSON.stringify({
                subsidyAmount: devSubsidyAmount
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        await ensureSettingsTable(db);

        const result = await db.prepare(
            `SELECT value FROM settings WHERE key = 'subsidy_amount'`
        ).first();

        return new Response(JSON.stringify({
            subsidyAmount: result ? parseInt(result.value) : 30000
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error fetching settings:', error);
        return new Response(JSON.stringify({ subsidyAmount: 30000 }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};

export const PUT: APIRoute = async ({ request, locals }) => {
    try {
        // Admin auth required
        const isAuthenticated = await requireAdminAuth({ request, locals } as any);
        if (!isAuthenticated) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const body = await request.json();
        const { subsidyAmount } = body;

        if (typeof subsidyAmount !== 'number' || subsidyAmount < 0) {
            return new Response(JSON.stringify({ error: 'Invalid subsidy amount' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const db = (locals as any).runtime?.env?.DB;

        if (!db) {
            // Dev mode fallback
            devSubsidyAmount = subsidyAmount;
            return new Response(JSON.stringify({
                success: true,
                subsidyAmount: devSubsidyAmount,
                message: 'Subsidi berhasil diperbarui (dev mode)'
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        await ensureSettingsTable(db);

        await db.prepare(
            `INSERT OR REPLACE INTO settings (key, value) VALUES ('subsidy_amount', ?)`
        ).bind(subsidyAmount.toString()).run();

        return new Response(JSON.stringify({
            success: true,
            subsidyAmount,
            message: 'Subsidi berhasil diperbarui'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error updating settings:', error);
        return new Response(JSON.stringify({ error: 'Gagal memperbarui subsidi' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
