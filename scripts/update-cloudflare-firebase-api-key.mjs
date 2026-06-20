#!/usr/bin/env node
/**
 * Update VITE_FIREBASE_API_KEY on Cloudflare Pages (production + preview) and retry latest production deployment.
 *
 * Required env:
 *   CLOUDFLARE_ACCOUNT_ID
 *   CLOUDFLARE_API_TOKEN  (Account → Cloudflare Pages → Edit)
 *
 * Optional:
 *   CLOUDFLARE_PAGES_PROJECT=usdfg-app
 *   VITE_FIREBASE_API_KEY=...  (defaults to official USDFG WEB key)
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

async function main() {
  const accountId = requireEnv('CLOUDFLARE_ACCOUNT_ID');
  const token = requireEnv('CLOUDFLARE_API_TOKEN');
  const project = loadPagesProject();

  console.log(`Project: ${project}`);
  console.log(`New apiKey suffix: …${NEW_KEY.slice(-4)}`);

  const detail = await cf(
    accountId,
    token,
    `/accounts/${accountId}/pages/projects/${project}`
  );

  const prodEnv = detail.deployment_configs?.production?.env_vars ?? {};
  const previewEnv = detail.deployment_configs?.preview?.env_vars ?? {};

  const prodCurrent = prodEnv.VITE_FIREBASE_API_KEY?.value;
  const previewCurrent = previewEnv.VITE_FIREBASE_API_KEY?.value;
  console.log('Current production key suffix:', prodCurrent ? `…${prodCurrent.slice(-4)}` : '(unset)');
  console.log('Current preview key suffix:', previewCurrent ? `…${previewCurrent.slice(-4)}` : '(unset)');

  if (prodCurrent === NEW_KEY && previewCurrent === NEW_KEY) {
    console.log('Cloudflare env already on target key.');
  } else {
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
  }

  const deployments = await cf(
    accountId,
    token,
    `/accounts/${accountId}/pages/projects/${project}/deployments?env=production&per_page=1`
  );
  const latest = deployments?.[0];
  if (!latest?.id) {
    console.warn('No production deployment found to retry.');
    return;
  }

  const retried = await cf(
    accountId,
    token,
    `/accounts/${accountId}/pages/projects/${project}/deployments/${latest.id}/retry`,
    { method: 'POST', body: '{}' }
  );
  console.log('Retried deployment:', retried.id, retried.url ?? '');
  console.log('Verify after success: bundle must contain …ermI not …XV1jQ');
  if (OLD_KEY) {
    console.log(`Old key to absent: …${OLD_KEY.slice(-4)}`);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
