import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function pythonBackendPlugin(): Plugin {
  let pythonProc: ChildProcess | null = null;

  return {
    name: 'vite-plugin-python-backend',
    configureServer(server) {
      const scriptPath = path.resolve(__dirname, 'server/main.py');
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
      console.log(`[Vite] Spawning Python Backend: ${pythonCmd} ${scriptPath} --port 5001`);
      
      try {
        pythonProc = spawn(pythonCmd, [scriptPath, '--port', '5001'], {
          stdio: 'inherit',
        });

        pythonProc.on('error', (err) => {
          console.error('[Vite] Python backend failed to spawn:', err);
        });

        const cleanup = () => {
          if (pythonProc && !pythonProc.killed) {
            console.log('[Vite] Stopping Python backend process...');
            pythonProc.kill('SIGTERM');
          }
        };

        process.on('exit', cleanup);
        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);
        server.httpServer?.on('close', cleanup);
      } catch (err) {
        console.error('[Vite] Error launching Python backend:', err);
      }
    },
  };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: 'http://127.0.0.1:5001',
            changeOrigin: true,
          },
        },
      },
      plugins: [react(), pythonBackendPlugin()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
