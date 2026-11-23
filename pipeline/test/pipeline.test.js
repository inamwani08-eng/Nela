import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import { toIsoDate, parseCoord, bhkOf, parseProjectList, parseProjectDetail } from '../src/parse.js';
import { cleanUnits, builderKey, localityOf, monthsBetween, builderStats } from '../src/build.js';
import { isRelevant } from '../src/config.js';
import { nameMatch } from '../src/places.js';

const doc = (h) => parseHTML(/<html/i.test(h) ? h : `<!doctype html><html><body>${h}</body></html>`).document;

test('dates and coordinates', () => {
  assert.equal(toIsoDate('28/02/2022'), '2022-02-28');
  assert.equal(toIsoDate('1-5-2021'), '2021-05-01');
  assert.equal(toIsoDate(''), null);
  assert.equal(parseCoord('12.872534'), 12.872534);
  assert.ok(Math.abs(parseCoord('12°59\'45.61"N') - 12.99600) < 1e-4);
});

test('bhk parsing', () => {
  assert.equal(bhkOf('3 BHK'), 3);
  assert.equal(bhkOf('2BHK Type 2A'), 2);
  assert.equal(bhkOf('3.5 BHK and 4.5 BHK Apartments'), 3);
  assert.equal(bhkOf('Studio'), 0);
  assert.equal(bhkOf('Flats'), null);
});

test('list table parsing keeps project facts only', () => {
  const cells = ['1', 'PR/KN/1', 'PRM/KA/RERA/1', '<a id="6">v</a>', 'Acme Ltd', 'Acme Greens', 'APPROVED', 'Bengaluru Urban', 'Bengaluru East',
    'Residential/Group Housing', '10/10/2017', '28/02/2022', '31-05-2021', '31-05-2021 - 28-02-2022', '', '', '', '', '', '', '<a id="6">c</a>'];
  const html = `<table id="approvedTable"><thead><tr><th>x</th></tr></thead><tbody><tr>${cells.map((c) => `<td>${c}</td>`).join('')}</tr></tbody></table>`;
  const [r] = parseProjectList(html, doc);
  assert.equal(r.reraId, '6');
  assert.equal(r.completion, '2022-02-28');
  assert.equal(r.completionAtReg, '2021-05-31');
  assert.deepEqual(r.extensions, ['2022-02-28']);
  assert.equal('hasComplaints' in r, false);
});

test('detail parsing: current layout, no personal data', () => {
  const html = `<div>Project Details</div><div>Promoter Details</div><p>PAN:</p><p>ABCDE1234F</p>
  <div>Project Details</div><p>Project Name :</p><p>Test Towers</p><p>Project Status:</p><p>New Project Launch</p>
  <p>Proposed Completion Date:</p><p>31-07-2030</p><p>Project Address</p><p>Project Address:</p><p>SY NO 10, FOO VILLAGE, Bengaluru - 560083</p>
  <p>Latitude:</p><p>12.87</p><p>Longitude:</p><p>77.57</p>
  <table><tr><td>Sl No.</td><td>Type of Inventory</td><td>No. of Inventory</td><td>Carpet Area (Sq Mtr)</td><td>Area of exclusive balcony/verandah (Sq Mtr)</td><td>Area of exclusive open Terrace (Sq Mtr)</td></tr>
  <tr><td>1</td><td>3 BHK</td><td>10</td><td>1000</td><td>100</td><td>0</td></tr><tr><td>2</td><td>TOTAL</td><td>10</td><td>1000</td></tr></table>`;
  const d = parseProjectDetail(html, doc);
  assert.equal(d.name, 'Test Towers');
  assert.equal(d.completion, '2030-07-31');
  assert.equal(d.pin, '560083');
  assert.equal(d.lat, 12.87);
  assert.equal(d.units.length, 1);
  assert.equal(d.units[0].carpetSqftAvg, 1076);
  assert.ok(!JSON.stringify(d).includes('ABCDE1234F'));
});

test('unit cleaning fixes per-flat vs total mix-ups and drops codes', () => {
  const u = cleanUnits([
    { type: '3 BHK - 1615', count: 24, carpetSqftAvg: 45 },
    { type: '3 BHK', count: 256, carpetSqftAvg: 1612 },
    { type: 'C20b', count: 132, carpetSqftAvg: 12 },
    { type: '2BHK', count: 28, carpetSqftAvg: 691 },
  ]);
  assert.deepEqual(u.map((x) => x.type), ['3 BHK', '2 BHK']);
  assert.equal(u[0].count, 280);
  assert.equal(u[0].carpetMin, 1080);
  assert.equal(u[0].carpetMax, 1612);
});

test('builder grouping and delay', () => {
  assert.equal(builderKey('SOBHA LIMITED'), builderKey('Sobha Ltd.'));
  assert.equal(Math.round(monthsBetween('2021-12-31', '2025-09-30')), 45);
  const list = JSON.parse(readFileSync(new URL('./fixtures/list.json', import.meta.url)));
  const s = builderStats(list.projects, '2026-11-22');
  assert.equal(s[builderKey('Sobha Limited')].projects, 2);
});

test('locality from RERA address', () => {
  assert.equal(localityOf('Sy No 17/3, Gunjur Village, Varthur Hobli', 'Bengaluru South'), 'Gunjur');
  assert.equal(localityOf('Panathur Main Road, Off ORR', 'Bengaluru East'), 'Panathur');
  assert.equal(localityOf('', 'Anekal'), 'Anekal');
});

test('relevance window', () => {
  const base = { status: 'APPROVED', type: 'Residential/Group Housing', extensions: [] };
  assert.ok(isRelevant({ ...base, completion: '2027-01-01' }, new Date('2026-11-22')));
  assert.ok(!isRelevant({ ...base, completion: '2020-01-01' }, new Date('2026-11-22')));
  assert.ok(!isRelevant({ ...base, type: 'Commercial', completion: '2027-01-01' }, new Date('2026-11-22')));
});

test('Google place name matching', () => {
  assert.ok(nameMatch('Sobha Windsor Phase 3 Wing 6, 7 and 8', 'Sobha Windsor') >= 0.5);
  assert.ok(nameMatch('Prestige Lakeside Habitat', 'Brigade Lakefront') < 0.5);
});
