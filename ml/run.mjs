import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

process.chdir(fileURLToPath(new URL('../', import.meta.url)));
function run(command, args, cwd = '.') {
  const result = spawnSync(command, args, { stdio: 'inherit', cwd, env: {
    ...process.env, PYTHONUTF8: '1', OPENBLAS_NUM_THREADS: '1', OMP_NUM_THREADS: '1',
  } });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
const windows = process.platform === 'win32';
const python = windows ? 'ml/.venv/Scripts/python.exe' : 'ml/.venv/bin/python';
if (!existsSync(python)) run(windows ? 'py' : 'python3.11', [...(windows ? ['-3.11'] : []), '-m', 'venv', 'ml/.venv']);
run(python, ['-m', 'pip', '--disable-pip-version-check', 'install', '-r', 'ml/requirements.txt']);
run(process.execPath, ['--env-file=.env', 'export-ml.mjs'], 'server');
run(python, ['ml/train.py']);
run(python, ['ml/family_demo.py']);
