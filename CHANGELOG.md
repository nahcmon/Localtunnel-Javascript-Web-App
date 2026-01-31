# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2026-01-31

### Fixed
- **Security**: Upgraded bcrypt from v5.1.1 to v6.0.0 to fix tar dependency vulnerabilities (3 high-severity issues resolved)
- **Compatibility**: Upgraded better-sqlite3 from v9.2.2 to v11.8.1 for Node.js v25+ support (C++20 requirement)
- Build errors on Node.js v25+ now resolved

### Changed
- Updated multiple dependencies to latest versions:
  - express: 4.18.2 → 4.21.2
  - helmet: 7.1.0 → 8.0.0
  - express-rate-limit: 7.1.5 → 7.5.0
  - dotenv: 16.3.1 → 16.4.7
  - express-validator: 7.0.1 → 7.2.1
  - uuid: 9.0.1 → 11.0.5
  - cookie-parser: 1.4.6 → 1.4.7
- Removed 44 deprecated packages from dependency tree
- Updated SECURITY.md to reflect fixed vulnerabilities

### Security
- **Remaining vulnerabilities**: 2 (down from 5)
  - axios <=0.29.0 (via localtunnel dependency) - documented in SECURITY.md
  - Awaiting upstream localtunnel package update

## [1.0.0] - 2026-01-31

### Added
- Initial release of LocalTunnel Web Application
- Secure port tunneling with localtunnel integration
- Modern dark-themed web interface
- Authentication profile management
- Tunnel creation with custom subdomains
- Real-time tunnel monitoring and status updates
- SQLite database for persistent storage
- Comprehensive security implementation:
  - bcrypt password hashing (12 rounds)
  - Rate limiting (API: 100 req/15min, Auth: 5 req/15min)
  - Input validation with express-validator
  - Input sanitization
  - Helmet.js security headers (CSP, HSTS, XSS protection)
  - SQL injection protection via prepared statements
  - Body size limits (10kb)
  - HTTPS-only tunnels
- Comprehensive documentation (README.md, SECURITY.md, LICENSE)
- Favicon with tunnel and lock design

### Security
- Implemented OWASP security best practices
- Protection against XSS, CSRF, SQL injection
- Secure session management
- Rate limiting to prevent abuse
- Comprehensive input validation

[1.0.1]: https://github.com/nahcmon/Localtunnel-Javascript-Web-App/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/nahcmon/Localtunnel-Javascript-Web-App/releases/tag/v1.0.0
