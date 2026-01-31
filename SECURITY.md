# Security Policy

## Known Security Issues

### Dependency Vulnerabilities

As of 2026-01-31, this project has the following known dependency vulnerabilities:

#### 1. Axios (via localtunnel dependency)
- **Severity**: High
- **Affected**: axios <=0.29.0
- **Issues**:
  - CSRF vulnerability (GHSA-wf5p-g6vw-rhxx)
  - SSRF and credential leakage via absolute URL (GHSA-jr5f-v2jv-69x6)
- **Mitigation**:
  - The axios package is a dependency of localtunnel (v2.0.2)
  - These vulnerabilities primarily affect the localtunnel client, not our server
  - Always use authentication profiles for sensitive services
  - Monitor tunnel access via logs
  - Only create tunnels when actively needed
- **Status**: Waiting for localtunnel package update

#### 2. Tar (via bcrypt build dependencies)
- **Severity**: High
- **Affected**: tar <=7.5.6
- **Issues**:
  - Arbitrary file overwrite vulnerabilities
  - Symlink poisoning
- **Mitigation**:
  - These vulnerabilities affect bcrypt's build-time dependencies only
  - Not exploitable at runtime in normal operation
  - Only relevant during npm install/build phase
- **Status**: Waiting for bcrypt package update

### Security Recommendations

1. **Use Authentication**: Always enable authentication profiles for sensitive services
2. **Monitor Logs**: Regularly check tunnel logs for suspicious activity
3. **Limit Exposure**: Only expose services when actively needed
4. **Regular Updates**: Check for dependency updates regularly
5. **Network Security**: Deploy behind a reverse proxy with additional security measures
6. **Environment Isolation**: Run in isolated environments (containers, VMs)

## Reporting Security Issues

If you discover a security vulnerability in this project:

1. **DO NOT** open a public issue
2. Email the maintainers directly with details
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if available)

## Security Best Practices

### For Users

1. **Strong Passwords**: Use passwords with 12+ characters, mixed case, numbers, and symbols
2. **Unique Credentials**: Use different passwords for each auth profile
3. **HTTPS Only**: Always access the application over HTTPS in production
4. **Regular Rotation**: Change auth profile passwords periodically
5. **Monitoring**: Review tunnel logs regularly

### For Deployment

1. **Environment Variables**: Use strong, random secrets for JWT_SECRET and SESSION_SECRET
2. **Reverse Proxy**: Deploy behind nginx/Caddy with:
   - HTTPS/TLS 1.3
   - Additional rate limiting
   - DDoS protection
   - WAF (Web Application Firewall)
3. **Database Backups**: Regular backups of SQLite database
4. **Access Control**: Limit network access to the application
5. **Monitoring**: Set up monitoring and alerting
6. **Updates**: Keep all dependencies updated

### Implemented Security Features

✅ **Password Security**
- bcrypt hashing with 12 rounds
- Strong password requirements
- Secure password storage

✅ **Input Validation**
- express-validator for all inputs
- Sanitization of user data
- Protection against injection attacks

✅ **Rate Limiting**
- API endpoint rate limiting
- Stricter limits for auth endpoints
- Configurable thresholds

✅ **Security Headers**
- Helmet.js implementation
- Content Security Policy
- HSTS headers
- XSS protection

✅ **Database Security**
- Prepared statements
- Foreign key constraints
- WAL mode for better concurrency

✅ **HTTPS**
- All tunnels use HTTPS (via localtunnel)
- Upgrade insecure requests

✅ **Logging**
- Comprehensive event logging
- Tunnel access tracking
- Error logging

## Vulnerability Disclosure Timeline

We aim to:
- Acknowledge reports within 48 hours
- Provide initial assessment within 1 week
- Release fixes within 30 days (severity dependent)
- Publicly disclose after fix is available

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Security Audits

No formal security audits have been conducted yet. Community security reviews are welcome.

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/learn/getting-started/security-best-practices)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Localtunnel Documentation](https://localtunnel.me)

## License

This security policy is licensed under CC0 1.0 Universal.
