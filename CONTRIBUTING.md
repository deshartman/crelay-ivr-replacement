# Contributing to Conversation Relay IVR Replacement

Thank you for your interest in contributing to the Conversation Relay IVR Replacement project! This document provides guidelines for contributing to the project.

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or pnpm package manager
- Git
- Twilio account (for testing)
- OpenAI API key (for testing)

### Development Setup

1. **Fork the repository** on GitHub

2. **Clone your fork:**
```bash
git clone https://github.com/YOUR_USERNAME/crelay-ivr-replacement.git
cd crelay-ivr-replacement
```

3. **Add upstream remote:**
```bash
git remote add upstream https://github.com/deshartman/crelay-ivr-replacement.git
```

4. **Install dependencies:**
```bash
cd server
npm install
```

5. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your credentials
```

6. **Build and test:**
```bash
npm run build
npm run dev
```

## Development Workflow

### Branch Strategy

- **main**: Stable release branch (protected)
- **feature/**: New features (`feature/add-retry-logic`)
- **bugfix/**: Bug fixes (`bugfix/fix-null-handling`)
- **docs/**: Documentation updates (`docs/update-api-reference`)

### Creating a Feature Branch

```bash
# Update your main branch
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name
```

### Making Changes

1. **Write clear, focused commits:**
```bash
git add .
git commit -m "Add retry logic to IVR mapping service"
```

2. **Keep commits atomic:** Each commit should represent a single logical change

3. **Write descriptive commit messages:**
   - Use present tense ("Add feature" not "Added feature")
   - Keep first line under 72 characters
   - Add detailed description if needed

### Code Style

- **TypeScript**: Follow existing code style
- **Formatting**: Use consistent indentation (2 spaces)
- **Naming**: Use camelCase for variables/functions, PascalCase for classes
- **Comments**: Add comments for complex logic
- **Types**: Always use TypeScript types, avoid `any`

### Testing Your Changes

1. **Build the project:**
```bash
npm run build
```

2. **Run the server:**
```bash
npm run dev
```

3. **Test IVR endpoints:**
```bash
# Test mapping
curl -X POST http://localhost:3001/mapIvr \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890"}'

# Test job status
curl http://localhost:3001/mapIvr/{jobId}
```

4. **Verify no regressions:** Test existing functionality still works

## Syncing with Upstream v4.0

Since this project is based on simple-conversation-relay v4.0, you may need to sync with upstream changes.

### Fetch Upstream Updates

```bash
# Add upstream if not already added
git remote add upstream-relay https://github.com/deshartman/simple-conversation-relay.git

# Fetch upstream v4.0
git fetch upstream-relay v4.0

# View changes
git log HEAD..upstream-relay/v4.0 --oneline

# Merge if needed
git merge upstream-relay/v4.0
```

### Conflict Resolution

- IVR-specific files won't conflict (they don't exist in v4.0)
- Keep IVR additions in `server.ts`
- Accept upstream changes to shared services
- Test thoroughly after merging

See [docs/syncing-upstream.md](docs/syncing-upstream.md) for detailed sync procedures.

## Submitting a Pull Request

### Before Submitting

- [ ] Code builds successfully (`npm run build`)
- [ ] Code follows project style guidelines
- [ ] Commit messages are clear and descriptive
- [ ] No unnecessary changes (whitespace, reformatting)
- [ ] Documentation updated if needed

### Create Pull Request

1. **Push your branch:**
```bash
git push origin feature/your-feature-name
```

2. **Open PR on GitHub:**
   - Go to the repository on GitHub
   - Click "New Pull Request"
   - Select your branch
   - Fill out the PR template

3. **PR Description should include:**
   - Clear description of changes
   - Motivation for the changes
   - Testing performed
   - Related issues (if any)

### PR Template

```markdown
## Description
Brief description of what this PR does

## Motivation
Why is this change needed?

## Changes
- List of specific changes made
- Another change

## Testing
How was this tested?

## Checklist
- [ ] Code builds successfully
- [ ] Tested locally
- [ ] Documentation updated
- [ ] No breaking changes (or documented if there are)
```

## Code Review Process

1. Maintainers will review your PR
2. Address any feedback or requested changes
3. Once approved, your PR will be merged
4. Your contribution will be included in the next release

## Reporting Issues

### Bug Reports

When reporting bugs, please include:

- Clear, descriptive title
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details (Node version, OS, etc.)
- Relevant logs or error messages

### Feature Requests

When requesting features, please include:

- Clear description of the feature
- Use case / motivation
- Example usage (if applicable)
- Alternative solutions considered

## Project Structure

```
crelay-ivr-replacement/
├── server/
│   ├── src/
│   │   ├── services/          # Core services
│   │   │   └── IvrMappingService.ts
│   │   ├── interfaces/        # TypeScript interfaces
│   │   ├── tools/            # IVR tools
│   │   │   ├── read_legs.ts
│   │   │   └── write_legs.ts
│   │   └── server.ts         # Main server
│   ├── assets/               # Configuration files
│   └── data/ivr/legs/        # IVR mapping data
├── docs/                     # Documentation
└── README.md
```

## Questions?

- Open an issue for questions
- Check existing issues and documentation first
- Be respectful and constructive

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

Thank you for contributing to Conversation Relay IVR Replacement!
