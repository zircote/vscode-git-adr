import * as assert from 'assert';
import { parseAdrList } from '../../src/utils/parser';

suite('Parser Test Suite', () => {
  test('Parse pipe-separated format', () => {
    const input = '001 | Use TypeScript\n002 | Implement tree view';
    const result = parseAdrList(input);
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].id, '001');
    assert.strictEqual(result[0].title, 'Use TypeScript');
  });

  test('Parse colon-separated format', () => {
    const input = '001: Use TypeScript\n002: Implement tree view';
    const result = parseAdrList(input);
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[1].id, '002');
  });

  test('Parse space-separated format', () => {
    const input = '001 Use TypeScript\n002 Implement tree view';
    const result = parseAdrList(input);
    assert.strictEqual(result.length, 2);
  });

  test('Parse mixed format', () => {
    const input = '001 | Use TypeScript\n002: Implement tree view\n003 Use virtual docs';
    const result = parseAdrList(input);
    assert.strictEqual(result.length, 3);
  });

  test('Handle empty lines', () => {
    const input = '001 | Use TypeScript\n\n\n002 | Implement tree view';
    const result = parseAdrList(input);
    assert.strictEqual(result.length, 2);
  });

  test('Handle empty input', () => {
    const result = parseAdrList('');
    assert.strictEqual(result.length, 0);
  });

  test('Weird/unparseable output does not crash', () => {
    const input = '---\n(no results)\n* something *\n';
    const result = parseAdrList(input);
    assert.ok(Array.isArray(result));
  });
});
