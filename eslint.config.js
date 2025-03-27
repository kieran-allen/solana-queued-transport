import eslintJs from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import parser from "@typescript-eslint/parser";
import perfectionist from "eslint-plugin-perfectionist";
import { defineConfig } from "eslint/config";

const commonRules = {
  "@stylistic/quotes": ["error", "double", { allowTemplateLiterals: true }],
  "@stylistic/object-curly-spacing": ["error", "always"],
  "@stylistic/semi": ["error", "always"],
};

export default defineConfig([
  {
    extends: [
      eslintJs.configs.recommended,
      stylistic.configs.recommended,
      perfectionist.configs["recommended-alphabetical"],
    ],
    files: ["src/**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      parser,
    },
    rules: {
      ...commonRules,
    },
  },
  {
    extends: [
      stylistic.configs.recommended,
    ],
    plugins: {
      "@perfectionist": perfectionist,
    },
    files: ["eslint.config.js", "vite.config.ts"],
    rules: {
      ...commonRules,
      "@perfectionist/sort-imports": ["error", {
        type: "alphabetical",
        order: "asc",
      }],
    },
  },
]);
