"""Manual testing checklist generation for PR descriptions.

This module analyzes changed files and generates appropriate manual testing
checklist items based on the types of changes detected.
"""

import re
from pathlib import Path


# File patterns and their categories
# Order matters - more specific patterns should come first
FILE_PATTERNS = [
    # Test files (check first to avoid matching hooks/components in __tests__)
    (r'.*\.(test|spec)\.(ts|tsx|js|jsx)$', 'test'),
    (r'e2e/.*\.(ts|js)$', 'test'),
    (r'.*__tests__/.*$', 'test'),
    # UI components (React TSX in components directory)
    (r'src/components/.*\.tsx$', 'ui'),
    # Hooks
    (r'src/hooks/.*\.ts$', 'interaction'),
    # CSS files
    (r'.*\.(css|scss|module\.css)$', 'visual'),
    # Pages
    (r'src/pages/.*\.tsx$', 'page'),
    # Config files
    (r'(vite|tsconfig|eslint|prettier|package).*\.(json|js|ts|cjs|mjs)$', 'config'),
    (r'\.(eslintrc|prettierrc).*$', 'config'),
    # Script files
    (r'scripts/.*\.py$', 'script'),
    # Documentation
    (r'.*\.md$', 'docs'),
    (r'\.claude/.*$', 'docs'),
]


def categorize_file(file_path):
    """Categorize a file based on its path and type.

    Args:
        file_path: The file path to categorize

    Returns:
        Category string ('ui', 'interaction', 'visual', 'page', 'config',
        'test', 'script', 'docs') or None if unknown.
    """
    # Normalize path separators
    normalized_path = file_path.replace('\\', '/')

    for pattern, category in FILE_PATTERNS:
        if re.search(pattern, normalized_path, re.IGNORECASE):
            return category

    return None


def _extract_component_name(file_path):
    """Extract a readable component/module name from a file path."""
    path = Path(file_path)
    name = path.stem

    # Remove common suffixes
    for suffix in ['.test', '.spec', '.module']:
        if name.endswith(suffix.replace('.', '')):
            name = name[:-len(suffix.replace('.', ''))]

    return name


def generate_manual_testing_checklist(changed_files):
    """Generate a manual testing checklist based on changed files.

    Args:
        changed_files: List of file paths that have changed

    Returns:
        Markdown string with categorized manual testing checklist items.
    """
    if not changed_files:
        return "- [ ] No significant changes detected - verify build works"

    # Categorize all files
    categories = {
        'ui': [],
        'interaction': [],
        'visual': [],
        'page': [],
        'config': [],
        'test': [],
        'script': [],
        'docs': [],
    }

    for file_path in changed_files:
        category = categorize_file(file_path)
        if category:
            categories[category].append(file_path)

    # Check for special cases
    non_test_changes = sum(
        len(files) for cat, files in categories.items()
        if cat not in ('test', 'docs', 'script')
    )

    # Test-only changes
    if non_test_changes == 0 and categories['test']:
        return "- [ ] Test-only changes - verify tests pass, minimal manual testing needed"

    # Docs-only changes
    if non_test_changes == 0 and categories['docs'] and not categories['test']:
        return "- [ ] Documentation-only changes - no manual testing required"

    # Build the checklist
    sections = []

    # UI Changes
    if categories['ui']:
        items = []
        for f in categories['ui']:
            name = _extract_component_name(f)
            items.append(f"  - [ ] Verify `{name}` renders correctly")
        sections.append("**UI Changes:**\n" + "\n".join(items))

    # User Interactions
    if categories['interaction']:
        items = []
        for f in categories['interaction']:
            name = _extract_component_name(f)
            items.append(f"  - [ ] Test `{name}` behavior in affected components")
        sections.append("**User Interactions:**\n" + "\n".join(items))

    # Visual Changes
    if categories['visual']:
        items = ["  - [ ] Check styling changes visually across affected components"]
        sections.append("**Visual Changes:**\n" + "\n".join(items))

    # Page Changes
    if categories['page']:
        items = []
        for f in categories['page']:
            name = _extract_component_name(f)
            items.append(f"  - [ ] Navigate to `{name}` page and verify functionality")
        sections.append("**Page Changes:**\n" + "\n".join(items))

    # Config Changes
    if categories['config']:
        items = [
            "  - [ ] Verify dev server starts correctly",
            "  - [ ] Verify build succeeds",
        ]
        sections.append("**Config Changes:**\n" + "\n".join(items))

    # Script Changes
    if categories['script'] and not sections:
        items = ["  - [ ] Verify affected scripts work correctly"]
        sections.append("**Script Changes:**\n" + "\n".join(items))

    if not sections:
        return "- [ ] No significant changes detected - verify build works"

    return "\n\n".join(sections)
