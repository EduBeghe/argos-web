import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_OUTPUT_PATH = 'src/environments/environment.production.ts';

export function normalizeApiBaseUrl(value) {
  if (!value) {
    throw new Error('API_BASE_URL is required.');
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('API_BASE_URL must be a valid absolute HTTP or HTTPS URL.');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('API_BASE_URL must use the http or https protocol.');
  }
  if (url.username || url.password) {
    throw new Error('API_BASE_URL must not contain credentials.');
  }
  if (url.pathname !== '/' || url.search || url.hash) {
    throw new Error('API_BASE_URL must be an origin without a path, query, or fragment.');
  }

  return url.origin;
}

export async function generateProductionEnvironment({ apiBaseUrl, outputPath }) {
  const normalizedUrl = normalizeApiBaseUrl(apiBaseUrl);
  const destination = resolve(outputPath ?? DEFAULT_OUTPUT_PATH);
  const content = `export const environment = {\n  apiBaseUrl: ${JSON.stringify(normalizedUrl)},\n};\n`;

  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, content, 'utf8');
}

const isMainModule = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainModule) {
  generateProductionEnvironment({
    apiBaseUrl: process.env.API_BASE_URL,
    outputPath: process.env.ENVIRONMENT_OUTPUT_PATH,
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : 'Environment generation failed.');
    process.exitCode = 1;
  });
}
