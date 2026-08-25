#!/usr/bin/env node
/**
 * Strip onnxruntime-node binaries for platforms we never deploy to.
 *
 * The package ships prebuilt native libraries for every supported target:
 * darwin/arm64, linux/arm64, linux/x64, win32/arm64 and win32/x64 — the
 * Windows ones including DirectML and the DirectX shader compiler. Together
 * that is ~259 MB, which pushed the Vercel function to 293 MB against a
 * 250 MB uncompressed limit and failed the deploy.
 *
 * Vercel's Node runtime is linux/x64. Everything else is dead weight, and
 * Vercel's file tracing keeps it because the platform directory is chosen
 * at runtime rather than by a static import it can follow.
 *
 * Deleting the unused targets takes the package from ~259 MB to ~37 MB.
 *
 * Runs from the Vercel build command. Locally it is a no-op unless you pass
 * --force, so a developer on macOS or Windows does not break their own
 * install by running the build.
 *
 *   node scripts/prune-onnx.mjs            # prune only on a build platform
 *   node scripts/prune-onnx.mjs --force    # prune here too
 *   node scripts/prune-onnx.mjs --dry-run  # report, change nothing
 */

import fs from 'node:fs/promises';
import path from 'node:path';

/** Target that must survive: what Vercel's Node runtime actually loads. */
const KEEP = { platform: 'linux', arch: 'x64' };

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const force = args.has('--force');

// CI/Vercel set these; absent means a developer machine.
const onBuilder = Boolean(process.env.VERCEL || process.env.CI);

const ROOTS = [
  'node_modules/onnxruntime-node',
  'backend/node_modules/onnxruntime-node',
];

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function dirSizeMb(dir) {
  let total = 0;
  const walk = async (d) => {
    let entries;
    try { entries = await fs.readdir(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) await walk(full);
      else {
        try { total += (await fs.stat(full)).size; } catch { /* vanished */ }
      }
    }
  };
  await walk(dir);
  return total / 1024 / 1024;
}

async function pruneRoot(root) {
  const binDir = path.join(root, 'bin');
  if (!(await exists(binDir))) return null;

  const before = await dirSizeMb(binDir);
  const removed = [];

  // bin/napi-vN/<platform>/<arch>/
  for (const napi of await fs.readdir(binDir, { withFileTypes: true })) {
    if (!napi.isDirectory()) continue;
    const napiDir = path.join(binDir, napi.name);

    for (const plat of await fs.readdir(napiDir, { withFileTypes: true })) {
      if (!plat.isDirectory()) continue;
      const platDir = path.join(napiDir, plat.name);

      if (plat.name !== KEEP.platform) {
        removed.push(path.relative(root, platDir));
        if (!dryRun) await fs.rm(platDir, { recursive: true, force: true });
        continue;
      }

      // Right platform — drop the wrong architectures.
      for (const arch of await fs.readdir(platDir, { withFileTypes: true })) {
        if (!arch.isDirectory() || arch.name === KEEP.arch) continue;
        const archDir = path.join(platDir, arch.name);
        removed.push(path.relative(root, archDir));
        if (!dryRun) await fs.rm(archDir, { recursive: true, force: true });
      }
    }
  }

  const after = dryRun ? before : await dirSizeMb(binDir);
  return { root, before, after, removed };
}

async function main() {
  if (!onBuilder && !force && !dryRun) {
    console.log('[prune-onnx] not a build environment; skipping (use --force to prune anyway)');
    return;
  }

  let touched = false;
  for (const root of ROOTS) {
    if (!(await exists(root))) continue;
    const result = await pruneRoot(root);
    if (!result) continue;
    touched = true;

    console.log(`[prune-onnx] ${result.root}`);
    for (const r of result.removed) console.log(`    ${dryRun ? 'would remove' : 'removed'} ${r}`);
    console.log(
      `    ${result.before.toFixed(1)} MB -> ${result.after.toFixed(1)} MB `
      + `(saved ${(result.before - result.after).toFixed(1)} MB)`,
    );
  }

  if (!touched) console.log('[prune-onnx] onnxruntime-node not installed; nothing to do');
}

main().catch((err) => {
  // Never fail the build over this: an oversized function is a clearer
  // failure than a build that died in a cleanup step.
  console.warn('[prune-onnx] skipped:', err.message);
});
