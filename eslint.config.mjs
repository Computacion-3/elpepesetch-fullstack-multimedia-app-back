// @ts-check
// @ts-ignore
import eslint from '@eslint/js';
// @ts-ignore
import { defineConfig } from "eslint/config";
// @ts-ignore
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
// @ts-ignore
import importPlugin from 'eslint-plugin-import';
// @ts-ignore
import globals from 'globals';
// @ts-ignore
import tseslint from 'typescript-eslint';

export default defineConfig([
    eslint.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    {
        plugins: {
            import: importPlugin,
        },
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.jest,
            },
            parserOptions: {
                projectService: true,
                // @ts-ignore
                tsconfigRootDir: import.meta.dirname,
            },
        },
        settings: {
            'import/resolver': {
                typescript: {
                    alwaysTryTypes: true,
                    project: './tsconfig.json',
                },
                node: true,
            },
        },
    },
    {
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-floating-promises': 'warn',
            '@typescript-eslint/no-unsafe-argument': 'warn',
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    vars: 'all',
                    args: 'all',
                    argsIgnorePattern: '^_',
                },
            ],
            'camelcase': 'off',
            'no-console': ['error', { allow: ['info', 'warn', 'error'] }],
            'import/order': [
                'error',
                {
                    groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
                    'newlines-between': 'always',
                },
            ],

            'prettier/prettier': [
                'error',
                {},
                {
                    usePrettierrc: true
                }
            ],
        },
    },
    eslintPluginPrettierRecommended,
    {
        ignores: ["dist/**", "build/**", "vite.config.ts", "eslint.config.mjs"],
    },
]);