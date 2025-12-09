"""Unit tests for get_changed_files() helper function."""

import unittest
from pathlib import Path
from unittest.mock import patch

import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from lib.helpers import get_changed_files


class TestGetChangedFiles(unittest.TestCase):
    """Test get_changed_files() function."""

    @patch('lib.helpers.run')
    def test_returns_list_of_changed_files(self, mock_run):
        """get_changed_files() should return list of files changed between branches."""
        mock_run.return_value = ('src/file1.ts\nsrc/file2.tsx\nREADME.md', '')

        files = get_changed_files('main')

        self.assertEqual(files, ['src/file1.ts', 'src/file2.tsx', 'README.md'])
        mock_run.assert_called_once_with('git diff --name-only main...HEAD', check=False)

    @patch('lib.helpers.run')
    def test_returns_empty_list_when_no_changes(self, mock_run):
        """get_changed_files() should return empty list when no changes."""
        mock_run.return_value = ('', '')

        files = get_changed_files('main')

        self.assertEqual(files, [])

    @patch('lib.helpers.run')
    def test_handles_custom_base_branch(self, mock_run):
        """get_changed_files() should use provided base branch."""
        mock_run.return_value = ('file.ts', '')

        files = get_changed_files('epic-58')

        mock_run.assert_called_once_with('git diff --name-only epic-58...HEAD', check=False)

    @patch('lib.helpers.run')
    def test_handles_git_error(self, mock_run):
        """get_changed_files() should return empty list on git error."""
        mock_run.return_value = (None, 'fatal: not a git repository')

        files = get_changed_files('main')

        self.assertEqual(files, [])


if __name__ == '__main__':
    unittest.main()
