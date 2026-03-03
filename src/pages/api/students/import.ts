import type { APIRoute } from "astro";
import type { D1Database } from "@cloudflare/workers-types"; export const POST: APIRoute = async ({ request, locals }) => {
    try {
        const db = (locals as any).runtime.env.DB as D1Database;
        const payload = await request.json();
        const students = payload.students; // Expected shape: { no, nama, nim }[]

        if (!students || !Array.isArray(students)) {
            return new Response(JSON.stringify({ error: "Invalid payload format. Expected { students: [...] }" }), { status: 400 });
        }

        // We can use a transaction or batch to insert all records efficiently.
        // First, clear existing students if that's the desired behavior (replace all)
        // Alternatively, you could just insert or ignore, but replacing all is usually easier for "import excel" flows to sync state.

        const statements = [];

        // Insert new records or update existing based on NIM
        const insertStmt = db.prepare(`
            INSERT INTO students (no, nama, nim) 
            VALUES (?, ?, ?) 
            ON CONFLICT(nim) DO UPDATE SET 
                no = excluded.no, 
                nama = excluded.nama
        `);
        for (const student of students) {
            statements.push(insertStmt.bind(student.no, student.nama, String(student.nim)));
        }

        // Execute batch
        await db.batch(statements);

        return new Response(JSON.stringify({ message: `Successfully imported ${students.length} students.` }), { status: 200 });

    } catch (error: any) {
        console.error("Import error:", error);
        return new Response(JSON.stringify({ error: "Failed to import students: " + error.message }), { status: 500 });
    }
}
