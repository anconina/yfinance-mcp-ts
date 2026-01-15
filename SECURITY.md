# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please report it responsibly.

### How to Report

1. **Do NOT open a public GitHub issue** for security vulnerabilities
2. Send an email with details to the project maintainers
3. Include as much information as possible:
   - Type of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Acknowledgment**: We will acknowledge receipt of your report within 48 hours
- **Assessment**: We will investigate and assess the vulnerability within 7 days
- **Resolution**: We aim to release a fix within 30 days for confirmed vulnerabilities
- **Credit**: We will credit you in the release notes (unless you prefer anonymity)

### Scope

This security policy applies to:

- The `yfinance-mcp-ts` npm package
- The MCP server implementation
- Authentication and session handling code

### Out of Scope

The following are **not** considered vulnerabilities:

- Issues in Yahoo Finance's API itself
- Rate limiting or IP blocking by Yahoo Finance
- Data accuracy issues from the upstream API
- Vulnerabilities in dependencies (please report these to the respective projects)

## Security Best Practices

When using this library:

### Credential Handling

- **Never commit credentials** to version control
- Use environment variables for Yahoo Premium credentials
- Rotate credentials if you suspect they've been compromised

```typescript
// Good: Use environment variables
const ticker = new Ticker('AAPL', {
  username: process.env.YAHOO_USERNAME,
  password: process.env.YAHOO_PASSWORD,
});

// Bad: Hardcoded credentials
const ticker = new Ticker('AAPL', {
  username: 'my@email.com',
  password: 'mypassword',
});
```

### MCP Server Security

- Run the MCP server in a sandboxed environment when possible
- Be cautious about exposing the MCP server to untrusted AI agents
- The MCP server is designed for local use with Claude Desktop

### Network Security

- The library uses HTTPS for all Yahoo Finance API requests
- Proxy settings are supported for enterprise environments
- Cookie data is stored in memory and not persisted to disk

## Dependencies

We regularly update dependencies to patch known vulnerabilities. Run `npm audit` to check for issues in your installation.

```bash
npm audit
npm audit fix
```

## Changelog

Security-related changes are noted in the [CHANGELOG.md](CHANGELOG.md) with the `[Security]` tag.
