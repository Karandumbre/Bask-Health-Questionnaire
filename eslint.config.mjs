import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
  {
    files: ["src/**/*.{ts,tsx}", "scripts/**/*.mjs", "*.config.{ts,mjs}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "MemberExpression[object.name='process'][property.name='env']",
          message:
            "Read environment settings through config/environment.mjs (server code: @/lib/config/environment).",
        },
        {
          selector:
            "CallExpression[callee.name='readEnvironment'] > Literal.arguments",
          message:
            "Use ENVIRONMENT_KEYS constants when reading environment settings.",
        },
      ],
    },
  },
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "dist/**",
      "coverage/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
