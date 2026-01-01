# Contributing to Traveller Combat VTT

Thank you for your interest in contributing to Traveller Combat VTT! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Testing Requirements](#testing-requirements)
- [Coding Standards](#coding-standards)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behaviour to [project maintainer contact].

## Getting Started

### Prerequisites

- **Node.js:** v18.0.0 or higher
- **npm:** v9.0.0 or higher
- **Git:** Latest version recommended

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/traveller-combat-vtt.git
   cd traveller-combat-vtt
   ```
3. Add upstream remote:
   ```bash
   git remote add upstream https://github.com/ORIGINAL-OWNER/traveller-combat-vtt.git
   ```

## Development Setup

### Installation

```bash
# Install dependencies
npm install

# Run tests to verify setup
npm test

# Start development server
npm run dev
```

### First-Time Setup Checklist

- [ ] Node.js 18+ installed
- [ ] Dependencies installed (`npm install`)
- [ ] All tests passing (`npm test`)
- [ ] Server starts successfully (`npm run dev`)
- [ ] Can access application at http://localhost:3000

## Project Structure

```
traveller-combat-vtt/
├── lib/              # Core game logic and mechanics
│   ├── combat.js     # Combat resolution engine
│   ├── ship.js       # Ship model and validation
│   └── ...
├── data/             # Game data (ships, weapons, templates)
│   ├── ships/        # Ship definitions
│   └── weapons/      # Weapon statistics
├── tests/            # Test suites
│   ├── unit/         # Unit tests
│   ├── integration/  # Integration tests
│   └── automated/    # Puppeteer E2E tests
├── public/           # Static client-side files
│   ├── app.js        # Main client application
│   ├── index.html    # Multiplayer UI
│   └── test.html     # Single-player test mode
├── server.js         # Express + Socket.io server
└── .claude/          # Project documentation and planning
```

## Development Workflow

### 1. Create a Feature Branch

```bash
# Update your main branch
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name
```

### 2. Make Changes

- Follow [coding standards](#coding-standards)
- Write tests for new functionality
- Update documentation as needed
- Run tests frequently: `npm test`

### 3. Commit Changes

Follow our [commit message guidelines](#commit-message-guidelines):

```bash
git add .
git commit -m "feat: add ship customization feature"
```

### 4. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a pull request on GitHub.

## Testing Requirements

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run data validation
npm run test:data

# Run security tests
npm run test:security

# Run automated browser tests
npm run test:auto
```

### Test Coverage Requirements

- **Minimum coverage:** 80% for new code
- **Current coverage:** 95%+ (let's maintain this!)
- All tests must pass before PR approval

### Writing Tests

```javascript
// Example unit test
const { calculateDamage } = require('../lib/combat');

describe('Combat System', () => {
  test('calculateDamage applies armour reduction', () => {
    const result = calculateDamage(10, 2);
    expect(result).toBe(8);
  });
});
```

## Coding Standards

### JavaScript Style

- **ES6+ syntax** preferred
- **2 spaces** for indentation
- **Single quotes** for strings
- **Semicolons** required
- **JSDoc comments** for public functions

### Example

```javascript
/**
 * Resolves combat between attacker and defender
 * @param {Object} attacker - Attacking ship instance
 * @param {Object} defender - Defending ship instance
 * @param {Object} weapon - Weapon being used
 * @returns {Object} Combat result with damage and effects
 */
function resolveCombat(attacker, defender, weapon) {
  // Implementation
}
```

### Naming Conventions

- **Variables:** camelCase (`shipCount`, `maxRange`)
- **Constants:** UPPER_SNAKE_CASE (`MAX_RANGE`, `DEFAULT_ARMOUR`)
- **Functions:** camelCase (`calculateDamage`, `moveShip`)
- **Classes:** PascalCase (`Ship`, `CombatEngine`)
- **Files:** kebab-case (`combat-engine.js`, `ship-template.js`)

### British Spelling

This project uses **British English** spelling consistently:

- ✅ `armour`, `behaviour`, `colour`, `defence`
- ❌ `armor`, `behavior`, `color`, `defense`

### No Floating Point Credits

- Use **integer credits** only (no floating point)
- ✅ `1000` (1000 credits)
- ❌ `1000.50` (avoid decimals)

## Commit Message Guidelines

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat:** New feature
- **fix:** Bug fix
- **docs:** Documentation changes
- **test:** Adding or updating tests
- **refactor:** Code refactoring
- **style:** Code style changes (formatting, no logic change)
- **chore:** Maintenance tasks, dependency updates
- **perf:** Performance improvements

### Examples

```
feat(combat): add missile tracking system

Implements missile launch, tracking, and point defence mechanics.
Includes sandcaster defensive capabilities.

Closes #42
```

```
fix(ship): correct armour calculation for critical hits

Armour reduction was not being applied correctly when severity > 3.
Now properly reduces armour by severity - 2.

Fixes #87
```

### Automated Generation

All commits must include:
```
🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Pull Request Process

### Before Submitting

- [ ] All tests pass (`npm test`)
- [ ] No npm audit vulnerabilities (`npm audit`)
- [ ] Code follows style guidelines
- [ ] JSDoc comments added for new functions
- [ ] Documentation updated (if needed)
- [ ] Commit messages follow guidelines
- [ ] Branch is up-to-date with main

### PR Template

When creating a PR, include:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] All tests pass
- [ ] Added new tests
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
```

### Review Process

1. **Automated checks:** CI must pass (tests, lint, security audit)
2. **Code review:** At least one maintainer approval required
3. **Testing:** Reviewer will test functionality
4. **Merge:** Squash and merge to main branch

## Reporting Bugs

### Before Reporting

1. Check existing [Issues](https://github.com/OWNER/traveller-combat-vtt/issues)
2. Verify bug exists in latest version
3. Test in clean environment if possible

### Bug Report Template

```markdown
**Describe the bug**
Clear description of what the bug is

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behaviour**
What you expected to happen

**Screenshots**
If applicable, add screenshots

**Environment:**
 - OS: [e.g., Ubuntu 22.04]
 - Browser: [e.g., Chrome 120]
 - Node version: [e.g., 20.10.0]
 - Project version: [e.g., 0.12.5]

**Additional context**
Any other relevant information
```

## Suggesting Features

### Feature Request Template

```markdown
**Problem Statement**
What problem does this feature solve?

**Proposed Solution**
How should this work?

**Alternatives Considered**
Other approaches you've thought about

**Traveller Rules Reference**
Which Traveller 2E rules support this feature?

**Additional Context**
Mockups, examples, or references
```

### Feature Discussion

- Open a **GitHub Discussion** for complex features
- Tag with `enhancement` label
- Reference Traveller 2E rules where applicable
- Consider impact on existing features

## Development Best Practices

### 1. Test-Driven Development

Write tests before implementation when possible:

```javascript
// 1. Write failing test
test('ship movement respects thrust limits', () => {
  const ship = createShip({ thrust: 2 });
  const result = moveShip(ship, { distance: 10 });
  expect(result.success).toBe(false);
});

// 2. Implement feature
function moveShip(ship, options) {
  const maxDistance = ship.thrust * 10;
  if (options.distance > maxDistance) {
    return { success: false, reason: 'Insufficient thrust' };
  }
  // Implementation
}

// 3. Test passes
```

### 2. Incremental Changes

- Small, focused commits
- One feature/fix per PR
- Easier to review and merge

### 3. Documentation

- Update README for user-facing changes
- Update `.claude/` docs for architectural changes
- Add JSDoc comments for new functions
- Include examples in documentation

## Getting Help

### Resources

- **Documentation:** See `.claude/` directory
- **Discussions:** GitHub Discussions for questions
- **Issues:** GitHub Issues for bugs
- **Architecture:** See `ARCHITECTURE.md`
- **Project Plan:** See `docs/AR-ROADMAP.md`

### Questions?

- Open a GitHub Discussion
- Tag with appropriate label
- Provide context and what you've tried

---

## License

By contributing to Traveller Combat VTT, you agree that your contributions will be licensed under the project's [GPL-3.0 License](LICENSE).

## Acknowledgments

All contributors are credited in:
- Project README
- Release notes
- Git commit history

Thank you for contributing! 🚀

---

**Last Updated:** 2025-12-31
**Maintainer:** Bruce Stephenson
**Contact:** GitHub Issues
