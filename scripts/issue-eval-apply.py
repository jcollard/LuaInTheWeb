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
import json
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scripts.lib.helpers import run, get_temp_dir, RED, GREEN, BLUE, YELLOW, NC

# Project configuration
PROJECT_NUMBER = 3
PROJECT_OWNER = "jcollard"
PROJECT_ID = "PVT_kwHOADXapM4BKKH8"

# Field IDs and option mappings
PRIORITY_FIELD_ID = "PVTSSF_lAHOADXapM4BKKH8zg6G6Y4"
PRIORITY_OPTIONS = {
    "P0-Critical": "6959573a",
    "P1-High": "1aaa3eba",
    "P2-Medium": "db5c9ee4",
    "P3-Low": "05293cbc",
}

EFFORT_FIELD_ID = "PVTSSF_lAHOADXapM4BKKH8zg6G6Y8"
EFFORT_OPTIONS = {
    "XS": "cec6e7fb",
    "S": "cd99538a",
    "M": "fe8d3824",
    "L": "526971d0",
    "XL": "c4a28a01",
}

TYPE_FIELD_ID = "PVTSSF_lAHOADXapM4BKKH8zg6G6ZA"
TYPE_OPTIONS = {
    "Feature": "f719849f",
    "Bug": "ff58b733",
    "Tech Debt": "7ab66055",
    "Docs": "b7c57bb8",
}

TYPE_LABELS = {
    "Feature": "enhancement",
    "Bug": "bug",
    "Tech Debt": "tech-debt",
    "Docs": "documentation",
}


def find_project_item(issue_number):
    """Find the project item ID for an issue, adding it to the project if needed."""
    items_json, err = run(
        f'gh project item-list {PROJECT_NUMBER} --owner {PROJECT_OWNER} --format json --limit 500',
        check=False
    )

    if not items_json:
        return None, f"Could not fetch project items: {err}"

    try:
        data = json.loads(items_json)
        items = data.get('items', [])
    except json.JSONDecodeError:
        return None, "Invalid JSON from project"

    # Find the item for this issue
    for item in items:
        content = item.get('content', {})
        if content.get('number') == int(issue_number):
            return item.get('id'), None

    # Issue not in project, try to add it
    print(f"  {YELLOW}Issue not in project, adding...{NC}")
    add_result, err = run(
        f'gh project item-add {PROJECT_NUMBER} --owner {PROJECT_OWNER} '
        f'--url "https://github.com/{PROJECT_OWNER}/LuaInTheWeb/issues/{issue_number}"',
        check=False
    )
    if add_result is None:
        return None, f"Could not add issue to project: {err}"

    # Fetch items again to get the new item ID
    items_json, _ = run(
        f'gh project item-list {PROJECT_NUMBER} --owner {PROJECT_OWNER} --format json --limit 500',
        check=False
    )
    if items_json:
        try:
            data = json.loads(items_json)
            for item in data.get('items', []):
                if item.get('content', {}).get('number') == int(issue_number):
                    return item.get('id'), None
        except json.JSONDecodeError:
            pass

    return None, "Could not find project item ID after adding"


def get_project_id():
    """Get the project ID from GitHub."""
    project_json, err = run(
        f'gh project list --owner {PROJECT_OWNER} --format json',
        check=False
    )

    if not project_json:
        return None, f"Could not fetch projects: {err}"

    try:
        projects = json.loads(project_json)
        for proj in projects.get('projects', []):
            if proj.get('number') == PROJECT_NUMBER:
                return proj.get('id'), None
    except json.JSONDecodeError:
        return None, "Invalid JSON from project list"

    return None, "Could not find project"


def update_field(project_id, item_id, field_id, option_id, field_name):
    """Update a single-select field on a project item."""
    result, err = run(
        f'gh project item-edit --project-id {project_id} --id {item_id} '
        f'--field-id {field_id} --single-select-option-id {option_id}',
        check=False
    )
    if result is None:
        print(f"  {RED}Failed to update {field_name}: {err}{NC}")
        return False
    print(f"  {GREEN}{field_name} updated{NC}")
    return True


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
