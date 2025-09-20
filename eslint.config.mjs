import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: ["tmp/"]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended
];
