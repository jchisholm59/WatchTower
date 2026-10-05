import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      // Vite's DNS-rebinding protection rejects any Host header it doesn't
      // recognize. Access via a raw IP/localhost is always allowed, but a
      // named host (like this Tailscale Serve hostname) needs to be listed
      // explicitly. Scoped to the tailnet's own domain, not wide open.
      allowedHosts: ['.taild858f.ts.net'],
    },
  };
});
