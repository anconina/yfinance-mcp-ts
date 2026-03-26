---
name: Bug Report
about: Report a bug to help us improve
title: '[Bug]: '
labels: bug
assignees: ''
---

## Bug Description

A clear and concise description of what the bug is.

## Steps to Reproduce

1. Install the package with '...'
2. Create a ticker with '...'
3. Call method '...'
4. See error

## Expected Behavior

A clear and concise description of what you expected to happen.

## Actual Behavior

What actually happened instead.

## Code Sample

```typescript
import { Ticker } from 'yfinance-mcp-ts';

// Minimal code to reproduce the issue
const ticker = new Ticker('AAPL');
const result = await ticker.getPrice();
console.log(result);
```

## Error Output

```
Paste any error messages or stack traces here
```

## Environment

- **Node.js version**: [e.g., 20.10.0]
- **Package version**: [e.g., 1.0.0]
- **Operating System**: [e.g., macOS 14.0, Ubuntu 22.04, Windows 11]
- **TypeScript version** (if applicable): [e.g., 5.3.3]

## Additional Context

- [ ] I have searched existing issues to ensure this hasn't been reported
- [ ] I can reproduce this with the latest version of the package
- [ ] This issue occurs consistently (not intermittently)

### Related Issues

Link any related issues here.

### Possible Solution

If you have ideas on how to fix this, please share them here.
