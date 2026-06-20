#!/usr/bin/env node
/**
 * Cloudflare Pages VITE_FIREBASE_API_KEY migration helper.
 *
 * Usage:
 *   node scripts/update-cloudflare-firebase-api-key.mjs verify
 *   node scripts/update-cloudflare-firebase-api-key.mjs apply
 *   node scripts/update-cloudflare-firebase-api-key.mjs deploy
 *   node scripts/update-cloudflare-firebase-api-key.mjs verify-bundle
 *
 * Required env (verify / apply / deploy):
 *   CLOUDFLARE_ACCOUNT_ID
 *   CLOUDFLARE_API_TOKEN  (Account → Cloudflare Pages → Edit)
 *
 * Optional:
 *   CLOUDFLARE_PAGES_PROJECT=usdfg-app
 *   VITE_FIREBASE_API_KEY=...  (defaults to official USDFG WEB key)
 *   CLOUDFLARE_PAGES_BRANCH=main
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const API_BASE = 'https://api.cloudflare.com/client/v4';

const NEW_KEY =
  process.env.VITE_FIREBASE_API_KEY?.trim() ||
  'AIzaSyCEhpHIV_q4twtfTtth4wW0nBMIvc8ermI';
const OLD_KEY = 'AIzaSyClcbAtpLvCDBnPkDr7N057wkj2MrXV1jQ';
const PROD_ORIGIN = 'https://usdfg.pro';

function loadPagesProject() {
  try {
    const raw = JSON.parse(
      readFileSync(join(ROOT, 'cloudflare/access.config.json'), 'utf8')
    );
    return process.env.CLOUDFLARE_PAGES_PROJECT?.trim() || raw.pagesProjectSlug;
  } catch {
    return process.env.CLOUDFLARE_PAGES_PROJECT?.trim() || 'usdfg-app';
  }
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Missing ${name}`);
    process.exit(1);
  }
  return value;
}

function maskKey(key) {
  if (!key) return '(unset)';
  if (key.length < 12) return key;
  return `${key.slice(0, 8)}…${key.slice(-4)}`;
}

async function cf(accountId, token, path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) {
    const msg = body.errors?.map((e) => e.message).join('; ') || res.statusText;
    throw new Error(`${options.method || 'GET'} ${path}: ${msg}`);
  }
  return body.result;
}

function mergeEnvVars(existing, key, value) {
  const next = { ...(existing ?? {}) };
  next[key] = { value, type: 'plain_text' };
  return next;
}

async function getProject(accountId, token, project) {
  return cf(accountId, token, `/accounts/${accountId}/pages/projects/${project}`);
}

function reportEnvVars(detail) {
  const prodEnv = detail.deployment_configs?.production?.env_vars ?? {};
  const previewEnv = detail.deployment_configs?.preview?.env_vars ?? {};
  const prodCurrent = prodEnv.VITE_FIREBASE_API_KEY?.value;
  const previewCurrent = previewEnv.VITE_FIREBASE_API_KEY?.value;

  console.log('Project:', detail.name);
  console.log('Production  VITE_FIREBASE_API_KEY:', maskKey(prodCurrent));
  console.log('Preview     VITE_FIREBASE_API_KEY:', maskKey(previewCurrent));

  const prodOk = prodCurrent === NEW_KEY;
  const previewOk = previewCurrent === NEW_KEY;
  console.log('Production  matches target (…ermI):', prodOk ? 'YES' : 'NO');
  console.log('Preview     matches target (…ermI):', previewOk ? 'YES' : 'NO');

  if (prodCurrent === OLD_KEY) console.log('  ⚠ Production still has legacy key …XV1jQ');
  if (previewCurrent === OLD_KEY) console.log('  ⚠ Preview still has legacy key …XV1jQ');

  return { prodCurrent, previewCurrent, prodOk, previewOk };
}

async function cmdVerify(accountId, token, project) {
  const detail = await getProject(accountId, token, project);
  reportEnvVars(detail);
}

async function cmdApply(accountId, token, project) {
  console.log(`Target apiKey: ${maskKey(NEW_KEY)}`);
  const detail = await getProject(accountId, token, project);
  const { prodOk, previewOk, prodCurrent, previewCurrent } = reportEnvVars(detail);

  if (prodOk && previewOk) {
    console.log('Cloudflare env already on target key.');
    return detail;
  }

  const prodEnv = detail.deployment_configs?.production?.env_vars ?? {};
  const previewEnv = detail.deployment_configs?.preview?.env_vars ?? {};

  await cf(accountId, token, `/accounts/${accountId}/pages/projects/${project}`, {
    method: 'PATCH',
    body: JSON.stringify({
      deployment_configs: {
        production: {
          env_vars: mergeEnvVars(prodEnv, 'VITE_FIREBASE_API_KEY', NEW_KEY),
        },
        preview: {
          env_vars: mergeEnvVars(previewEnv, 'VITE_FIREBASE_API_KEY', NEW_KEY),
        },
      },
    }),
  });

  console.log('Updated VITE_FIREBASE_API_KEY for production + preview.');
  if (prodCurrent === OLD_KEY || previewCurrent === OLD_KEY) {
    console.log('Replaced legacy …XV1jQ with official …ermI.');
  }
  return getProject(accountId, token, project);
}

async function cmdDeploy(accountId, token, project) {
  const branch = process.env.CLOUDFLARE_PAGES_BRANCH?.trim() || 'main';
  console.log(`Creating fresh production deployment from branch: ${branch}`);

  const created = await cf(
    accountId,
    token,
    `/accounts/${accountId}/pages/projects/${project}/deployments`,
    {
      method: 'POST',
      body: JSON.stringify({ branch }),
    }
  );

  console.log('Deployment id:', created.id);
  console.log('URL:', created.url ?? '(pending)');
  console.log('Wait for build success, then run: node scripts/update-cloudflare-firebase-api-key.mjs verify-bundle');
}

async function cmdVerifyBundle() {
  const html = await fetch(`${PROD_ORIGIN}/app/`).then((r) => r.text());
  const match = html.match(/\/assets\/index-[^"]+\.js/);
  if (!match) {
    console.error('Could not find index bundle in', PROD_ORIGIN);
    process.exit(1);
  }
  const jsPath = match[0];
  const js = await fetch(`${PROD_ORIGIN}${jsPath}`).then((r) => r.text());
  const keys = [...js.matchAll(/AIzaSy[A-Za-z0-9_-]{33}/g)].map((m) => m[0]);
  const unique = [...new Set(keys)];

  console.log('Bundle:', jsPath);
  console.log('Keys found:', unique.map(maskKey).join(', ') || '(none)');

  const hasNew = unique.includes(NEW_KEY);
  const hasOld = unique.includes(OLD_KEY);

  if (hasNew && !hasOld) {
    console.log('PASS: production bundle uses official USDFG WEB key only.');
    process.exit(0);
  }
  if (hasOld) {
    console.error('FAIL: production bundle still contains legacy …XV1jQ key.');
    console.error('Cloudflare Pages env was not updated before this build, or deploy is stale.');
    process.exit(1);
  }
  console.error('FAIL: expected …ermI not found in bundle.');
  process.exit(1);
}

async function main() {
  const cmd = process.argv[2] || 'apply';

  if (cmd === 'verify-bundle') {
    await cmdVerifyBundle();
    return;
  }

  const accountId = requireEnv('CLOUDFLARE_ACCOUNT_ID');
  const token = requireEnv('CLOUDFLARE_API_TOKEN');
  const project = loadPagesProject();

  switch (cmd) {
    case 'verify':
      await cmdVerify(accountId, token, project);
      break;
    case 'apply':
      await cmdApply(accountId, token, project);
      console.log('\nNext: node scripts/update-cloudflare-firebase-api-key.mjs deploy');
      break;
    case 'deploy':
      await cmdDeploy(accountId, token, project);
      break;
    default:
      console.error(`Unknown command: ${cmd}`);
      console.error('Usage: verify | apply | deploy | verify-bundle');
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
