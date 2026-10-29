import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { VitePWA } from 'vite-plugin-pwa';

const MANIFEST = {
  name: 'Baixômetro',
  short_name: 'Baixômetro',
  description: 'Gerenciador pessoal de preços de supermercado',
  theme_color: '#0f172a',
  background_color: '#0f172a',
  display: 'standalone' as const,
  start_url: '/',
  icons: [
    {
      src: '/pwa-192x192.png',
      sizes: '192x192',
      type: 'image/png',
    },
    {
      src: '/pwa-512x512.png',
      sizes: '512x512',
      type: 'image/png',
    },
  ],
};

interface RawSocketLike {
  remoteAddress?: string;
  remotePort?: number;
  localAddress?: string;
  localPort?: number;
  setTimeout: (...args: unknown[]) => unknown;
  setNoDelay: (...args: unknown[]) => unknown;
  setKeepAlive: (...args: unknown[]) => unknown;
  once: (event: string, listener: (buf: Uint8Array) => void) => void;
  on: (event: string, listener: (...args: unknown[]) => void) => void;
  write: (chunk: unknown, encoding: unknown, callback: unknown) => void;
  end: (callback: unknown) => void;
  destroy: (err?: unknown) => void;
  pause: () => void;
  resume: () => void;
  unshift: (buf: Uint8Array) => void;
}

interface HttpServerLike {
  listeners: (event: string) => Array<(socket: unknown) => void>;
  removeAllListeners: (event: string) => void;
  emit: (event: string, ...args: unknown[]) => boolean;
  on: (event: string, listener: (socket: RawSocketLike) => void) => void;
}

interface MiddlewareReq {
  url?: string;
}

interface MiddlewareRes {
  statusCode: number;
  setHeader: (name: string, value: string) => void;
  end: (body?: string) => void;
}

function dualHttpHttpsAndSwCleanupPlugin(): Plugin {
  return {
    name: 'baixometro-dual-http-https-and-sw-cleanup',
    async configureServer(server) {
      // 1. Permite conexões HTTP e HTTPS simultaneamente na mesma porta 5173
      const httpModName = 'node:http';
      const streamModName = 'node:stream';
      const httpMod = (await import(/* @vite-ignore */ httpModName)) as {
        default: {
          createServer: (
            handler: (req: unknown, res: unknown) => void
          ) => {
            on: (
              event: string,
              listener: (req: unknown, socket: unknown, head: unknown) => void
            ) => void;
            emit: (event: string, socket: unknown) => void;
          };
        };
      };
      const streamMod = (await import(/* @vite-ignore */ streamModName)) as {
        Duplex: new (opts: {
          read: () => void;
          write: (chunk: unknown, encoding: unknown, callback: unknown) => void;
          final: (callback: unknown) => void;
          destroy: (err: unknown, callback: (e: null) => void) => void;
        }) => {
          push: (chunk: unknown) => void;
          destroy: (err?: unknown) => void;
        };
      };

      const httpServer = server.httpServer as unknown as HttpServerLike | null;
      if (httpServer) {
        const tlsListeners = httpServer.listeners('connection');
        httpServer.removeAllListeners('connection');

        const plainHttp = httpMod.default.createServer((req: unknown, res: unknown) => {
          httpServer.emit('request', req, res);
        });
        plainHttp.on('upgrade', (req: unknown, socket: unknown, head: unknown) => {
          httpServer.emit('upgrade', req, socket, head);
        });

        httpServer.on('connection', (socket: RawSocketLike) => {
          socket.once('data', (buf: Uint8Array) => {
            if (buf[0] === 0x16) {
              const wrapper = new streamMod.Duplex({
                read() {},
                write(chunk: unknown, encoding: unknown, callback: unknown) {
                  socket.write(chunk, encoding, callback);
                },
                final(callback: unknown) {
                  socket.end(callback);
                },
                destroy(err: unknown, callback: (e: null) => void) {
                  socket.destroy(err ?? undefined);
                  callback(null);
                },
              });
              Object.assign(wrapper, {
                remoteAddress: socket.remoteAddress,
                remotePort: socket.remotePort,
                localAddress: socket.localAddress,
                localPort: socket.localPort,
                setTimeout: socket.setTimeout.bind(socket),
                setNoDelay: socket.setNoDelay.bind(socket),
                setKeepAlive: socket.setKeepAlive.bind(socket),
              });
              wrapper.push(buf);
              socket.on('data', (chunk: unknown) => wrapper.push(chunk));
              socket.on('end', () => wrapper.push(null));
              socket.on('error', (err: unknown) => wrapper.destroy(err));
              socket.on('close', () => wrapper.destroy());
              for (const fn of tlsListeners) {
                fn.call(httpServer, wrapper);
              }
            } else {
              socket.pause();
              socket.unshift(buf);
              plainHttp.emit('connection', socket);
              socket.resume();
            }
          });
        });
      }

      // 2. Desregistra automaticamente Service Workers antigos (workbox) que tenham ficado em cache no navegador
      server.middlewares.use((req, res, next) => {
        const mReq = req as unknown as MiddlewareReq;
        const mRes = res as unknown as MiddlewareRes;
        const url = mReq.url?.split('?')[0] ?? '';

        if (url === '/manifest.webmanifest') {
          mRes.statusCode = 200;
          mRes.setHeader('Content-Type', 'application/manifest+json');
          mRes.end(JSON.stringify(MANIFEST));
          return;
        }

        if (
          url === '/@vite-plugin-pwa/pwa-entry-point-loaded' ||
          url === '/registerSW.js'
        ) {
          mRes.statusCode = 200;
          mRes.setHeader('Content-Type', 'application/javascript');
          mRes.setHeader('Cache-Control', 'no-store');
          mRes.end(`
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.getRegistrations().then(async (regs) => {
                let unregistered = false;
                for (const r of regs) {
                  if (await r.unregister()) unregistered = true;
                }
                if ('caches' in window) {
                  const keys = await caches.keys();
                  await Promise.all(keys.map((k) => caches.delete(k)));
                }
                if (unregistered) window.location.reload();
              });
            }
          `);
          return;
        }

        if (url === '/dev-dist/sw.js' || url === '/sw.js' || url.startsWith('/workbox-')) {
          mRes.statusCode = 200;
          mRes.setHeader('Content-Type', 'application/javascript');
          mRes.setHeader('Cache-Control', 'no-store');
          mRes.end(`
            self.addEventListener('install', () => self.skipWaiting());
            self.addEventListener('activate', (event) => {
              event.waitUntil(
                caches.keys()
                  .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
                  .then(() => self.registration.unregister())
                  .then(() => self.clients.matchAll({ type: 'window' }))
                  .then((clients) => clients.forEach((c) => c.navigate(c.url)))
              );
            });
          `);
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [
      react(),
      basicSsl(),
      dualHttpHttpsAndSwCleanupPlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: false,
        },
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
        manifest: MANIFEST,
      }),
    ],
    server: {
      host: true,
      port: 5173,
      watch: {
        usePolling: true,
        interval: 300,
      },
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://localhost:3000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  };
});
