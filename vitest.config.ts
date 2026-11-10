import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
	resolve: {
		alias: [{ find: /^#lib\/(.*)$/, replacement: path.resolve('src/lib') + '/$1' }]
	},
	test: { include: ['src/**/*.test.ts'], testTimeout: 20000 }
});
