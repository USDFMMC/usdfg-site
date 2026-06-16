#!/usr/bin/env node
/**
 * Provision Cloudflare Access applications for USDFG arena routes.
 * Edge-only protection — no application password UI.
 *
 * Required env:
 *   CLOUDFLARE_ACCOUNT_ID
 *   CLOUDFLARE_API_TOKEN  (Zero Trust:Edit, Account:Read)
 *
 * Optional:
 *   CLOUDFLARE_PAGES_PROJECT=usdfg
 *   CLOUDFLARE_ACCESS_ALLOWED_EMAILS=comma,separated@list
 *   CLOUDFLARE_ACCESS_ALLOWED_EMAIL_DOMAINS=example.com
 *
 * Usage:
 *   node scripts/setup-cloudflare-access.mjs apply
 *   node scripts/setup-cloudflare-access.mjs verify
 *   node scripts/setup-cloudflare-access.mjs status
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CONFIG_PATH = join(ROOT, 'cloudflare/access.config.json');

const API_BASE = 'https://api.cloudflare.com/client/v4';

function loadConfig() {
  const raw = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  const pagesProject = process.env.CLOUDFLARE_PAGES_PROJECT ?? raw.pagesProjectSlug;
  const expand = (s) => s.replaceAll('{{PAGES_PROJECT}}', pagesProject);

  const allowedEmails =
    process.env.CLOUDFLARE_ACCESS_ALLOWED_EMAILS?.split(',')
      .map((e) => e.trim())
      .filter(Boolean) ?? raw.allowedEmails;

  const allowedEmailDomains =
    process.env.CLOUDFLARE_ACCESS_ALLOWED_EMAIL_DOMAINS?.split(',')
      .map((d) => d.trim())
      .filter(Boolean) ?? raw.allowedEmailDomains;

  return {
    ...raw,
    pagesProjectSlug: pagesProject,
    allowedEmails,
    allowedEmailDomains,
    applications: raw.applications.map((app) => ({
      ...app,
      destinations: app.destinations.map((d) => ({
        ...d,
        uri: expand(d.uri),
      })),
    })),
  };
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Missing ${name}. Create a Cloudflare API token with Zero Trust:Edit.`);
    process.exit(1);
  }
  return value;
}

async function cfFetch(accountId, token, path, options = {}) {
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
    throw new Error(`${options.method ?? 'GET'} ${path} failed: ${msg}`);
  }
  return body;
}

function buildPolicyInclude(config) {
  const include = [];

  for (const email of config.allowedEmails) {
    include.push({ email: { email } });
  }
  for (const domain of config.allowedEmailDomains) {
    include.push({ email_domain: { domain } });
  }

  if (include.length === 0) {
    include.push({ everyone: {} });
  }

  return include;
}

function buildAppPayload(config, app) {
  const primaryUri = app.destinations[0]?.uri ?? config.productionDomain;
  return {
    name: app.name,
    type: 'self_hosted',
    domain: primaryUri,
    session_duration: config.sessionDuration,
    app_launcher_visible: config.appLauncherVisible,
    destinations: app.destinations,
    policies: [
      {
        name: config.policyName,
        decision: 'allow',
        include: buildPolicyInclude(config),
      },
    ],
  };
}

async function listApps(accountId, token) {
  const body = await cfFetch(accountId, token, `/accounts/${accountId}/access/apps?per_page=100`);
  return body.result ?? [];
}

async function applyConfig(config) {
  const accountId = requireEnv('CLOUDFLARE_ACCOUNT_ID');
  const token = requireEnv('CLOUDFLARE_API_TOKEN');

  const existing = await listApps(accountId, token);
  const byName = new Map(existing.map((a) => [a.name, a]));

  console.log('Applying Cloudflare Access applications...\n');

  for (const app of config.applications) {
    const payload = buildAppPayload(config, app);
    const current = byName.get(app.name);

    if (current) {
      await cfFetch(accountId, token, `/accounts/${accountId}/access/apps/${current.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      console.log(`Updated: ${app.name}`);
    } else {
      await cfFetch(accountId, token, `/accounts/${accountId}/access/apps`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      console.log(`Created: ${app.name}`);
    }

    for (const dest of app.destinations) {
      console.log(`  → ${dest.uri}`);
    }
  }

  console.log('\nAccess applications applied.');
  console.log('Enable One-time PIN in Zero Trust → Settings → Authentication if not already on.');
  console.log('Run: npm run access:verify');
}

async function printStatus(config) {
  const accountId = requireEnv('CLOUDFLARE_ACCOUNT_ID');
  const token = requireEnv('CLOUDFLARE_API_TOKEN');
  const apps = await listApps(accountId, token);
  const names = new Set(config.applications.map((a) => a.name));

  console.log('Cloudflare Access applications:\n');
  for (const app of apps.filter((a) => names.has(a.name))) {
    console.log(`• ${app.name} (${app.id})`);
    const dests = app.destinations?.length
      ? app.destinations.map((d) => d.uri).join(', ')
      : app.domain;
    console.log(`  destinations: ${dests}`);
  }
}

async function verifyAccess(config) {
  const origin = `https://${config.productionDomain}`;
  const checks = [
    { label: 'Landing /', url: `${origin}/`, expectPublic: true },
    { label: 'Whitepaper', url: `${origin}/whitepaper`, expectPublic: true },
    { label: 'Privacy', url: `${origin}/privacy`, expectPublic: true },
    { label: 'Terms', url: `${origin}/terms`, expectPublic: true },
    { label: 'Cookie policy', url: `${origin}/cookie-policy`, expectPublic: true },
    { label: 'Arena /app', url: `${origin}/app`, expectPublic: false },
    { label: 'Arena deep path', url: `${origin}/app/challenge/new`, expectPublic: false },
    {
      label: 'Challenge query',
      url: `${origin}/app?challenge=test-challenge-id`,
      expectPublic: false,
    },
  ];

  console.log('Verifying HTTP responses (no session cookie):\n');

  let pass = 0;
  let fail = 0;

  for (const check of checks) {
    const res = await fetch(check.url, { method: 'HEAD', redirect: 'manual' });
    const location = res.headers.get('location') ?? '';
    const accessRedirect =
      res.status >= 300 && res.status < 400 && /cloudflareaccess\.com|access\./i.test(location);
    const isProtected = accessRedirect || res.status === 401 || res.status === 403;
    const isPublic = res.status >= 200 && res.status < 400 && !accessRedirect;

    const ok = check.expectPublic ? isPublic : isProtected;
    const status = ok ? 'PASS' : 'FAIL';
    if (ok) pass += 1;
    else fail += 1;

    console.log(
      `[${status}] ${check.label}: HTTP ${res.status}${location ? ` → ${location.slice(0, 80)}` : ''}`,
    );
  }

  const previewHost = `${config.pagesProjectSlug}.pages.dev`;
  try {
    const previewRes = await fetch(`https://${previewHost}/app`, {
      method: 'HEAD',
      redirect: 'manual',
    });
    const loc = previewRes.headers.get('location') ?? '';
    const previewProtected =
      (previewRes.status >= 300 &&
        previewRes.status < 400 &&
        /cloudflareaccess\.com|access\./i.test(loc)) ||
      previewRes.status === 401 ||
      previewRes.status === 403;
    const previewOk = previewProtected;
    if (previewOk) pass += 1;
    else fail += 1;
    console.log(
      `[${previewOk ? 'PASS' : 'FAIL'}] Preview ${previewHost}/app: HTTP ${previewRes.status}`,
    );
  } catch (err) {
    fail += 1;
    console.log(`[FAIL] Preview ${previewHost}/app: ${err.message}`);
  }

  console.log(`\n${pass} passed, ${fail} failed.`);

  if (fail > 0) {
    console.log('\nIf arena routes still return 200, run: npm run access:apply');
    process.exit(1);
  }
}

async function main() {
  const command = process.argv[2] ?? 'help';
  const config = loadConfig();

  switch (command) {
    case 'apply':
      await applyConfig(config);
      break;
    case 'status':
      await printStatus(config);
      break;
    case 'verify':
      await verifyAccess(config);
      break;
    default:
      console.log(`Usage: node scripts/setup-cloudflare-access.mjs <apply|verify|status>`);
      process.exit(command === 'help' ? 0 : 1);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
