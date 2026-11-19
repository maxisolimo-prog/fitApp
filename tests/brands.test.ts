import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import {
  applyBrand, brandCssVars, BRANDS, BRAND_STORAGE_KEY, cssVarName, DEFAULT_BRAND_ID, parseBrandId, resolveBrandId, startBrand,
  type Brand,
} from '../src/app/brands';

const brands = Object.values(BRANDS);

// ---------- Contraste (WCAG 2.x) ----------
function luminance(hex: string): number {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  assert.ok(match, `se esperaba un color #RRGGBB y vino ${hex}`);
  const channels = [0, 2, 4].map((offset) => parseInt(match[1].slice(offset, offset + 2), 16) / 255)
    .map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}
function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** Texto sobre fondo que la interfaz usa de verdad, con el mínimo que tiene que cumplir cada marca. */
function textPairs(brand: Brand): [text: string, background: string, label: string, min: number][] {
  const t = brand.tokens;
  return [
    [t.onAccent, t.accent, 'texto del botón principal', 4.5],
    [t.ink, t.bg, 'texto sobre el fondo', 7],
    [t.ink, t.surface, 'texto sobre tarjeta', 7],
    [t.ink, t.bgTint, 'texto sobre día planificado', 7],
    [t.ink2, t.bg, 'texto secundario sobre el fondo', 4.5],
    [t.ink2, t.surface, 'texto secundario sobre tarjeta', 4.5],
    [t.ink2, t.bgTint, 'texto secundario sobre tinte', 4.5],
    [t.strong, t.bg, 'etiqueta sobre el fondo', 4.5],
    [t.strong, t.surface, 'ícono y etiqueta sobre tarjeta', 4.5],
    [t.onDark, t.strong, 'texto sobre día hecho', 4.5],
    [t.onDark, t.dark, 'texto sobre barra', 4.5],
    [t.onDark, t.darkDeep, 'texto en la sesión', 4.5],
    [t.onDark, t.darkPanel, 'texto sobre panel oscuro', 4.5],
    [t.onDark, t.darkStrong, 'texto sobre barra de descanso', 4.5],
    [t.onDarkSoft, t.darkStrong, 'rótulo de la barra de descanso', 4.5],
    [t.mutedOnDark, t.dark, 'navegación inactiva', 4.5],
    [t.mutedOnDark, t.darkDeep, 'texto secundario en la sesión', 4.5],
    [t.mutedOnDark, t.darkPanel, 'texto secundario sobre panel oscuro', 4.5],
    [t.accent, t.dark, 'navegación activa', 4.5],
    [t.accent, t.darkDeep, 'acento en la sesión', 4.5],
    [t.accent, t.darkPanel, 'acento sobre panel oscuro', 4.5],
  ];
}

for (const brand of brands) {
  test(`marca ${brand.id}: los textos cumplen contraste AA sobre sus fondos`, () => {
    for (const [text, background, label, min] of textPairs(brand)) {
      const ratio = contrast(text, background);
      assert.ok(ratio >= min, `${label}: ${text} sobre ${background} da ${ratio.toFixed(2)}:1, mínimo ${min}:1`);
    }
  });
}

// ---------- Configuración ----------
test('cada marca tiene identificador propio, nombre y las mismas claves', () => {
  assert.deepEqual(Object.keys(BRANDS).sort(), brands.map((brand) => brand.id).sort());
  const required = Object.keys(BRANDS[DEFAULT_BRAND_ID].tokens).sort();
  for (const brand of brands) {
    assert.ok(brand.name.trim().length > 0);
    assert.deepEqual(Object.keys(brand.features).sort(), Object.keys(BRANDS[DEFAULT_BRAND_ID].features).sort());
    const optional = ['displayTracking', 'displayTransform', 'displayWeight'];
    assert.deepEqual(Object.keys(brand.tokens).filter((key) => !optional.includes(key)).sort(), required);
    for (const [key, value] of Object.entries(brand.tokens)) {
      assert.ok(typeof value === 'string' && value.trim() === value && value.length > 0, `${brand.id}.${key}`);
      assert.ok(!/[;{}<>]/.test(value), `${brand.id}.${key} no puede cerrar la declaración CSS`);
    }
  }
});

test('los nombres de token se convierten a variables CSS', () => {
  assert.equal(cssVarName('accent'), '--accent');
  assert.equal(cssVarName('darkDeep'), '--dark-deep');
  assert.equal(cssVarName('onDarkSoft'), '--on-dark-soft');
  assert.equal(cssVarName('ink2'), '--ink-2');
  assert.equal(cssVarName('radiusBtn'), '--radius-btn');
});

test('los valores por defecto de styles.css son los de la marca FitApp', () => {
  const css = readFileSync('src/styles.css', 'utf8');
  const block = /\/\* marca:inicio \*\/([\s\S]*?)\/\* marca:fin \*\//.exec(css);
  assert.ok(block, 'falta el bloque marca:inicio / marca:fin en src/styles.css');
  const defaults: Record<string, string> = {};
  for (const [, name, value] of block[1].matchAll(/^\s*(--[a-z0-9-]+):\s*(.+?);\s*$/gm)) defaults[name] = value;
  assert.deepEqual(defaults, brandCssVars(BRANDS.fitapp));
});

