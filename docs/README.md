# Documentation

This directory contains all documentation for the Carespace Bug Tracker project.

## 📁 Directory Structure

```
docs/
├── README.md (this file)
├── CHANGELOG.md - Project changelog
├── chrome-extension/ - Chrome extension documentation
│   ├── README.md - Extension overview and installation
│   ├── AUTH_SETUP.md - Authentication configuration
│   ├── DEPLOYMENT_SUMMARY.md - Deployment guide
│   ├── PRIVACY.md - Privacy policy
│   ├── PRODUCTION.md - Production deployment guide
│   └── QUICKSTART.md - Quick start guide
├── setup/ - Setup and configuration guides
│   ├── CODEBASE_CONTEXT.md - How to configure codebase context for AI
│   ├── INTELLIGENT_ROUTING.md - Repository routing configuration
│   └── WEBHOOK_SETUP.md - Webhook configuration (disabled feature)
└── testing/ - Testing documentation and reports
    ├── E2E_TESTING.md - E2E testing guide
    ├── E2E-VERIFICATION.md - E2E verification results
    ├── MANUAL_TESTING_VERIFICATION.md - Manual testing checklist
    ├── MANUAL_VERIFICATION.md - Manual verification results
    ├── VERIFICATION_REPORT.md - Verification report
    ├── VERIFICATION-SUMMARY.md - Verification summary
    ├── LANGUAGE_SWITCHING_TEST_REPORT.md - Language switching test results
    ├── RATE_LIMIT_VERIFICATION_REPORT.md - Rate limiting verification
    ├── edge-case-testing-report.md - Edge case testing results
    ├── mobile-integration-test-plan.md - Mobile testing plan
    └── mobile-verification-results.md - Mobile testing results
```

## 🚀 Quick Links

### Getting Started
- [Main README](../README.md) - Project overview
- [Chrome Extension README](chrome-extension/README.md) - Extension installation

### Configuration
- [Codebase Context Setup](setup/CODEBASE_CONTEXT.md)
- [Intelligent Repository Routing](setup/INTELLIGENT_ROUTING.md)
- [Webhook Setup](setup/WEBHOOK_SETUP.md) (disabled)

### Chrome Extension
- [Extension Quick Start](chrome-extension/QUICKSTART.md)
- [Authentication Setup](chrome-extension/AUTH_SETUP.md)
- [Privacy Policy](chrome-extension/PRIVACY.md)
- [Production Deployment](chrome-extension/PRODUCTION.md)

### Testing
- [E2E Testing Guide](testing/E2E_TESTING.md)
- [Manual Testing Checklist](testing/MANUAL_TESTING_VERIFICATION.md)
- [Verification Reports](testing/VERIFICATION-SUMMARY.md)

## 📝 Contributing

When adding new documentation:
- Place feature docs in the root `docs/` directory
- Place testing reports in `docs/testing/`
- Place setup guides in `docs/setup/`
- Place Chrome extension docs in `docs/chrome-extension/`
- Update this README with links to new documents
