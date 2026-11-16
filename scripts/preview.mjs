import { createServer, request } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const root = resolve('dist');
const port = Number(process.env.PORT) || 4200;
/** /api/* is forwarded to the Express API so the session cookie stays same-origin (also through ngrok). */
const api = new URL(process.env.API_URL || 'http://127.0.0.1:3401');
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.webmanifest':'application/manifest+json', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp', '.woff2':'font/woff2' };

function proxy(req, res) {
  const forwardedFor = [req.headers['x-forwarded-for'], req.socket.remoteAddress].filter(Boolean).join(', ');
  const upstream = request({
    host: api.hostname, port: api.port, method: req.method, path: req.url,
    headers: { ...req.headers, host: api.host, 'x-forwarded-for': forwardedFor },
  }, (response) => { res.writeHead(response.statusCode ?? 502, response.headers); response.pipe(res); });
  upstream.on('error', () => {
    if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'El servidor de datos no está disponible. Tus datos siguen en este dispositivo.' }));
  });
  req.pipe(upstream);
}

const server = createServer(async (req,res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname === '/api' || pathname.startsWith('/api/')) { proxy(req, res); return; }
    let file = resolve(root, '.' + pathname);
    if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    try { if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html'); }
    catch { if (extname(file)) { res.writeHead(404).end('Not found'); return; } file = resolve(root, 'index.html'); }
    const body = await readFile(file);
    res.writeHead(200, {'Content-Type':types[extname(file)] || 'application/octet-stream', 'Cache-Control':'no-cache'}).end(body);
  } catch { res.writeHead(500).end('Preview error'); }
});
server.listen(port, '127.0.0.1', () => console.log(`FitApp: http://localhost:${port} (API: ${api.origin})`));
