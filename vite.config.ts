/** Build/dev-server configuration; Vitest extends the same Vite config format. */
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
// The React plugin enables JSX transformation and development refresh.
// Restrict Vitest to *.test.ts so it does not try to execute Playwright's *.spec.ts suite.
export default defineConfig({ plugins: [react()], test: { include: ['tests/**/*.test.ts'] } });
