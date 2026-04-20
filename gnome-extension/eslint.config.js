import js from '@eslint/js';
import globals from 'globals';

export default [
    {
        ignores: [
            'node_modules/**',
            'scripts/**',
            'tab-in-workspace-service.js',
            'xdg-browser-proxy.js',
            '*.zip',
        ],
    },
    js.configs.recommended,
    {
        files: ['extension.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                global: 'readonly',
                log: 'readonly',
                logError: 'readonly',
                _: 'readonly',
            },
        },
        rules: {
            'no-unused-vars': ['warn', {argsIgnorePattern: '^_'}],
            'no-undef': 'error',
        },
    },
];
