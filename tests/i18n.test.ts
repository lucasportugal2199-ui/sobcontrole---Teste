import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import pt from '../i18n/locales/pt';

// Uma chave usada no código sem texto em pt.ts aparece na tela como
// "update.title" (o t() devolve a própria chave quando não encontra).
const sourceFiles = (dir: string): string[] =>
  fs.readdirSync(dir).flatMap(f => {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) return sourceFiles(p);
    return /\.tsx?$/.test(f) ? [p] : [];
  });

describe('traduções', () => {
  it('toda chave usada com t("...") existe em português', () => {
    const files = [...['components', 'utils', 'context'].flatMap(sourceFiles), 'App.tsx'];
    const missing: string[] = [];
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      for (const m of source.matchAll(/\bt\(\s*['"`]([a-zA-Z0-9_.]+)['"`]/g)) {
        const key = m[1]!;
        if (!key.endsWith('.') && !(key in pt)) missing.push(`${key} (${path.basename(file)})`);
      }
    }
    expect(missing).toEqual([]);
  });
});
