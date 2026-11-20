import { realpathSync } from "node:fs";
import { defineConfig } from 'vitest/config';

process.chdir(realpathSync(process.cwd()));

export default defineConfig({
  test: { include: ['src/**/*.test.ts', 'tests/**/*.test.ts'] },
});
