import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        include:  ['src/**/*.test.ts'],   // solo fuentes TypeScript, ignora dist/
        exclude:  ['dist/**', 'node_modules/**'],
        setupFiles: ['./src/__tests__/setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            include: ['src/**/*.ts'],
            exclude: [
                'src/__tests__/**',
                'src/index.ts',
                'src/app.ts',
            ],
            thresholds: {
                lines:      60,
                functions:  60,
                branches:   55,
                statements: 60,
            },
        },
    },
});
