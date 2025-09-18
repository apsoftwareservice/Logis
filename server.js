const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const express = require('express');
const fs = require('fs');
const { WebSocketServer } = require('ws');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const httpsOptions = {
    key: fs.readFileSync('/Users/alexpinhasov/Documents/localSSL/localhost-key.pem'),
    cert: fs.readFileSync('/Users/alexpinhasov/Documents/localSSL/localhost.pem'),
};

app.prepare().then(() => {
    const expressApp = express();

    expressApp.all('/*path', (req, res) => {
        const parsedUrl = parse(req.url, true);
        return handle(req, res, parsedUrl);
    });
    const server = createServer(httpsOptions, expressApp);

    // Attach a WebSocket server that will handle upgrades for /api/ingest
    const wss = new WebSocketServer({ noServer: true });

    wss.on('connection', (ws) => {
      // Simple heartbeat to keep connection alive in dev
      const ping = setInterval(() => {
        try { ws.ping(); } catch {}
      }, 30000);

      ws.on('close', () => {
        clearInterval(ping);
      });
    });

    server.on('upgrade', (req, socket, head) => {
      const { pathname } = parse(req.url, true);
      // Only upgrade the /api/ingest endpoint to WebSocket; everything else is normal HTTPS
      if (pathname === '/api/ingest') {
        wss.handleUpgrade(req, socket, head, (ws) => {
          wss.emit('connection', ws, req);
        });
      } else {
        socket.destroy();
      }
    });

    server.listen(3001, err => {
      if (err) throw err;
      console.log('> Ready on https://localhost:3001');
    });
});