# INSTRUCTION SET 1: INTAKE & BOOTSTRAP VERIFICATION

**Objective:** Verify the extracted application state and ensure all dependencies are properly configured.

## Tasks

1. **Examine root directory structure**
   ```bash
   ls -la
   # Should see: DARCH-prima.zip, DARCH-prima_serialized*.txt, unpack_serialized.py
   ```

2. **Identify the application framework**
   - PR #1 indicates: **Vite + React + TypeScript + TailwindCSS**
   - Verify: `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`

3. **Install dependencies**
   ```bash
   npm install 2>&1 | tee .checkpoints/1_3_npm_install_log.txt
   ```
   Mark `[x]` in CHECKPOINTS.md line: `### 1.3 Dependencies Installed Successfully`

4. **Run build**
   ```bash
   npm run build 2>&1 | tee .checkpoints/1_4_build_log.txt
   ```
   Mark `[x]` in CHECKPOINTS.md line: `### 1.4 Build Succeeds`

5. **Document any blockers**
   - Create `.checkpoints/1_5_intake_report.md`
   - List any missing files, config issues, or deployment blockers
   - Mark `[x]` in CHECKPOINTS.md line: `### 1.5 Documentation & Missing Items Recorded`

6. **Finalize**
   ```bash
   git add CHECKPOINTS.md .checkpoints/
   git commit -m "checkpoint: complete instruction-set-1-intake [#1.6]"
   git push origin main
   ```
   Mark `[x]` in CHECKPOINTS.md line: `### 1.6 INSTRUCTION SET 1 COMPLETE`

---

## NEXT OWNER
**Jewels → Instruction Set 2 (Defect Detection & Repair)**

