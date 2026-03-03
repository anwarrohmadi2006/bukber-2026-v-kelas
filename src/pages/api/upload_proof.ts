import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const orderId = formData.get('orderId') as string;

        if (!file || !orderId) {
            return new Response(JSON.stringify({ error: 'Missing file or orderId' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const env = (locals as any).runtime?.env || import.meta.env;
        const bucket = env.PAYMENTS_BUCKET;
        const db = env.DB;

        if (!bucket || !db) {
            // In local dev without R2 setup, mock success
            return new Response(JSON.stringify({
                success: true,
                message: 'Mock file uploaded (development mode)',
                url: 'mock-url.jpg'
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Generate unique key for R2
        const fileExtension = file.name.split('.').pop() || 'jpg';
        const uniqueFileName = `order-${orderId}-${Date.now()}.${fileExtension}`;

        // Upload to R2
        const arrayBuffer = await file.arrayBuffer();
        await bucket.put(uniqueFileName, arrayBuffer, {
            httpMetadata: { contentType: file.type }
        });

        // Generate public URL (assuming public access is enabled or via a worker route)
        // Cloudflare Pages specific: if bucket is not public, you might need a separate 
        // endpoint to serve images. For now, we will store the unique key as the URL 
        // and create a GET handler here to serve the image.
        const origin = new URL(request.url).origin;
        const fileUrl = `${origin}/api/upload_proof?key=${uniqueFileName}`;

        // Update the database with the URL
        await db.prepare(`
        UPDATE orders 
        SET payment_proof_url = ?
        WHERE id = ?
    `).bind(fileUrl, orderId).run();

        return new Response(JSON.stringify({
            success: true,
            message: 'File uploaded successfully',
            url: fileUrl
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error uploading file:', error);
        return new Response(JSON.stringify({ error: 'Failed to upload file' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};

export const GET: APIRoute = async ({ request, locals }) => {
    try {
        const url = new URL(request.url);
        const key = url.searchParams.get('key');

        if (!key) {
            return new Response('Key is required', { status: 400 });
        }

        const env = (locals as any).runtime?.env || import.meta.env;
        const bucket = env.PAYMENTS_BUCKET;

        if (!bucket) {
            return new Response('Bucket not configured', { status: 500 });
        }

        const object = await bucket.get(key);

        if (object === null) {
            return new Response('Object Not Found', { status: 404 });
        }

        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set('etag', object.httpEtag);

        return new Response(object.body, {
            headers,
        });
    } catch (e) {
        return new Response('Server Error', { status: 500 });
    }
};
