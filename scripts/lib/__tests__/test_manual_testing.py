"""Unit tests for scripts/lib/manual_testing.py"""

import unittest
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from lib.manual_testing import generate_manual_testing_checklist, categorize_file


class TestCategorizeFile(unittest.TestCase):
    """Test categorize_file() function."""

    def test_component_tsx_files(self):
        """Component TSX files should be categorized as UI changes."""
        self.assertEqual(categorize_file('src/components/Button.tsx'), 'ui')
        self.assertEqual(categorize_file('src/components/Modal/Modal.tsx'), 'ui')

    def test_hook_files(self):
        """Hook files should be categorized as user interactions."""
        self.assertEqual(categorize_file('src/hooks/useAuth.ts'), 'interaction')
        self.assertEqual(categorize_file('src/hooks/useLuaEngine.ts'), 'interaction')

    def test_css_module_files(self):
        """CSS module files should be categorized as visual changes."""
        self.assertEqual(categorize_file('src/components/Button.module.css'), 'visual')
        self.assertEqual(categorize_file('src/styles/theme.css'), 'visual')

    def test_page_files(self):
        """Page files should be categorized as page changes."""
        self.assertEqual(categorize_file('src/pages/Home.tsx'), 'page')
        self.assertEqual(categorize_file('src/pages/Settings/index.tsx'), 'page')

    def test_config_files(self):
        """Config files should be categorized as config changes."""
        self.assertEqual(categorize_file('vite.config.ts'), 'config')
        self.assertEqual(categorize_file('tsconfig.json'), 'config')
        self.assertEqual(categorize_file('.eslintrc.js'), 'config')

    def test_test_files(self):
        """Test files should be categorized as test-only."""
        self.assertEqual(categorize_file('src/__tests__/Button.test.tsx'), 'test')
        self.assertEqual(categorize_file('src/hooks/__tests__/useAuth.test.ts'), 'test')
        self.assertEqual(categorize_file('e2e/login.spec.ts'), 'test')

    def test_script_files(self):
        """Script files should be categorized as script changes."""
        self.assertEqual(categorize_file('scripts/build.py'), 'script')
        self.assertEqual(categorize_file('scripts/lib/helpers.py'), 'script')

    def test_markdown_files(self):
        """Markdown files should be categorized as docs."""
        self.assertEqual(categorize_file('README.md'), 'docs')
        self.assertEqual(categorize_file('docs/architecture.md'), 'docs')
        self.assertEqual(categorize_file('.claude/commands/issue.md'), 'docs')

    def test_unknown_files(self):
        """Unknown file types should return None."""
        self.assertIsNone(categorize_file('random.xyz'))

    def test_pattern_order_priority(self):
        """Files matching multiple patterns should match the first (most specific) pattern.

        Pattern order matters - test patterns come before hook/component patterns
        to ensure test files in those directories are correctly categorized.
        """
        # This file matches both __tests__ pattern (test) and hooks pattern (interaction)
        # Should return 'test' because test patterns are checked first
        self.assertEqual(categorize_file('src/hooks/__tests__/useAuth.test.ts'), 'test')

        # This file matches both .test.tsx pattern (test) and components pattern (ui)
        # Should return 'test' because test patterns are checked first
        self.assertEqual(categorize_file('src/components/__tests__/Button.test.tsx'), 'test')

        # Verify non-test files in same directories get correct category
        self.assertEqual(categorize_file('src/hooks/useAuth.ts'), 'interaction')
        self.assertEqual(categorize_file('src/components/Button.tsx'), 'ui')


class TestGenerateManualTestingChecklist(unittest.TestCase):
    """Test generate_manual_testing_checklist() function."""

    def test_empty_file_list(self):
        """Empty file list should return minimal checklist."""
        result = generate_manual_testing_checklist([])
        self.assertIn('No significant changes detected', result)

    def test_ui_component_changes(self):
        """UI component changes should generate UI testing items."""
        files = ['src/components/Button.tsx', 'src/components/Modal.tsx']
        result = generate_manual_testing_checklist(files)
        self.assertIn('UI Changes', result)
        self.assertIn('Button', result)
        self.assertIn('Modal', result)
        self.assertIn('[ ]', result)  # Should have checkboxes

    def test_hook_changes(self):
        """Hook changes should generate interaction testing items."""
        files = ['src/hooks/useAuth.ts']
        result = generate_manual_testing_checklist(files)
        self.assertIn('User Interactions', result)
        self.assertIn('useAuth', result)

    def test_visual_changes(self):
        """CSS changes should generate visual testing items."""
        files = ['src/components/Button.module.css']
        result = generate_manual_testing_checklist(files)
        self.assertIn('Visual Changes', result)

    def test_page_changes(self):
        """Page changes should generate navigation testing items."""
        files = ['src/pages/Home.tsx']
        result = generate_manual_testing_checklist(files)
        self.assertIn('Page Changes', result)
        self.assertIn('Home', result)

    def test_test_only_changes(self):
        """Test-only changes should note minimal manual testing needed."""
        files = ['src/__tests__/Button.test.tsx', 'e2e/login.spec.ts']
        result = generate_manual_testing_checklist(files)
        self.assertIn('test-only', result.lower())

    def test_mixed_changes(self):
        """Mixed changes should generate multiple categories."""
        files = [
            'src/components/Button.tsx',
            'src/hooks/useAuth.ts',
            'src/components/Button.module.css'
        ]
        result = generate_manual_testing_checklist(files)
        self.assertIn('UI Changes', result)
        self.assertIn('User Interactions', result)
        self.assertIn('Visual Changes', result)

    def test_config_changes(self):
        """Config changes should generate build verification items."""
        files = ['vite.config.ts', 'tsconfig.json']
        result = generate_manual_testing_checklist(files)
        self.assertIn('Config', result)

    def test_docs_only_changes(self):
        """Docs-only changes should note no manual testing needed."""
        files = ['README.md', 'docs/guide.md']
        result = generate_manual_testing_checklist(files)
        self.assertIn('documentation', result.lower())


if __name__ == '__main__':
    unittest.main()
