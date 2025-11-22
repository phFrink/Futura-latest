import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    files: ["./src/components/features/login/index.js"],
    rules: {
      "react/no-unescaped-entities": "off", // ignore just here
      "react-hooks/exhaustive-deps"
    },
  },
  {
    files: ["./src/components/ui/avatar.js"],
    rules: {
      "@next/next/no-img-element": "off", // disable <img> rule
      "jsx-a11y/alt-text": "off", // disable alt text rule
    },
  },
  {
    files: ["./src/components/ui/user-table.js"],
    rules: {
      "@next/next/no-img-element": "off", // disable <img> rule
    },
  },
];

export default eslintConfig;
