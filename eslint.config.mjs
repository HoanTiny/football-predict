import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

// Flat config tối giản, ổn định với ESLint 9. Bắt lỗi thật, tránh báo giả trong
// codebase JS + JSX (no-undef tắt; jsx-uses-vars để hiểu component dùng trong JSX).
export default [
  { ignores: ["node_modules/**", ".next/**", "public/**", "next-env.d.ts"] },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx,mjs}"],
    plugins: { react, "react-hooks": reactHooks },
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node, ...globals.serviceworker },
    },
    rules: {
      "react/jsx-uses-vars": "error", // hiểu component dùng trong JSX
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-undef": "off", // không dùng TS — tránh báo giả với biến toàn cục/JSX
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
  {
    files: ["tests/**/*.js"],
    languageOptions: { globals: { ...globals.node } },
  },
];
