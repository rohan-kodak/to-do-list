import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// Explicit root and allow-list avoid Vite resolving the project through a
// different Windows profile path and rejecting index.html with 403.
const clientRoot = fs.realpathSync(fileURLToPath(new URL('.', import.meta.url)));
const projectRoot = fs.realpathSync(fileURLToPath(new URL('../', import.meta.url)));

export default defineConfig({
  root: clientRoot,
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: true,
    fs: { allow: [clientRoot, projectRoot] }
  }
});
