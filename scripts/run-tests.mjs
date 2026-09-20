#!/usr/bin/env node
/* [EN] Runner testów Node — leci WSZYSTKIE pliki i sumuje błędy.
   Powód: wcześniej `test:all` był łańcuchem `&&`, więc pierwszy fail (np. dryf baseline)
   ucinał resztę — w tym strażnika wersji, który jest ostatni. Efekt: SW_FINGERPRINT
   rozjechał się z APP_VERSION o dwa bumpy i nikt tego nie zobaczył.

   Kolejność: strażniki wydania NAJPIERW (tanie, łapią pomyłkę release'u),
   potem silnik, potem regresje obszarowe. */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const SUITES = [
    // strażniki wydania — muszą iść pierwsze i zawsze się odpalić
    'test/version-compare.js',
    // silnik
    'test/smoke-node.js',
    'test/property.js',
    'test/quantity.js',
    'test/engine-units.js',
    'test/quantity-algebra.js',
    'test/raycast-parity.js',
    'test/readback.js',
    'test/units-oracle.js',
    'test/money-oracle.js',
    'test/engine-debug.js',
    'test/baseline.js',
    // regresje obszarowe
    'test/notepad-oracle.js',
    'test/notepad-caret.js',
    'test/dates-regression.js',
    'test/help-bilingual.js',
    'test/pl-unit-grammar.js',
    'test/pl-fold-regression.js',
    'test/timezone-regression.js',
    'test/hint-rules.js',
    'test/settings-migration.js',
];

const failures = [];
for (const suite of SUITES) {
    const res = spawnSync(process.execPath, [path.join(root, suite)], {
        cwd: root,
        stdio: 'inherit',
    });
    const code = res.status == null ? 1 : res.status;
    if (code !== 0) failures.push({ suite, code });
}

console.log('');
if (failures.length) {
    console.error('❌ ' + failures.length + '/' + SUITES.length + ' zestawów NIE przeszło:');
    for (const f of failures) console.error('     ' + f.suite + ' (exit ' + f.code + ')');
    process.exit(1);
}
console.log('✅ WSZYSTKIE ZESTAWY: ' + SUITES.length + '/' + SUITES.length + ' PASS');
