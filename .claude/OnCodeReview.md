# Code Review Guidelines

This content is injected when you use the `!code-review` command.

## Review Focus Areas

[TODO: Customize review priorities for your project]

Example areas to review:
1. **Correctness**: Does the code do what it's supposed to do?
2. **Security**: Are there any security vulnerabilities?
3. **Performance**: Are there obvious performance issues?
4. **Maintainability**: Is the code readable and maintainable?
5. **Testing**: Are tests adequate and meaningful?
6. **Documentation**: Is the code properly documented?

## Code Review Checklist

[TODO: Customize this checklist]

### Functionality
- [ ] Code implements requirements correctly
- [ ] Edge cases are handled
- [ ] Error handling is appropriate
- [ ] No obvious bugs or logical errors

### Code Quality
- [ ] Code follows project style guide
- [ ] Functions/methods are appropriately sized
- [ ] Variable/function names are clear and descriptive
- [ ] No code duplication (DRY principle)
- [ ] Proper separation of concerns

### Security
- [ ] Input validation is present
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities
- [ ] Sensitive data is not logged
- [ ] Authentication/authorization is correct

### Performance
- [ ] No obvious performance bottlenecks
- [ ] Database queries are efficient
- [ ] Appropriate use of caching
- [ ] No unnecessary computations

### Testing
- [ ] Unit tests cover new/modified code
- [ ] Tests are meaningful and not just for coverage
- [ ] Integration tests added where appropriate
- [ ] All tests pass

### Documentation
- [ ] Code comments explain "why" not "what"
- [ ] Public APIs are documented
- [ ] README updated if needed
- [ ] Inline documentation for complex logic

## Review Approach

[TODO: Define how reviews should be conducted]

Example:
1. Read the code without running it first
2. Understand the context and requirements
3. Check for common anti-patterns
4. Run tests and verify they pass
5. Look for opportunities to simplify
6. Provide constructive feedback
7. Suggest improvements, don't just criticize

## Common Issues to Watch For

[TODO: List project-specific common issues]

Example:
- Hardcoded configuration values
- Missing error boundaries
- Unhandled promise rejections
- Memory leaks
- Race conditions
- Insufficient logging
