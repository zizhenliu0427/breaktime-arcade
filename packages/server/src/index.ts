import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '@arcade/shared';
import { attachHandlers } from './handlers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 3000);

const app = express();
const http = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(
  http,
  { cors: { origin: true } },
);

attachHandlers(io);

/** Used by the host's connectivity switch to probe whether an endpoint is reachable. */
app.get('/health', (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

/**
 * LAN addresses of this machine, so the Host Dashboard can build a join URL
 * and QR code that phones on the same Wi-Fi can reach (tech plan §6.2).
 */
app.get('/api/endpoints', (_req, res) => {
  const ips: string[] = [];
  for (const nets of Object.values(networkInterfaces())) {
    for (const net of nets ?? []) {
      if (net.family === 'IPv4' && !net.internal) ips.push(net.address);
    }
  }
  res.json({ port: PORT, ips });
});

// Serve the built client (single-origin deployment: LAN, tunnel and cloud alike).
const clientDist = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

http.listen(PORT, () => {
  console.log(`Breaktime Arcade server listening on http://localhost:${PORT}`);
});
