import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Server } from 'socket.io';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 3000);

const app = express();
const http = createServer(app);

// Online Room realtime layer — room management lands here next (see tech plan §3).
const io = new Server(http, {
  cors: { origin: true },
});

io.on('connection', (socket) => {
  socket.emit('server:hello', { version: '0.1.0' });
});

/** Used by the host's connectivity switch to probe whether an endpoint is reachable. */
app.get('/health', (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
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
