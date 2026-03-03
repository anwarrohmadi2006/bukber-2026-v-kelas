import type { APIRoute } from 'astro';
import type { Order } from '../../lib/data/menu';
import { requireAdminAuth } from '../../lib/middleware/adminAuth';

export const prerender = false;

// Helper to ensure the orders table exists and has all columns
async function ensureTable(db: any) {
  try {
    // 1. Create table if not exists
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_name TEXT NOT NULL,
        user_nim TEXT,
        student_no INTEGER,
        items TEXT NOT NULL,
        sub_total INTEGER NOT NULL,
        subsidy_applied INTEGER NOT NULL,
        final_total INTEGER NOT NULL,
        payment_proof_url TEXT,
        payment_status TEXT DEFAULT 'pending',
        note TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `).run();

    // 2. Check for missing columns (for existing databases)
    const tableInfo = await db.prepare("PRAGMA table_info(orders)").all();
    const columns = tableInfo.results.map((r: any) => r.name);

    if (!columns.includes('user_nim')) {
      await db.prepare("ALTER TABLE orders ADD COLUMN user_nim TEXT").run();
    }
    if (!columns.includes('student_no')) {
      await db.prepare("ALTER TABLE orders ADD COLUMN student_no INTEGER").run();
    }
    if (!columns.includes('payment_proof_url')) {
      await db.prepare("ALTER TABLE orders ADD COLUMN payment_proof_url TEXT").run();
    }
    if (!columns.includes('payment_status')) {
      await db.prepare("ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'pending'").run();
    }
    if (!columns.includes('note')) {
      await db.prepare("ALTER TABLE orders ADD COLUMN note TEXT").run();
    }
  } catch (e) {
    console.error('Error ensuring table/schema:', e);
  }
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body: Order = await request.json();

    // Validate required fields
    if (!body.userName || !body.items || body.items.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid order data' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Access D1 database from Cloudflare runtime
    const env = (locals as any).runtime?.env || import.meta.env;
    const db = env.DB;

    if (!db) {
      // Fallback for development without D1
      console.log('Order received (no DB):', JSON.stringify(body, null, 2));
      return new Response(JSON.stringify({
        success: true,
        message: 'Order received (development mode)',
        id: Date.now()
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Ensure table exists and is up to date
    await ensureTable(db);

    // Insert order into D1 database
    const result = await db.prepare(`
      INSERT INTO orders (user_name, user_nim, student_no, items, sub_total, subsidy_applied, final_total, payment_proof_url, payment_status, note, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      body.userName,
      body.userNIM || null,
      body.studentNo || null,
      JSON.stringify(body.items),
      body.subTotal,
      body.subsidyApplied,
      body.finalTotalToPay,
      body.paymentProofUrl || null,
      body.paymentStatus || 'pending',
      body.note || null
    ).run();

    return new Response(JSON.stringify({
      success: true,
      id: result.meta?.last_row_id,
      message: 'Order submitted successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error processing order:', error);
    return new Response(JSON.stringify({
      error: 'Error processing order'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const GET: APIRoute = async ({ locals, request }) => {
  try {
    const url = new URL(request.url);
    const isAdminRequest = url.searchParams.get('admin') === 'true';

    // If it's an admin request, check authentication
    if (isAdminRequest) {
      const isAuthenticated = await requireAdminAuth({ request } as any);
      if (!isAuthenticated) {
        return new Response(JSON.stringify({
          error: 'Unauthorized'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    const db = (locals as any).runtime?.env?.DB || import.meta.env.DB;

    if (!db) {
      return new Response(JSON.stringify({
        orders: [],
        message: 'Database not available (development mode)'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Ensure table exists
    await ensureTable(db);

    // Support filtering by NIM (for user edit checking)
    const nimParam = url.searchParams.get('nim');

    let result;
    if (nimParam) {
      result = await db.prepare(`
        SELECT * FROM orders WHERE user_nim = ? ORDER BY created_at DESC LIMIT 1
      `).bind(nimParam).all();
    } else {
      result = await db.prepare(`
        SELECT * FROM orders ORDER BY created_at DESC
      `).all();
    }

    const orders = result.results.map((row: any) => ({
      id: row.id,
      userName: row.user_name,
      userNIM: row.user_nim,
      studentNo: row.student_no,
      items: JSON.parse(row.items),
      subTotal: row.sub_total,
      subsidyApplied: row.subsidy_applied,
      finalTotalToPay: row.final_total,
      paymentProofUrl: row.payment_proof_url,
      paymentStatus: row.payment_status,
      note: row.note,
      createdAt: row.created_at
    }));

    return new Response(JSON.stringify({ orders }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return new Response(JSON.stringify({
      orders: [],
      message: 'Error fetching orders'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Handle PUT request for updating orders (admin only)
export const PUT: APIRoute = async ({ request, locals }) => {
  try {
    const url = new URL(request.url);
    const isAdminRequest = url.searchParams.get('admin') === 'true';

    if (isAdminRequest) {
      const isAuthenticated = await requireAdminAuth({ request } as any);
      if (!isAuthenticated) {
        return new Response(JSON.stringify({
          error: 'Unauthorized'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    const body: Order = await request.json();
    const { id, userName, userNIM, studentNo, items, subTotal, subsidyApplied, finalTotalToPay, paymentProofUrl, paymentStatus, note } = body;

    if (!id) {
      return new Response(JSON.stringify({
        error: 'Order ID is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = (locals as any).runtime?.env?.DB;

    if (!db) {
      return new Response(JSON.stringify({
        error: 'Database not available'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update order in D1 database
    const result = await db.prepare(`
      UPDATE orders 
      SET user_name = ?, user_nim = ?, student_no = ?, items = ?, sub_total = ?, subsidy_applied = ?, final_total = ?, payment_proof_url = ?, payment_status = ?, note = ?
      WHERE id = ?
    `).bind(
      userName,
      userNIM || null,
      studentNo || null,
      JSON.stringify(items),
      subTotal,
      subsidyApplied,
      finalTotalToPay,
      paymentProofUrl || null,
      paymentStatus || 'pending',
      note || null,
      id
    ).run();

    if (result.meta.changes === 0) {
      return new Response(JSON.stringify({
        error: 'Order not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Order updated successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error updating order:', error);
    return new Response(JSON.stringify({
      error: 'Error updating order'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Handle DELETE request for deleting orders (admin only)
export const DELETE: APIRoute = async ({ request, locals }) => {
  try {
    const isAuthenticated = await requireAdminAuth({ request } as any);
    if (!isAuthenticated) {
      return new Response(JSON.stringify({
        error: 'Unauthorized'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(JSON.stringify({
        error: 'Order ID is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = (locals as any).runtime?.env?.DB;

    if (!db) {
      return new Response(JSON.stringify({
        error: 'Database not available'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Delete ALL orders if id === 'ALL' (Admin only)
    let result;
    if (id === 'ALL') {
      result = await db.prepare(`DELETE FROM orders`).run();

      return new Response(JSON.stringify({
        success: true,
        message: 'Seluruh pesanan berhasil direset/dihapus!'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      // Delete single order from D1 database
      result = await db.prepare(`
        DELETE FROM orders WHERE id = ?
      `).bind(id).run();

      if (result.meta.changes === 0) {
        return new Response(JSON.stringify({
          error: 'Order not found'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Order deleted successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error deleting order:', error);
    return new Response(JSON.stringify({
      error: 'Error deleting order'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
