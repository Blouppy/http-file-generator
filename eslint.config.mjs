import tsEslint from "typescript-eslint";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import nextPlugin from "@next/eslint-plugin-next";
import prettierConfig from "eslint-config-prettier";

export default [
  ...tsEslint.configs.recommended,
  {
    plugins: {
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  nextPlugin.configs["core-web-vitals"],
  prettierConfig,
  {
    ignores: [".next/**", "node_modules/**", "coverage/**", "dist/**"],
  },
];
