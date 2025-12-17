import * as assert from 'assert';
import { parseAdrList, parseAdrListJson } from '../../src/utils/parser';
import { normalizeAdrListItem } from '../../src/models/adrListItem';

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

suite('JSON Parser Test Suite', () => {
  test('Parse valid JSON array with full fields', () => {
    const input = JSON.stringify([
      {
        id: '20251217-test-adr',
        title: 'Test ADR Title',
        status: 'accepted',
        date: '2025-12-17',
        tags: ['test', 'fixture'],
        linked_commits: ['abc123', 'def456'],
        supersedes: null,
        superseded_by: null,
      },
    ]);
    const result = parseAdrListJson(input);

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].id, '20251217-test-adr');
    assert.strictEqual(result[0].title, 'Test ADR Title');
    assert.strictEqual(result[0].status, 'accepted');
    assert.strictEqual(result[0].date, '2025-12-17');
    assert.deepStrictEqual(result[0].tags, ['test', 'fixture']);
    assert.deepStrictEqual(result[0].linked_commits, ['abc123', 'def456']);
    assert.strictEqual(result[0].supersedes, null);
    assert.strictEqual(result[0].superseded_by, null);
  });

  test('Parse minimal JSON (only id and title)', () => {
    const input = '[{"id": "001", "title": "Minimal ADR"}]';
    const result = parseAdrListJson(input);

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].id, '001');
    assert.strictEqual(result[0].title, 'Minimal ADR');
    // Optional fields should be undefined or empty array
    assert.strictEqual(result[0].status, undefined);
    assert.strictEqual(result[0].date, undefined);
    assert.deepStrictEqual(result[0].tags, []);
    assert.deepStrictEqual(result[0].linked_commits, []);
  });

  test('Parse empty JSON array', () => {
    const result = parseAdrListJson('[]');
    assert.strictEqual(result.length, 0);
  });

  test('Parse empty string returns empty array', () => {
    const result = parseAdrListJson('');
    assert.strictEqual(result.length, 0);
  });

  test('Parse whitespace-only string returns empty array', () => {
    const result = parseAdrListJson('   \n\t  ');
    assert.strictEqual(result.length, 0);
  });

  test('Throw error for invalid JSON', () => {
    assert.throws(() => {
      parseAdrListJson('{not valid json}');
    }, SyntaxError);
  });

  test('Throw error for non-array JSON', () => {
    assert.throws(() => {
      parseAdrListJson('{"id": "001", "title": "Not an array"}');
    }, /Expected JSON array/);
  });

  test('Handle supersedes relationships', () => {
    const input = JSON.stringify([
      {
        id: '002',
        title: 'New Decision',
        supersedes: '001',
        superseded_by: null,
      },
      {
        id: '001',
        title: 'Old Decision',
        supersedes: null,
        superseded_by: '002',
      },
    ]);
    const result = parseAdrListJson(input);

    assert.strictEqual(result[0].supersedes, '001');
    assert.strictEqual(result[0].superseded_by, null);
    assert.strictEqual(result[1].supersedes, null);
    assert.strictEqual(result[1].superseded_by, '002');
  });
});

suite('Normalizer Test Suite', () => {
  test('Normalize complete ADR object', () => {
    const raw = {
      id: '001',
      title: 'My ADR',
      status: 'accepted',
      date: '2025-12-17',
      tags: ['test'],
      linked_commits: ['abc123'],
      supersedes: null,
      superseded_by: null,
    };
    const result = normalizeAdrListItem(raw);

    assert.strictEqual(result.id, '001');
    assert.strictEqual(result.title, 'My ADR');
    assert.strictEqual(result.status, 'accepted');
    assert.strictEqual(result.date, '2025-12-17');
    assert.deepStrictEqual(result.tags, ['test']);
    assert.deepStrictEqual(result.linked_commits, ['abc123']);
    assert.strictEqual(result.supersedes, null);
    assert.strictEqual(result.superseded_by, null);
  });

  test('Normalize minimal object (only id and title)', () => {
    const raw = { id: '001', title: 'Minimal' };
    const result = normalizeAdrListItem(raw);

    assert.strictEqual(result.id, '001');
    assert.strictEqual(result.title, 'Minimal');
    assert.strictEqual(result.status, undefined);
    assert.strictEqual(result.date, undefined);
    assert.deepStrictEqual(result.tags, []);
    assert.deepStrictEqual(result.linked_commits, []);
    assert.strictEqual(result.supersedes, undefined);
    assert.strictEqual(result.superseded_by, undefined);
  });

  test('Normalize object with missing id defaults to empty string', () => {
    const raw = { title: 'No ID' };
    const result = normalizeAdrListItem(raw);
    assert.strictEqual(result.id, '');
    assert.strictEqual(result.title, 'No ID');
  });

  test('Normalize object with missing title defaults to empty string', () => {
    const raw = { id: '001' };
    const result = normalizeAdrListItem(raw);
    assert.strictEqual(result.id, '001');
    assert.strictEqual(result.title, '');
  });

  test('Normalize coerces numeric id to string', () => {
    const raw = { id: 123, title: 'Numeric ID' };
    const result = normalizeAdrListItem(raw);
    assert.strictEqual(result.id, '123');
  });

  test('Normalize handles non-array tags gracefully', () => {
    const raw = { id: '001', title: 'Test', tags: 'not-an-array' };
    const result = normalizeAdrListItem(raw);
    assert.deepStrictEqual(result.tags, []);
  });

  test('Normalize handles non-array linked_commits gracefully', () => {
    const raw = { id: '001', title: 'Test', linked_commits: 'commit-string' };
    const result = normalizeAdrListItem(raw);
    assert.deepStrictEqual(result.linked_commits, []);
  });

  test('Normalize distinguishes null from undefined for supersedes', () => {
    const withNull = { id: '001', title: 'Test', supersedes: null };
    const withoutField = { id: '001', title: 'Test' };

    const resultNull = normalizeAdrListItem(withNull);
    const resultUndefined = normalizeAdrListItem(withoutField);

    assert.strictEqual(resultNull.supersedes, null);
    assert.strictEqual(resultUndefined.supersedes, undefined);
  });
});
