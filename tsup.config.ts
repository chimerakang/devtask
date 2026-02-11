import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'bin/devtask': 'bin/devtask.ts',
    index: 'src/index.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  target: 'node18',
});