test('fuera de los tokens no hay colores escritos a mano', () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) { if (entry.name !== 'brands') walk(path); }
      else if (/\.(css|ts|html)$/.test(entry.name)) files.push(path);
    }
  };
  walk('src/app');
  files.push(join('src', 'styles.css'));
  const literal = /#[0-9a-fA-F]{6}\b|[:\s,(]#[0-9a-fA-F]{3}\b|\brgba?\(/;
  for (const file of files) {
    let text = readFileSync(file, 'utf8');
    if (file.endsWith('styles.css')) text = text.replace(/:root \{[\s\S]*?\n\}/, '');
    const offending = text.split('\n').map((line, index) => ({ line, number: index + 1 })).filter(({ line }) => literal.test(line));
    assert.deepEqual(offending.map(({ number, line }) => `${file}:${number} ${line.trim().slice(0, 80)}`), [],
      'usá un token de src/styles.css para que el color cambie con la marca');
  }
});

// ---------- Elección de marca ----------
test('solo se aceptan identificadores de marca conocidos', () => {
  assert.equal(parseBrandId('qivox'), 'qivox');
  assert.equal(parseBrandId(' FitnessGroup '), 'fitnessgroup');
  for (const value of ['', 'otra', 'constructor', '__proto__', 'toString', 'qivox;', null, undefined, 3, {}]) {
    assert.equal(parseBrandId(value), null);
  }
});

test('la marca sale del parámetro, después del subdominio, después de lo guardado', () => {
  assert.equal(resolveBrandId({}), 'fitapp');
  assert.equal(resolveBrandId({ search: '?marca=qivox', hostname: 'fitnessgroup.ejemplo.com', stored: 'fitapp' }), 'qivox');
  assert.equal(resolveBrandId({ search: '?otra=1', hostname: 'fitnessgroup.ejemplo.com', stored: 'qivox' }), 'fitnessgroup');
  assert.equal(resolveBrandId({ hostname: '127.0.0.1', stored: 'qivox' }), 'qivox');
  assert.equal(resolveBrandId({ hostname: 'localhost', stored: 'cualquiera' }), 'fitapp');
  assert.equal(resolveBrandId({ search: '?marca=<script>', hostname: 'www.ejemplo.com' }), 'fitapp');
  assert.equal(resolveBrandId({ search: '?marca=fitapp', stored: 'qivox' }), 'fitapp');
});

interface FakeDocument { attributes: Record<string, string>; vars: Record<string, string>; themeColor: string; title: string }
function fakeWindow(search: string, hostname: string, stored: Record<string, string>, storageFails = false) {
  const state: FakeDocument = { attributes: {}, vars: {}, themeColor: '', title: '' };
  const document = {
    documentElement: {
      setAttribute: (name: string, value: string) => { state.attributes[name] = value; },
      style: { setProperty: (name: string, value: string) => { state.vars[name] = value; } },
    },
    querySelector: (selector: string) => selector === 'meta[name="theme-color"]'
      ? { setAttribute: (_name: string, value: string) => { state.themeColor = value; } } : null,
    set title(value: string) { state.title = value; },
  };
  const localStorage = {
    getItem: (key: string) => { if (storageFails) throw new Error('bloqueado'); return stored[key] ?? null; },
    setItem: (key: string, value: string) => { if (storageFails) throw new Error('bloqueado'); stored[key] = value; },
  };
  return { win: { location: { search, hostname }, localStorage, document } as unknown as Window, state, stored };
}

test('aplicar una marca fija variables, color del navegador y título', () => {
  const { win, state } = fakeWindow('', 'localhost', {});
  applyBrand(BRANDS.fitnessgroup, win.document);
  assert.equal(state.attributes['data-brand'], 'fitnessgroup');
  assert.equal(state.vars['--accent'], '#FFDB01');
  assert.equal(state.vars['--display-transform'], 'uppercase');
  assert.equal(state.themeColor, '#111113');
  assert.equal(state.title, 'Fitness Group · Cada sesión cuenta');
});

test('la marca elegida con ?marca= queda guardada y sigue sin el parámetro', () => {
  const first = fakeWindow('?marca=qivox', '127.0.0.1', {});
  assert.equal(startBrand(first.win).id, 'qivox');
  assert.equal(first.stored[BRAND_STORAGE_KEY], 'qivox');

  const later = fakeWindow('', '127.0.0.1', first.stored);
  assert.equal(startBrand(later.win).id, 'qivox');
  assert.equal(later.state.vars['--accent'], '#FFBD00');

  const back = fakeWindow('?marca=fitapp', '127.0.0.1', first.stored);
  assert.equal(startBrand(back.win).id, 'fitapp');
  assert.equal(back.stored[BRAND_STORAGE_KEY], 'fitapp');
});

test('un subdominio no guarda nada y un almacenamiento bloqueado no rompe el arranque', () => {
  const host = fakeWindow('', 'qivox.ejemplo.com', {});
  assert.equal(startBrand(host.win).id, 'qivox');
  assert.equal(host.stored[BRAND_STORAGE_KEY], undefined);

  const blocked = fakeWindow('?marca=fitnessgroup', 'localhost', {}, true);
  assert.equal(startBrand(blocked.win).id, 'fitnessgroup');
});
