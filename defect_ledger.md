# Defect Ledger

1. **Defect ID**: DEF-001
   - **Origin**: Build failure (Vite/ESM)
   - **Source URL**: `vite.config.ts`
   - **Issue**: Vite configuration uses `__dirname` which is undefined in ES modules (`"type": "module"` in `package.json`).
   - **Vercel Relevance**: Critical blocker. Prevents production build (`npm run build`).
   - **Fix**: Replaced `__dirname` with `import.meta.dirname` in `vite.config.ts`.
   - **Acceptance Test**: `npm run build` succeeds without errors.
   - **Owner**: Jules
   - **State**: DONE_COMMITTED_LOCAL