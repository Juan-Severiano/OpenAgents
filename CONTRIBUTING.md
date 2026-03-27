# Contributing to OpenAgents

Thank you for your interest in contributing to OpenAgents! This document provides guidelines and instructions for contributing to this project.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/OpenAgents.git
   cd OpenAgents
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/Juan-Severiano/OpenAgents.git
   ```

## Development Workflow

### 1. Create a Branch

Always create a new branch for your changes:

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-description
```

Branch naming conventions:
- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation changes
- `refactor/description` - Code refactoring

### 2. Make Your Changes

- Write clean, maintainable code
- Follow the existing code style
- Add tests for new functionality
- Update documentation as needed

### 3. Commit Your Changes

We use **Conventional Commits** for commit messages:

```bash
# Format: <type>(<scope>): <description>
# Examples:
git commit -m "feat(auth): add user authentication"
git commit -m "fix(api): resolve null pointer exception"
git commit -m "docs(readme): update installation instructions"
git commit -m "refactor(core): simplify data processing logic"
git commit -m "test(utils): add unit tests for helpers"
git commit -m "chore(deps): update dependencies"
```

#### Commit Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `style` | Code style changes (formatting, semicolons, etc.) |
| `refactor` | Code refactoring |
| `perf` | Performance improvements |
| `test` | Adding or updating tests |
| `chore` | Build process or auxiliary tool changes |
| `ci` | CI/CD changes |

### 4. Keep Your Branch Updated

```bash
git fetch upstream
git rebase upstream/main
# or if you prefer merge:
git merge upstream/main
```

### 5. Push Your Changes

```bash
git push origin feature/your-feature-name
```

### 6. Open a Pull Request

1. Go to the original repository on GitHub
2. Click "New Pull Request"
3. Select your fork and branch
4. Fill out the PR template
5. Submit the PR

## Pull Request Guidelines

- Fill out the PR template completely
- Link related issues using `Fixes #123` or `Closes #456`
- Ensure all CI checks pass
- Request review from maintainers
- Be responsive to feedback

## Code Style

- Follow the existing code style in the project
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions focused and small

## Testing

- Write tests for new features
- Ensure existing tests pass
- Run the test suite before submitting:
  ```bash
  # Backend tests
  cd backend && npm test
  
  # Frontend tests
  cd frontend && npm test
  ```

## Reporting Issues

When reporting issues, please use the appropriate issue template and include:

- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version, etc.)
- Screenshots if applicable

## Questions?

Feel free to open an issue for questions or join our discussions.

Thank you for contributing! 🚀
