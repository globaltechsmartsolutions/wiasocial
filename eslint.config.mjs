import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    // The current application deliberately loads authenticated client data in
    // effects. React's new rule treats these established fetch-on-mount flows
    // as synchronous derived-state effects, so keep the rule for a later data
    // architecture migration instead of forcing risky mechanical rewrites.
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "node_modules/**",
    "out/**",
    "coverage/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
