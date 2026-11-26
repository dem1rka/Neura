import { resolve } from 'node:path';
process.env.NEURA_DEMO_DIR ??= resolve(process.env.INIT_CWD || process.cwd(), '../server/materials/demo');
import { realpathSync } from "node:fs";
import { defineConfig } from 'vitest/config';

process.chdir(realpathSync(process.cwd()));

export default defineConfig({
  test: { include: ['src/**/*.test.ts', 'tests/**/*.test.ts'] },
});
