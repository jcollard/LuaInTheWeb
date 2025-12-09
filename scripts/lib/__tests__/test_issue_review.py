"""Unit tests for epic sub-issue detection in issue-review.py"""

import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock

import sys
import importlib.util
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

# Import issue-review.py (hyphenated name requires special import)
spec = importlib.util.spec_from_file_location(
    "issue_review",
    Path(__file__).parent.parent.parent / "issue-review.py"
)
issue_review = importlib.util.module_from_spec(spec)
spec.loader.exec_module(issue_review)
detect_epic_parent = issue_review.detect_epic_parent
get_issue_body = issue_review.get_issue_body


class TestDetectEpicParent(unittest.TestCase):
    """Test detect_epic_parent() function."""

    def test_detects_part_of_marker(self):
        """detect_epic_parent() should find 'Part of #N' pattern."""
        body = """## Description
Some description here.

## Parent Issue
Part of #58
"""
        result = detect_epic_parent(body)
        self.assertEqual(result, "58")

    def test_detects_parent_colon_marker(self):
        """detect_epic_parent() should find 'Parent: #N' pattern."""
        body = """## Description
Parent: #42

Some more text.
"""
        result = detect_epic_parent(body)
        self.assertEqual(result, "42")

    def test_detects_epic_colon_marker(self):
        """detect_epic_parent() should find 'Epic: #N' pattern."""
        body = """Epic: #100

## Details
Implementation details here.
"""
        result = detect_epic_parent(body)
        self.assertEqual(result, "100")

    def test_returns_none_for_no_markers(self):
        """detect_epic_parent() should return None when no epic markers found."""
        body = """## Description
This is a standalone issue with no epic references.

## Acceptance Criteria
- [ ] Do something
"""
        result = detect_epic_parent(body)
        self.assertIsNone(result)

    def test_returns_none_for_empty_body(self):
        """detect_epic_parent() should return None for empty body."""
        result = detect_epic_parent("")
        self.assertIsNone(result)

    def test_returns_none_for_none_body(self):
        """detect_epic_parent() should return None for None body."""
        result = detect_epic_parent(None)
        self.assertIsNone(result)

    def test_uses_first_match_when_multiple_markers(self):
        """detect_epic_parent() should use first match when multiple markers exist."""
        body = """Part of #58

Also related to:
Parent: #99
Epic: #200
"""
        result = detect_epic_parent(body)
        self.assertEqual(result, "58")

    def test_case_insensitive_matching(self):
        """detect_epic_parent() should match markers case-insensitively."""
        body = "PART OF #77"
        result = detect_epic_parent(body)
        self.assertEqual(result, "77")

    def test_handles_whitespace_variations(self):
        """detect_epic_parent() should handle various whitespace around markers."""
        body = "  Part of  #  33  "
        result = detect_epic_parent(body)
        self.assertEqual(result, "33")


class TestGetIssueBody(unittest.TestCase):
    """Test get_issue_body() function."""

    def test_returns_body_on_success(self):
        """get_issue_body() should return issue body when gh command succeeds."""
        with patch.object(issue_review, 'run') as mock_run:
            mock_run.return_value = ('{"body": "Test body content"}', None)

            result = get_issue_body("123")

            self.assertEqual(result, "Test body content")
            mock_run.assert_called_once()

    def test_returns_none_on_failure(self):
        """get_issue_body() should return None when gh command fails."""
        with patch.object(issue_review, 'run') as mock_run:
            mock_run.return_value = (None, "Error fetching issue")

            result = get_issue_body("999")

            self.assertIsNone(result)

    def test_returns_none_for_empty_body(self):
        """get_issue_body() should return None when issue body is empty."""
        with patch.object(issue_review, 'run') as mock_run:
            mock_run.return_value = ('{"body": ""}', None)

            result = get_issue_body("123")

            self.assertIsNone(result)

    def test_returns_none_for_null_body(self):
        """get_issue_body() should return None when issue body is null."""
        with patch.object(issue_review, 'run') as mock_run:
            mock_run.return_value = ('{"body": null}', None)

            result = get_issue_body("123")

            self.assertIsNone(result)


class TestAutoDetectEpicBase(unittest.TestCase):
    """Test auto_detect_epic_base() function for --base auto-detection."""

    def test_returns_epic_branch_when_sub_issue_detected(self):
        """auto_detect_epic_base() should return epic-N when sub-issue detected."""
        body = "Part of #58"
        result = issue_review.auto_detect_epic_base(body, user_base=None)
        self.assertEqual(result, ("epic-58", None))

    def test_returns_none_when_no_epic_marker(self):
        """auto_detect_epic_base() should return None when not a sub-issue."""
        body = "Regular issue without epic markers"
        result = issue_review.auto_detect_epic_base(body, user_base=None)
        self.assertEqual(result, (None, None))

    def test_returns_user_base_when_matches_epic(self):
        """auto_detect_epic_base() should accept user --base when it matches epic."""
        body = "Part of #58"
        result = issue_review.auto_detect_epic_base(body, user_base="epic-58")
        self.assertEqual(result, ("epic-58", None))

    def test_returns_warning_when_user_base_conflicts(self):
        """auto_detect_epic_base() should warn when user --base conflicts with epic."""
        body = "Part of #58"
        result = issue_review.auto_detect_epic_base(body, user_base="main")
        base, warning = result
        self.assertEqual(base, "epic-58")
        self.assertIn("epic-58", warning)
        self.assertIn("main", warning)

    def test_returns_warning_when_user_base_is_wrong_epic(self):
        """auto_detect_epic_base() should warn when user --base is wrong epic."""
        body = "Part of #58"
        result = issue_review.auto_detect_epic_base(body, user_base="epic-99")
        base, warning = result
        self.assertEqual(base, "epic-58")
        self.assertIn("epic-58", warning)
        self.assertIn("epic-99", warning)

    def test_handles_none_body(self):
        """auto_detect_epic_base() should handle None body gracefully."""
        result = issue_review.auto_detect_epic_base(None, user_base=None)
        self.assertEqual(result, (None, None))

    def test_user_base_used_when_no_epic_detected(self):
        """auto_detect_epic_base() should use user --base when no epic detected."""
        body = "Regular issue"
        result = issue_review.auto_detect_epic_base(body, user_base="feature-branch")
        self.assertEqual(result, ("feature-branch", None))


if __name__ == '__main__':
    unittest.main()
