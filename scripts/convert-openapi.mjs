import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import YAML from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const input = path.join(__dirname, '..', 'server', 'docs', 'openapi.yaml');
const output = path.join(__dirname, '..', 'server', 'docs', 'openapi.json');

try {
  const yamlText = fs.readFileSync(input, 'utf8');
  const parsed = YAML.parse(yamlText);
  fs.writeFileSync(output, JSON.stringify(parsed, null, 2), 'utf8');
  console.log('Converted', input, '->', output);
} catch (err) {
  console.error('Failed to convert OpenAPI YAML to JSON:', err);
  process.exit(1);
}
