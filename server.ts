import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, ChildProcess } from 'child_process';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const PYTHON_PORT = 5001;
const isProd = process.env.NODE_ENV === 'production';

let pythonProcess: ChildProcess | null = null;

function startPythonBackend(): Promise<void> {
  return new Promise((resolve) => {
    const pythonPath = process.platform === 'win32' ? 'python' : 'python3';
    const scriptPath = path.resolve(__dirname, 'server/main.py');

    console.log(`[Node] Spawning Python Backend service (${pythonPath} ${scriptPath} --port ${PYTHON_PORT})...`);
    
    pythonProcess = spawn(pythonPath, [scriptPath, '--port', String(PYTHON_PORT)], {
      stdio: 'inherit',
      env: {
        ...process.env,
      },
    });

    pythonProcess.on('error', (err) => {
      console.error('[Node] Failed to start Python backend:', err);
    });

    pythonProcess.on('exit', (code, signal) => {
      console.log(`[Node] Python backend process exited with code ${code}, signal ${signal}`);
    });

    // Wait 500ms for Python socket to bind
    setTimeout(() => {
      resolve();
    }, 500);
  });
}

// Proxy function to forward requests to Python Backend
function forwardToPython(req: Request, res: Response) {
  const options: http.RequestOptions = {
    hostname: '127.0.0.1',
    port: PYTHON_PORT,
    path: req.originalUrl,
    method: req.method,
    headers: {
      ...req.headers,
      host: `127.0.0.1:${PYTHON_PORT}`,
    },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error(`[Node Proxy Error] ${req.method} ${req.originalUrl}:`, err.message);
    if (!res.headersSent) {
      res.status(502).json({
        error: 'Python backend service unavailable',
        details: err.message,
      });
    }
  });

  req.pipe(proxyReq, { end: true });
}

async function startServer() {
  await startPythonBackend();

  const app = express();

  // Forward all /api routes to the Python backend
  app.use('/api', (req, res) => {
    forwardToPython(req, res);
  });

  if (!isProd) {
    // Mount Vite middlewares in development
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[Node] Vite dev middleware mounted');
  } else {
    // Serve production static build
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
    console.log(`[Node] Serving static files from ${distPath}`);
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Farmlink Full-Stack Platform running on http://0.0.0.0:${PORT}`);
    console.log(`🐍 Python Backend listening on http://127.0.0.1:${PYTHON_PORT} (proxied via /api/*)`);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('[Node] Shutting down server...');
    if (pythonProcess) {
      pythonProcess.kill('SIGTERM');
    }
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer().catch((err) => {
  console.error('[Node] Fatal server error:', err);
  process.exit(1);
});
