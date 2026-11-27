#!/usr/bin/env node
import { todayNL } from '../js/lib/util.js';
import { loadAll } from './lib/io.mjs';
import { validateData } from './lib/validate-data.mjs';
const { errors, warnings } = validateData(loadAll(), { today: todayNL() });
warnings.forEach((w) => console.log(`⚠ ${w}`));
errors.forEach((e) => console.error(`✗ ${e}`));
console.log(`${errors.length} fouten, ${warnings.length} waarschuwingen`);
process.exit(errors.length ? 1 : 0);
