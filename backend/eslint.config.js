const js = require("@eslint/js");
const globals = require("globals");

/**
 * Lint config for the backend.
 *
 * The root eslint.config.js deliberately ignores this folder (see the comment on its
 * globalIgnores line): that config targets browser ESM, and pointing it at CommonJS on
 * Node produced ~60 false `no-undef` errors for `require`, `module` and `process`.
 * Rather than loosen the frontend's config, the backend gets its own.
 *
 * ⚠️ This file is CommonJS on purpose. backend/package.json has no `"type": "module"`,
 * so a `.js` config here is parsed as CJS and `export default` would be a syntax error.
 *
 * ⚠️ There are TWO module systems in this folder and they need different settings:
 *   - `server.js` + `src/**`   -> CommonJS (`require` / `module.exports`)
 *   - `test/**` + this config's sibling `vitest.config.mjs` -> ESM (`import`)
 * A single block would mark one half's syntax as an error.
 *
 * ⚠️ No eslint packages are added to backend/package.json. `@eslint/js` and `globals`
 * resolve upward to the repo root's node_modules, so this costs hiếu nothing at
 * `npm install` time. Run it from the root: `npm run lint:backend`.
 *
 * ⚠️ `no-unused-vars` is a WARNING, not an error, and that is deliberate. A new gate
 * that goes red over code the team already shipped teaches everyone to ignore it. Turn
 * it up once the existing warnings are cleared, not before.
 */
module.exports = [
    {
        ignores: ["node_modules/**", "coverage/**"],
    },

    // Runtime: CommonJS on Node.
    {
        files: ["server.js", "src/**/*.js"],
        languageOptions: {
            ecmaVersion: 2024,
            sourceType: "commonjs",
            globals: { ...globals.node },
        },
        rules: {
            ...js.configs.recommended.rules,
            "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
        },
    },

    // Tests and the Vitest config: ESM. `describe`/`it`/`expect` are imported explicitly
    // (vitest.config.mjs does not set `globals: true`), so no test globals are declared
    // here on purpose - if someone starts relying on the implicit ones, this config
    // should fail rather than quietly bless them.
    {
        files: ["test/**/*.js", "vitest.config.mjs"],
        languageOptions: {
            ecmaVersion: 2024,
            sourceType: "module",
            globals: { ...globals.node },
        },
        rules: {
            ...js.configs.recommended.rules,
            "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
        },
    },
];
