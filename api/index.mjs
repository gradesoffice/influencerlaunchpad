// Vercel serverless function - catches all /api/* and SSR requests
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default async function handler(req, res) {
  try {
    const serverPath = join(__dirname, '..', 'dist', 'server', 'server.js');
    const server = await import(serverPath);
    const serverEntry = server.default ?? server;

    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const url = new URL(req.url, `${protocol}://${host}`);

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value) headers.set(key, Array.isArray(value) ? value.join(', ') : String(value));
    }

    // Read body for non-GET requests
    let body = undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const chunks = [];
      for await (const chunk of req) { chunks.push(chunk); }
      body = Buffer.concat(chunks);
    }

    const webRequest = new Request(url.toString(), {
      method: req.method,
      headers,
      body,
    });

    const response = await serverEntry.fetch(webRequest, process.env, {});

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    const responseBody = await response.arrayBuffer();
    res.end(Buffer.from(responseBody));
  } catch (e) {
    console.error('[ssr]', e);
    res.status(500).send('Internal Server Error');
  }
}
