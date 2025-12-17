import * as fs from 'fs';
import * as path from 'path';

const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures');

/**
 * Load a fixture file and return its contents
 */
export function loadFixture(filename: string): string {
  const fixturePath = path.join(FIXTURES_DIR, filename);
  return fs.readFileSync(fixturePath, 'utf8');
}

/**
 * Common fixtures
 */
export const fixtures = {
  list: () => loadFixture('list-output.txt'),
  show: () => loadFixture('show-output.md'),
  search: () => loadFixture('search-output.txt'),
  init: () => loadFixture('init-output.txt'),
  new: () => loadFixture('new-output.txt'),
  errorGitNotFound: () => loadFixture('error-git-not-found.txt'),
  errorAdrNotFound: () => loadFixture('error-adr-not-found.txt'),
  errorNotARepo: () => loadFixture('error-not-a-repo.txt'),
};
