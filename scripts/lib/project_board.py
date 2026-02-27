"""Shared GitHub Project board operations.

Provides reusable functions for interacting with the GitHub Project board:
finding items, updating fields, and changing status.
"""

import json

from .helpers import run, RED, GREEN, YELLOW, NC
from .project_config import (
    PROJECT_NUMBER, PROJECT_OWNER, REPO_NAME,
    STATUS_FIELD_ID, STATUS_OPTIONS,
)


def find_project_item(issue_number):
    """Find the project item ID for an issue, adding it to the project if needed.

    Args:
        issue_number: GitHub issue number (string or int)

    Returns:
        Tuple of (item_id, error). item_id is None on failure.
    """
    items_json, err = run(
        f'gh project item-list {PROJECT_NUMBER} --owner {PROJECT_OWNER} '
        f'--format json --limit 500',
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
        f'--url "https://github.com/{PROJECT_OWNER}/{REPO_NAME}/issues/{issue_number}"',
        check=False
    )
    if add_result is None:
        return None, f"Could not add issue to project: {err}"

    # Fetch items again to get the new item ID
    items_json, _ = run(
        f'gh project item-list {PROJECT_NUMBER} --owner {PROJECT_OWNER} '
        f'--format json --limit 500',
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
    """Get the project ID from GitHub.

    Returns:
        Tuple of (project_id, error). project_id is None on failure.
    """
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
    """Update a single-select field on a project item.

    Args:
        project_id: The GitHub project node ID
        item_id: The project item node ID
        field_id: The field to update
        option_id: The option to select
        field_name: Human-readable field name for logging

    Returns:
        True on success, False on failure.
    """
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


def update_project_status(issue_number, status):
    """Update issue status on the GitHub Project board.

    Args:
        issue_number: GitHub issue number (string or int)
        status: Status name (must be a key in STATUS_OPTIONS, e.g. "In Progress")

    Returns:
        Tuple of (success, message).
    """
    option_id = STATUS_OPTIONS.get(status)
    if not option_id:
        return False, f"Unknown status: {status}. Valid: {list(STATUS_OPTIONS.keys())}"

    # Find project item
    item_id, err = find_project_item(issue_number)
    if not item_id:
        return False, err

    # Get project ID
    project_id, err = get_project_id()
    if not project_id:
        return False, err

    # Update the status field
    result, err = run(
        f'gh project item-edit --project-id {project_id} --id {item_id} '
        f'--field-id {STATUS_FIELD_ID} --single-select-option-id {option_id}',
        check=False
    )

    if result is None and err:
        return False, f"Failed to update status: {err}"

    return True, f"Status updated to {status}"


