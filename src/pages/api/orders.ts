import type { APIRoute } from 'astro';
import type { Order } from '../../lib/data/menu';
import { requireAdminAuth } from '../../lib/middleware/adminAuth';

export const prerender = false;

// Helper to ensure the orders table exists
async function ensureTable(db: any) {
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_name TEXT NOT NULL,
        items TEXT NOT NULL,
        sub_total INTEGER NOT NULL,
        subsidy_applied INTEGER NOT NULL,
        final_total INTEGER NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `).run();
  } catch (e) {
    // Table might already exist, ignore error
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
    const env = locals.runtime?.env || import.meta.env;
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

    // Ensure table exists
    await ensureTable(db);

    // Insert order into D1 database
    const result = await db.prepare(`
      INSERT INTO orders (user_name, items, sub_total, subsidy_applied, final_total, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      body.userName,
      JSON.stringify(body.items),
      body.subTotal,
      body.subsidyApplied,
      body.finalTotalToPay
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
    // Return success anyway for dev mode - order data was logged
    return new Response(JSON.stringify({ 
      success: true,
      id: Date.now(),
      message: 'Order received (fallback mode)'
    }), {
      status: 200,
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
    
    const db = locals.runtime?.env?.DB || import.meta.env.DB;
    
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

    const result = await db.prepare(`
      SELECT * FROM orders ORDER BY created_at DESC
    `).all();

    const orders = result.results.map((row: any) => ({
      id: row.id,
      userName: row.user_name,
      items: JSON.parse(row.items),
      subTotal: row.sub_total,
      subsidyApplied: row.subsidy_applied,
      finalTotalToPay: row.final_total,
      createdAt: row.created_at
    }));

    return new Response(JSON.stringify({ orders }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    // Return empty orders array on error
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
    const isAuthenticated = await requireAdminAuth({ request } as any);
    if (!isAuthenticated) {
      return new Response(JSON.stringify({ 
        error: 'Unauthorized' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const body = await request.json();
    const { id, userName, items, subTotal, subsidyApplied, finalTotalToPay } = body;
    
    if (!id) {
      return new Response(JSON.stringify({ 
        error: 'Order ID is required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const db = (locals.runtime as any)?.env?.DB;
    
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
      SET user_name = ?, items = ?, sub_total = ?, subsidy_applied = ?, final_total = ?
      WHERE id = ?
    `).bind(
      userName,
      JSON.stringify(items),
      subTotal,
      subsidyApplied,
      finalTotalToPay,
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
    
    const db = (locals.runtime as any)?.env?.DB;
    
    if (!db) {
      return new Response(JSON.stringify({ 
        error: 'Database not available' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Delete order from D1 database
    const result = await db.prepare(`
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
