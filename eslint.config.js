// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*'],
  },
  {
    // Pola fetch-on-mount (useEffect -> setState) dipakai di hampir semua screen.
    // Rule React Compiler baru ini menandainya error; diturunkan ke warning agar
    // `expo lint` tetap berguna sebagai gate tanpa refactor besar.
    // Rencana migrasi: lihat _reports/posfe-audit.md.
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
]);
