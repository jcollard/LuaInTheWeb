"""Unit tests for scripts/lib/helpers.py"""

import unittest
import tempfile
import os
from pathlib import Path
from unittest.mock import patch, MagicMock

import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from lib.helpers import (
    RED, GREEN, YELLOW, BLUE, NC,
    run, read_file_content,
)


class TestANSIColors(unittest.TestCase):
    """Test ANSI color constants."""

    def test_red_is_ansi_escape(self):
        """RED should be a valid ANSI escape sequence."""
        self.assertTrue(RED.startswith('\033['))
        self.assertIn('31', RED)

    def test_green_is_ansi_escape(self):
        """GREEN should be a valid ANSI escape sequence."""
        self.assertTrue(GREEN.startswith('\033['))
        self.assertIn('32', GREEN)

    def test_yellow_is_ansi_escape(self):
        """YELLOW should be a valid ANSI escape sequence."""
        self.assertTrue(YELLOW.startswith('\033['))
        self.assertIn('33', YELLOW)

    def test_blue_is_ansi_escape(self):
        """BLUE should be a valid ANSI escape sequence."""
        self.assertTrue(BLUE.startswith('\033['))
        self.assertIn('34', BLUE)

    def test_nc_resets_color(self):
        """NC should reset ANSI colors."""
        self.assertEqual(NC, '\033[0m')


class TestRun(unittest.TestCase):
    """Test run() function."""

    def test_run_successful_command(self):
        """run() should return output for successful commands."""
        output, err = run('echo hello')
        self.assertEqual(output, 'hello')

    def test_run_failed_command_with_check(self):
        """run() should return None for failed commands when check=True."""
        output, err = run('exit 1', check=True)
        self.assertIsNone(output)

    def test_run_failed_command_without_check(self):
        """run() should return output even for failed commands when check=False."""
        output, err = run('echo hello && exit 1', check=False)
        # The output should still be captured even with exit code 1
        self.assertIsNotNone(output)

    def test_run_with_cwd(self):
        """run() should execute command in specified directory."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create a file in the temp directory
            test_file = Path(tmpdir) / 'test.txt'
            test_file.write_text('content')

            # Run ls/dir in that directory
            if os.name == 'nt':
                output, _ = run('dir /b', cwd=tmpdir, check=False)
            else:
                output, _ = run('ls', cwd=tmpdir)

            self.assertIn('test.txt', output)


class TestReadFileContent(unittest.TestCase):
    """Test read_file_content() function."""

    def test_read_existing_file(self):
        """read_file_content() should return content of existing file."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write('test content')
            f.flush()
            temp_path = f.name

        try:
            content = read_file_content(temp_path)
            self.assertEqual(content, 'test content')
        finally:
            os.unlink(temp_path)

    def test_read_nonexistent_file(self):
        """read_file_content() should return None for nonexistent file."""
        content = read_file_content('/nonexistent/path/to/file.txt')
        self.assertIsNone(content)

    def test_read_empty_file(self):
        """read_file_content() should return None for empty file."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write('')
            f.flush()
            temp_path = f.name

        try:
            content = read_file_content(temp_path)
            self.assertIsNone(content)
        finally:
            os.unlink(temp_path)

    def test_read_whitespace_only_file(self):
        """read_file_content() should return None for whitespace-only file."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write('   \n\n   ')
            f.flush()
            temp_path = f.name

        try:
            content = read_file_content(temp_path)
            self.assertIsNone(content)
        finally:
            os.unlink(temp_path)

    def test_read_none_path(self):
        """read_file_content() should return None for None path."""
        content = read_file_content(None)
        self.assertIsNone(content)

    def test_read_file_strips_whitespace(self):
        """read_file_content() should strip leading/trailing whitespace."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write('  content with spaces  \n')
            f.flush()
            temp_path = f.name

        try:
            content = read_file_content(temp_path)
            self.assertEqual(content, 'content with spaces')
        finally:
            os.unlink(temp_path)

    def test_read_file_with_unicode(self):
        """read_file_content() should handle Unicode content."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as f:
            f.write('Hello, 世界! 🎉')
            f.flush()
            temp_path = f.name

        try:
            content = read_file_content(temp_path)
            self.assertEqual(content, 'Hello, 世界! 🎉')
        finally:
            os.unlink(temp_path)


if __name__ == '__main__':
    unittest.main()
