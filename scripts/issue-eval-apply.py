#!/usr/bin/env python3
"""
Apply issue evaluation results to GitHub project board.

Usage: python3 scripts/issue-eval-apply.py <issue-number> --priority "P2-Medium" --effort "S" --type "Bug" [--update-body-file path]

This script:
1. Finds the project item for the issue (adds to project if needed)
2. Updates Priority, Effort, Type fields on the project board
3. Adds a label based on the type
4. Optionally updates the issue body from a file
"""

import argparse
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scripts.lib.helpers import run, RED, GREEN, BLUE, YELLOW, NC
from scripts.lib.project_config import (
    PRIORITY_FIELD_ID, PRIORITY_OPTIONS,
    EFFORT_FIELD_ID, EFFORT_OPTIONS,
    TYPE_FIELD_ID, TYPE_OPTIONS, TYPE_LABELS,
)
from scripts.lib.project_board import find_project_item, get_project_id, update_field


def add_label(issue_number, type_value):
    """Add a label based on the issue type."""
    label = TYPE_LABELS.get(type_value)
    if not label:
        return
    result, err = run(
        f'gh issue edit {issue_number} --add-label "{label}"',
        check=False
    )
    if result is None:
        print(f"  {YELLOW}Could not add label '{label}': {err}{NC}")
    else:
        print(f"  {GREEN}Label '{label}' added{NC}")


def update_body(issue_number, body_file):
    """Update issue body from a file."""
    result, err = run(
        f'gh issue edit {issue_number} --body-file "{body_file}"',
        check=False
    )
    if result is None:
        print(f"  {RED}Failed to update issue body: {err}{NC}")
        return False
    print(f"  {GREEN}Issue body updated{NC}")
    return True


def main():
    parser = argparse.ArgumentParser(description="Apply issue evaluation to GitHub project board")
    parser.add_argument("issue_number", help="GitHub issue number")
    parser.add_argument("--priority", required=True, choices=list(PRIORITY_OPTIONS.keys()),
                        help="Priority level (P0-Critical, P1-High, P2-Medium, P3-Low)")
    parser.add_argument("--effort", required=True, choices=list(EFFORT_OPTIONS.keys()),
                        help="Effort estimate (XS, S, M, L, XL)")
    parser.add_argument("--type", required=True, choices=list(TYPE_OPTIONS.keys()),
                        help="Issue type (Feature, Bug, Tech Debt, Docs)")
    parser.add_argument("--update-body-file", help="Path to file with updated issue body")

    args = parser.parse_args()

    print(f"{BLUE}Applying evaluation to issue #{args.issue_number}...{NC}")

    # Find project item
    print(f"{BLUE}Finding project item...{NC}")
    item_id, err = find_project_item(args.issue_number)
    if not item_id:
        print(f"{RED}Error: {err}{NC}")
        sys.exit(1)

    # Get project ID
    project_id, err = get_project_id()
    if not project_id:
        print(f"{RED}Error: {err}{NC}")
        sys.exit(1)

    # Update fields
    print(f"{BLUE}Updating project fields...{NC}")
    success = True
    success &= update_field(project_id, item_id, PRIORITY_FIELD_ID,
                            PRIORITY_OPTIONS[args.priority], "Priority")
    success &= update_field(project_id, item_id, EFFORT_FIELD_ID,
                            EFFORT_OPTIONS[args.effort], "Effort")
    success &= update_field(project_id, item_id, TYPE_FIELD_ID,
                            TYPE_OPTIONS[args.type], "Type")

    # Add label
    add_label(args.issue_number, args.type)

    # Update body if requested
    if args.update_body_file:
        print(f"{BLUE}Updating issue body...{NC}")
        update_body(args.issue_number, args.update_body_file)

    # Summary
    print()
    if success:
        print(f"{GREEN}Evaluation applied successfully!{NC}")
    else:
        print(f"{YELLOW}Evaluation applied with some errors (see above){NC}")

    print(f"  Priority: {GREEN}{args.priority}{NC}")
    print(f"  Effort:   {GREEN}{args.effort}{NC}")
    print(f"  Type:     {GREEN}{args.type}{NC}")
    if args.update_body_file:
        print(f"  Body:     {GREEN}Updated{NC}")


if __name__ == '__main__':
    main()
