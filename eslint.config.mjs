import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "prisma/contract.d.ts",
    "prisma/migrations/**",
  ]),
  {
    // The React Compiler's immutability rule assumes hook results are
    // immutable state, which conflicts with @preact/signals-react's `.value`
    // mutation model — the project mandate is to prefer signals over
    // useState/useMemo, so this rule is disabled rather than fought line by
    // line.
    rules: {
      "react-hooks/immutability": "off",
    },
  },
]);

export default eslintConfig;
