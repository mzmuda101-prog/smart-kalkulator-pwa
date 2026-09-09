// ============================================================
//  Regresja migracji domyślnych ustawień (T4-19: suggestOnEmpty ON od v1.02.81).
//
//  Chodzi o to, że sama zmiana domyślnej w STATE.settings NIE dociera do nikogo,
//  kto ma już zapisany matm0_settings — a to każdy, kto choć raz ruszył ⚙️.
//  Migracja podnosi opcję JEDEN raz i zostawia znacznik, żeby świadome
//  wyłączenie po migracji zostało na zawsze.
// ============================================================
const { api } = require('./_bootstrap.js');

const KEY = 'matm0_settings';
let failed = 0;

function check(name, got, want) {
    if (got !== want) {
        console.error('❌ ' + name + ': ' + JSON.stringify(got) + ' (oczekiwano ' + JSON.stringify(want) + ')');
        failed++;
    }
}

// [EN] Odtwarza pełny cykl: podstaw localStorage → wczytaj → zwróć stan + to, co zapisano.
function reload(stored) {
    if (stored === null) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(stored));
    api.loadFromStorage();
    const raw = localStorage.getItem(KEY);
    return { settings: api.state.settings, saved: raw ? JSON.parse(raw) : null };
}

// 1. Świeża instalacja — brak zapisanych ustawień → opcja ON.
{
    const r = reload(null);
    check('świeża instalacja: suggestOnEmpty', r.settings.suggestOnEmpty, true);
}

// 2. Stary użytkownik z zapisanym false (stan sprzed v1.02.81) → migracja podnosi.
{
    const r = reload({ defaultCurrency: 'PLN', suggestOnEmpty: false });
    check('stary użytkownik: podniesione do ON', r.settings.suggestOnEmpty, true);
    check('stary użytkownik: znacznik zapisany', r.saved && r.saved.suggestOnEmptyDefaultV2, true);
    check('stary użytkownik: zapisana wartość', r.saved && r.saved.suggestOnEmpty, true);
}

// 3. Stary użytkownik BEZ klucza w ogóle (starszy zapis) → też podniesione.
{
    const r = reload({ defaultCurrency: 'EUR' });
    check('brak klucza: podniesione do ON', r.settings.suggestOnEmpty, true);
    check('brak klucza: inne ustawienia nietknięte', r.settings.defaultCurrency, 'EUR');
}

// 4. NAJWAŻNIEJSZE: świadome wyłączenie PO migracji nie może zostać cofnięte.
{
    const r = reload({ suggestOnEmpty: false, suggestOnEmptyDefaultV2: true });
    check('opt-out po migracji: zostaje OFF', r.settings.suggestOnEmpty, false);
}

// 5. Migracja nie odpala się drugi raz na tym samym zapisie.
{
    reload({ suggestOnEmpty: false });                 // migracja → true + znacznik
    const afterFirst = JSON.parse(localStorage.getItem(KEY));
    afterFirst.suggestOnEmpty = false;                 // user wyłącza świadomie
    const r = reload(afterFirst);
    check('drugi start po opt-out: nadal OFF', r.settings.suggestOnEmpty, false);
}

// 6. Włączone u starego użytkownika zostaje włączone (bez efektów ubocznych).
{
    const r = reload({ suggestOnEmpty: true, suggestOnEmptyDefaultV2: true });
    check('opt-in zachowany', r.settings.suggestOnEmpty, true);
}

if (failed) {
    console.error('❌ settings-migration: ' + failed + ' błędów');
    process.exit(1);
}
console.log('✅ settings-migration: 9 asercji OK');
process.exit(0); // [EN] atrapa fetch/timerów trzyma event-loop przy życiu
