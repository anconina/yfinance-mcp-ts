# Contributing to yfinance-mcp-ts

Thank you for your interest in contributing to yfinance-mcp-ts! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)

## Code of Conduct

This project adheres to a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally
3. Set up the development environment
4. Create a branch for your changes
5. Make your changes
6. Submit a pull request

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Git

### Installation

```bash
# Clone your fork
git clone https://github.com/anconina/yfinance-mcp-ts.git
cd yfinance-mcp-ts

# Install dependencies
npm install

# Install optional peer dependencies for full functionality
npm install puppeteer

# Build the project
npm run build

# Run tests to verify setup
npm test
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run dev` | Watch mode for development |
| `npm test` | Run test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Generate coverage report |
| `npm run lint` | Run ESLint |
| `npm run clean` | Remove dist directory |
| `npm run mcp:dev` | Run MCP server in development mode |

## Making Changes

### Branch Naming

Use descriptive branch names:

- `feature/add-new-screener` - For new features
- `fix/options-chain-parsing` - For bug fixes
- `docs/update-api-reference` - For documentation
- `refactor/session-manager` - For refactoring
- `test/ticker-coverage` - For test improvements

### Commit Messages

Follow conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat(ticker): add support for cryptocurrency symbols
fix(screener): handle empty response from API
docs(readme): update MCP configuration examples
test(research): add unit tests for earnings calendar
```

## Pull Request Process

1. **Update documentation**: If your changes affect the public API, update the README and relevant documentation.

2. **Add tests**: Include tests for new functionality or bug fixes.

3. **Run the test suite**: Ensure all tests pass before submitting.
   ```bash
   npm test
   ```

4. **Check code coverage**: Maintain or improve test coverage.
   ```bash
   npm run test:coverage
   ```

5. **Lint your code**: Ensure code follows project standards.
   ```bash
   npm run lint
   ```

6. **Update CHANGELOG**: Add an entry describing your changes.

7. **Create the PR**: Use a clear title and description. Reference any related issues.

8. **Address feedback**: Respond to review comments and make requested changes.

### PR Requirements

- [ ] Tests pass locally
- [ ] Code coverage maintained (65% branches, 70% lines minimum)
- [ ] No linting errors
- [ ] Documentation updated if needed
- [ ] CHANGELOG updated
- [ ] Commit messages follow conventions

## Coding Standards

### TypeScript Guidelines

- Use TypeScript strict mode
- Provide explicit types for function parameters and return values
- Use interfaces for object shapes
- Avoid `any` type when possible
- Use `readonly` for immutable properties

### Code Style

- Use 2-space indentation
- Use single quotes for strings
- Add trailing commas in multi-line arrays/objects
- Maximum line length: 100 characters
- Use meaningful variable and function names

### File Organization

```
src/
├── core/           # Core classes (Ticker, Screener, Research)
├── mcp/            # MCP server implementation
│   └── tools/      # MCP tool definitions
├── auth/           # Authentication module
├── config/         # Configuration data
├── types/          # TypeScript type definitions
├── misc/           # Standalone utility functions
└── utils/          # Helper utilities
```

### Example Code Style

```typescript
import { AxiosInstance } from 'axios';

interface TickerOptions {
  readonly country?: string;
  readonly timeout?: number;
}

export class Ticker {
  private readonly symbols: string[];
  private readonly options: TickerOptions;

  constructor(symbols: string | string[], options: TickerOptions = {}) {
    this.symbols = Array.isArray(symbols) ? symbols : symbols.split(/[\s,]+/);
    this.options = options;
  }

  async getPrice(): Promise<Record<string, PriceData>> {
    // Implementation
  }
}
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- ticker-unit.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="getPrice"

# Run with coverage
npm run test:coverage
```

### Writing Tests

- Place tests in the `tests/` directory
- Name test files with `.test.ts` suffix
- Use descriptive test names
- Test both success and error cases
- Mock external API calls

Example:
```typescript
import { Ticker } from '../src';

describe('Ticker', () => {
  describe('getPrice', () => {
    it('should return price data for valid symbol', async () => {
      const ticker = new Ticker('AAPL');
      const price = await ticker.getPrice();

      expect(price).toHaveProperty('AAPL');
      expect(price.AAPL).toHaveProperty('regularMarketPrice');
    });

    it('should handle invalid symbol gracefully', async () => {
      const ticker = new Ticker('INVALID_SYMBOL_XYZ');
      const price = await ticker.getPrice();

      expect(price.INVALID_SYMBOL_XYZ).toBeDefined();
    });
  });
});
```

### Coverage Requirements

- Branches: 65% minimum
- Functions: 70% minimum
- Lines: 70% minimum
- Statements: 70% minimum

## Reporting Bugs

Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md) and include:

1. **Description**: Clear description of the bug
2. **Steps to Reproduce**: Minimal steps to reproduce
3. **Expected Behavior**: What should happen
4. **Actual Behavior**: What actually happens
5. **Environment**: Node.js version, OS, package version
6. **Code Sample**: Minimal code that reproduces the issue

## Requesting Features

Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md) and include:

1. **Problem Statement**: What problem does this solve?
2. **Proposed Solution**: How should it work?
3. **Alternatives**: Other solutions you've considered
4. **Use Cases**: Real-world examples of how this would be used

## Questions?

If you have questions about contributing, feel free to:

1. Open a [Discussion](https://github.com/anconina/yfinance-mcp-ts/discussions)
2. Check existing issues for similar questions
3. Review the documentation

Thank you for contributing!
