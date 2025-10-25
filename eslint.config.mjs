// eslint.config.mjs
import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettier from "eslint-plugin-prettier";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    files: ["**/*.ts"],
    ignores: ["dist", "node_modules"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
      },
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      prettier,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      "prettier/prettier": [
        "error",
        { tabWidth: 4, useTabs: false, singleQuote: false, semi: true, trailingComma: "es5" }
      ],
      "indent": ["error", 4, { "SwitchCase": 1 }],
      "@typescript-eslint/indent": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["off"],
    },
  },
];
