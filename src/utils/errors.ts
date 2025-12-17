export class GitAdrError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly stderr?: string
  ) {
    super(message);
    this.name = 'GitAdrError';
  }
}

export class CommandTimeoutError extends GitAdrError {
  constructor(message: string) {
    super(message, 'TIMEOUT');
    this.name = 'CommandTimeoutError';
  }
}

export class GitNotFoundError extends GitAdrError {
  constructor() {
    super('Git executable not found. Please install Git and ensure it is in your PATH.', 'GIT_NOT_FOUND');
    this.name = 'GitNotFoundError';
  }
}

export class GitAdrNotFoundError extends GitAdrError {
  constructor() {
    super('git-adr not found. Please install git-adr: https://github.com/zircote/git-adr', 'GIT_ADR_NOT_FOUND');
    this.name = 'GitAdrNotFoundError';
  }
}

export class NotAGitRepositoryError extends GitAdrError {
  constructor(path: string) {
    super(`Not a git repository: ${path}`, 'NOT_A_REPO');
    this.name = 'NotAGitRepositoryError';
  }
}
