import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import * as cp from 'child_process';
import * as rpc from 'vscode-ws-jsonrpc';
import * as server from 'vscode-ws-jsonrpc/server';

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  const httpServer = createServer(app);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Set up WebSocket server for LSP
  const wss = new WebSocketServer({
    server: httpServer,
    path: '/rust-analyzer'
  });

  wss.on('connection', (webSocket) => {
    console.log('Client connected to rust-analyzer WebSocket proxy.');
    
    // Spawn rust-analyzer
    let rustAnalyzer: cp.ChildProcessWithoutNullStreams;
    try {
      rustAnalyzer = cp.spawn('rust-analyzer');
    } catch (err) {
      console.error('Failed to spawn rust-analyzer:', err);
      // Fallback or just ignore if it doesn't exist, we just implement the config
      return;
    }
    
    // Create the message connection
    const socket: rpc.IWebSocket = {
      send: content => webSocket.send(content, error => {
        if (error) throw error;
      }),
      onMessage: cb => webSocket.on('message', data => cb(data.toString())),
      onError: cb => webSocket.on('error', cb),
      onClose: cb => webSocket.on('close', cb),
      dispose: () => webSocket.close()
    };

    const reader = new rpc.WebSocketMessageReader(socket);
    const writer = new rpc.WebSocketMessageWriter(socket);
    
    const socketConnection = server.createConnection(reader, writer, () => webSocket.close());
    const serverConnection = server.createProcessStreamConnection(rustAnalyzer);
    
    if (socketConnection && serverConnection) {
      server.forward(socketConnection, serverConnection, message => {
        // Intercept messages if necessary
        return message;
      });
    }

    rustAnalyzer.on('exit', () => {
      console.log('rust-analyzer process exited');
      if (socketConnection) {
        socketConnection.dispose();
      }
    });
  });

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
