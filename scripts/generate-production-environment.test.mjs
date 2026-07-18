import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  generateProductionEnvironment,
  normalizeApiBaseUrl,
} from './generate-production-environment.mjs';

async function generate(apiBaseUrl) {
  const directory = await mkdtemp(join(tmpdir(), 'argos-web-environment-'));
  const outputPath = join(directory, 'environment.production.ts');
  await generateProductionEnvironment({ apiBaseUrl, outputPath });
  return readFile(outputPath, 'utf8');
}

test('generates the expected environment for a valid API URL', async () => {
  assert.equal(
    await generate('https://api.example.test'),
    'export const environment = {\n  apiBaseUrl: "https://api.example.test",\n};\n',
  );
});

test('normalizes the origin and removes its final slash', () => {
  assert.equal(normalizeApiBaseUrl('https://api.example.test/'), 'https://api.example.test');
  assert.equal(normalizeApiBaseUrl('  https://api.example.test/  '), 'https://api.example.test');
});

test('rejects a missing value', () => {
  assert.throws(() => normalizeApiBaseUrl(undefined), /required/);
});

test('rejects a relative URL', () => {
  assert.throws(() => normalizeApiBaseUrl('/api'), /absolute/);
});

test('rejects credentials', () => {
  assert.throws(() => normalizeApiBaseUrl('https://user:secret@example.test'), /credentials/);
});

test('rejects a path, query, or fragment', () => {
  assert.throws(() => normalizeApiBaseUrl('https://api.example.test/v1'), /origin/);
  assert.throws(() => normalizeApiBaseUrl('https://api.example.test?region=us'), /origin/);
  assert.throws(() => normalizeApiBaseUrl('https://api.example.test#status'), /origin/);
});

test('rejects a non-HTTP protocol', () => {
  assert.throws(() => normalizeApiBaseUrl('ftp://api.example.test'), /http or https/);
});

test('serializes special characters without TypeScript injection', async () => {
  const validOrigin = 'https://[2001:db8::1]:8443';
  const content = await generate(validOrigin);

  assert.equal(
    content,
    `export const environment = {\n  apiBaseUrl: ${JSON.stringify(validOrigin)},\n};\n`,
  );
});
