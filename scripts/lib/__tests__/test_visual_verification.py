"""Unit tests for scripts/lib/visual_verification.py"""

import unittest
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from lib.visual_verification import parse_visual_verification


class TestParseVisualVerification(unittest.TestCase):
    """Test parse_visual_verification() function."""

    def test_returns_none_for_empty_body(self):
        """Empty body should return None."""
        self.assertIsNone(parse_visual_verification(None))
        self.assertIsNone(parse_visual_verification(''))

    def test_returns_none_when_no_section(self):
        """Body without Visual Verification section should return None."""
        body = """## Summary
        Some summary here.

        ## Requirements
        - Requirement 1
        - Requirement 2
        """
        self.assertIsNone(parse_visual_verification(body))

    def test_parses_simple_route_list(self):
        """Parses simple list of routes."""
        body = """## Summary
        Some summary.

        ## Visual Verification
        - /editor
        - /repl
        - /settings

        ## Other Section
        More content.
        """
        result = parse_visual_verification(body)
        self.assertIsNotNone(result)
        self.assertEqual(result['routes'], ['/editor', '/repl', '/settings'])

    def test_parses_routes_with_descriptions(self):
        """Parses routes that have descriptions after them."""
        body = """## Visual Verification
        - /editor - Editor page initial state
        - /repl - REPL with prompt visible
        """
        result = parse_visual_verification(body)
        self.assertIsNotNone(result)
        self.assertEqual(result['routes'], ['/editor', '/repl'])

    def test_parses_routes_with_asterisk_bullets(self):
        """Parses routes with * bullet points."""
        body = """## Visual Verification
        * /editor
        * /repl
        """
        result = parse_visual_verification(body)
        self.assertIsNotNone(result)
        self.assertEqual(result['routes'], ['/editor', '/repl'])

    def test_extracts_notes(self):
        """Extracts non-route notes from the section."""
        body = """## Visual Verification
        - /editor
        - Should show welcome screen when no files open
        - /repl
        - REPL should have focus
        """
        result = parse_visual_verification(body)
        self.assertIsNotNone(result)
        self.assertEqual(result['routes'], ['/editor', '/repl'])
        self.assertIn('Should show welcome screen when no files open', result['notes'])
        self.assertIn('REPL should have focus', result['notes'])

    def test_case_insensitive_header(self):
        """Section header matching should be case-insensitive."""
        body = """## VISUAL VERIFICATION
        - /editor
        """
        result = parse_visual_verification(body)
        self.assertIsNotNone(result)
        self.assertEqual(result['routes'], ['/editor'])

        body2 = """## visual verification
        - /repl
        """
        result2 = parse_visual_verification(body2)
        self.assertIsNotNone(result2)
        self.assertEqual(result2['routes'], ['/repl'])

    def test_stops_at_next_section(self):
        """Parsing stops at the next ## section."""
        body = """## Visual Verification
        - /editor

        ## Requirements
        - /not-a-route
        - Some requirement
        """
        result = parse_visual_verification(body)
        self.assertIsNotNone(result)
        self.assertEqual(result['routes'], ['/editor'])
        self.assertNotIn('/not-a-route', result['routes'])

    def test_handles_nested_paths(self):
        """Parses routes with nested paths."""
        body = """## Visual Verification
        - /editor/files
        - /settings/appearance
        """
        result = parse_visual_verification(body)
        self.assertIsNotNone(result)
        self.assertEqual(result['routes'], ['/editor/files', '/settings/appearance'])

    def test_returns_empty_result_for_empty_section(self):
        """Empty Visual Verification section returns empty dict, not None."""
        body = """## Visual Verification

## Next Section
Content here.
"""
        result = parse_visual_verification(body)
        self.assertIsNotNone(result)
        self.assertEqual(result['routes'], [])
        self.assertEqual(result['notes'], [])

    def test_handles_section_at_end_of_body(self):
        """Parses section when it's at the end of the body."""
        body = """## Summary
        Some summary.

        ## Visual Verification
        - /editor
        - /repl"""
        result = parse_visual_verification(body)
        self.assertIsNotNone(result)
        self.assertEqual(result['routes'], ['/editor', '/repl'])

    def test_ignores_subheaders(self):
        """Ignores ### subheaders within the section."""
        body = """## Visual Verification
        ### Routes
        - /editor
        - /repl

        ### Expected Behavior
        - Editor loads correctly
        """
        result = parse_visual_verification(body)
        self.assertIsNotNone(result)
        self.assertEqual(result['routes'], ['/editor', '/repl'])
        # "Editor loads correctly" should be in notes
        self.assertIn('Editor loads correctly', result['notes'])

    def test_handles_whitespace_variations(self):
        """Handles various whitespace in routes."""
        body = """## Visual Verification
        -  /editor
        -   /repl
        - /settings
        """
        result = parse_visual_verification(body)
        self.assertIsNotNone(result)
        self.assertEqual(result['routes'], ['/editor', '/repl', '/settings'])

    def test_root_route(self):
        """Handles root route /."""
        body = """## Visual Verification
        - /
        - /editor
        """
        result = parse_visual_verification(body)
        self.assertIsNotNone(result)
        self.assertIn('/', result['routes'])
        self.assertIn('/editor', result['routes'])


class TestParseVisualVerificationIntegration(unittest.TestCase):
    """Integration-style tests with realistic issue bodies."""

    def test_realistic_issue_body(self):
        """Test with a realistic full issue body."""
        body = """## Summary
Add a new settings panel with theme options.

## Requirements
- Dark mode toggle
- Font size selector
- Auto-save preference

## Visual Verification
- /editor - Shows editor with default theme
- /settings - Settings panel with all options visible

## Acceptance Criteria
- [ ] Settings persist across sessions
- [ ] Theme changes apply immediately
"""
        result = parse_visual_verification(body)
        self.assertIsNotNone(result)
        self.assertEqual(len(result['routes']), 2)
        self.assertIn('/editor', result['routes'])
        self.assertIn('/settings', result['routes'])

    def test_issue_without_visual_verification(self):
        """Test with issue that has no visual verification section."""
        body = """## Summary
Fix bug in file parser.

## Requirements
- Handle edge case in parsing
- Add error handling

## Acceptance Criteria
- [ ] Bug is fixed
- [ ] Tests pass
"""
        result = parse_visual_verification(body)
        self.assertIsNone(result)


if __name__ == '__main__':
    unittest.main()
