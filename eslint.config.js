import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // Fuera del linter del frontend gl-app:
  // - '**/dist': salidas de build (incluye demo/dist), nunca se lintan.
  // - 'demo': subproyecto con su propio package.json; se lintea desde su carpeta.
  // - 'diseno-olimpo' / 'diseno-hyperionx': mockups de diseño, no entran al build de Vite.
  // - 'web-gl': copia del sitio estático GL, ajena a esta app.
  globalIgnores(['**/dist', 'demo', 'diseno-olimpo', 'diseno-hyperionx', 'web-gl']),

  // Código fuente del frontend (navegador, ESM, JSX).
  {
    files: ['**/*.{js,jsx}'],
    ignores: ['functions/**'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },

  // Cloud Functions: runtime Node (CommonJS), sin globals de navegador.
  {
    files: ['functions/**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.node,
      sourceType: 'commonjs',
    },
  },
])
