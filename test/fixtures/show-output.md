# ADR 001: Use TypeScript for extension development

## Status

Accepted

## Context

We need to choose a language for developing the VS Code extension. The main options are TypeScript and JavaScript.

## Decision

We will use TypeScript for the following reasons:
- Strong typing helps catch errors at compile time
- Better IDE support and IntelliSense
- Easier to maintain and refactor
- Standard choice for VS Code extensions

## Consequences

- Requires compilation step
- Learning curve for team members unfamiliar with TypeScript
- Better code quality and maintainability
