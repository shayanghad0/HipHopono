# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| latest  | ✅                 |
| older   | ❌                 |

## Reporting a Vulnerability

Please report security vulnerabilities privately via GitHub [Security Advisories](../../security/advisories).

**Do not open a public issue** for security-sensitive findings.

Include:
- Description of the vulnerability
- Steps to reproduce
- Impact assessment (if known)
- Suggested fix (optional)

We aim to respond within **48 hours** and publish a fix as soon as possible.

## Security Measures

This project implements the following security controls:

- **Path traversal prevention** — all filesystem ops validated through `fsSafe.ts` with allowlisted roots
- **Password hashing** — scrypt with per-user random salt; no plaintext stored
- **API tokens** — never exposed to the client; only masked previews shown
- **Command denylist** — blocks dangerous shell commands (`rm -rf /`, fork bombs, etc.)
- **Approval gates** — mutating actions require explicit user confirmation
- **Rate limiting** — login attempts rate-limited per IP + username
- **Audit logging** — all mutating actions logged to `database/logs.json`
- **Secure cookies** — `httpOnly`, `sameSite=lax`, `secure` flag in production

## Best Practices for Users

- Change `SESSION_SECRET` before deploying to production
- Set `WEbCODE_ALLOWED_ROOTS` to only the directories you intend to expose
- Rotate API keys periodically
- Keep `.env` out of version control
