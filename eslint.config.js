import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/node_modules/**", "apps/mobile/android/**"] },
  ...tseslint.configs.recommended,
);
