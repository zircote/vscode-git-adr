import * as assert from 'assert';
import { parseAdrList } from '../../src/utils/parser';

suite('Parser Test Suite', () => {
  test('Parse pipe-separated format', () => {
    const input = `001 | Use TypeScript for extension
002 | Implement tree view
003 | Use virtual documents`;

    const entries = parseAdrList(input);

    assert.strictEqual(entries.length, 3);
    assert.strictEqual(entries[0].id, '001');
    assert.strictEqual(entries[0].title, 'Use TypeScript for extension');
    assert.strictEqual(entries[1].id, '002');
    assert.strictEqual(entries[1].title, 'Implement tree view');
  });

  test('Parse colon-separated format', () => {
    const input = `001: Use TypeScript for extension
002: Implement tree view`;

    const entries = parseAdrList(input);

    assert.strictEqual(entries.length, 2);
    assert.strictEqual(entries[0].id, '001');
    assert.strictEqual(entries[0].title, 'Use TypeScript for extension');
  });

  test('Parse space-separated format', () => {
    const input = `001 Use TypeScript for extension
002 Implement tree view`;

    const entries = parseAdrList(input);

    assert.strictEqual(entries.length, 2);
    assert.strictEqual(entries[0].id, '001');
    assert.strictEqual(entries[0].title, 'Use TypeScript for extension');
  });

  test('Parse mixed format', () => {
    const input = `001 | Use TypeScript
002: Implement tree view
003 Use virtual documents`;

    const entries = parseAdrList(input);

    assert.strictEqual(entries.length, 3);
    assert.strictEqual(entries[0].id, '001');
    assert.strictEqual(entries[1].id, '002');
    assert.strictEqual(entries[2].id, '003');
  });

  test('Handle empty lines', () => {
    const input = `001 | Use TypeScript

002 | Implement tree view`;

    const entries = parseAdrList(input);

    assert.strictEqual(entries.length, 2);
  });

  test('Handle empty input', () => {
    const entries = parseAdrList('');
    assert.strictEqual(entries.length, 0);
  });
});
