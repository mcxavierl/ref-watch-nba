#!/usr/bin/env npx tsx
import * as fs from 'node:fs';
import * as path from 'node:path';
const d=path.join(process.cwd(),'data','nfl');
fs.copyFileSync(path.join(d,'ref-stats.seed.json'),path.join(d,'ref-stats.json'));
console.log('NFL build done');
