#!/usr/bin/env python
"""
Create a commit, push, and open a PR for a GitHub issue.

Usage: python scripts/issue-review.py <issue-number> [options]

Options:
  --summary "..."       PR summary text (inline)
  --summary-file PATH   PR summary from file (recommended for agents)
  --test-plan "..."     Test plan text (inline)
  --test-plan-file PATH Test plan from file (recommended for agents)
  --base BRANCH         Target branch for PR (default: main, use epic-<n> for sub-issues)
  --skip-checks         Skip tests, lint, and build checks
  --dry-run             Show what would happen without doing it

Note: File-based inputs (--summary-file, --test-plan-file) take precedence
over inline arguments and are recommended for agent use to avoid shell
escaping issues.

This script:
1. Validates preconditions (correct branch, not on main, etc.)
2. Runs all checks (tests, lint, build)
3. Creates a commit with standardized message format
4. Pushes to remote
5. Creates a PR linked to the issue
6. Updates project status to "Needs Review"

Safety features:
- Will NOT run on main/master branch
- Will NOT commit if tests fail
- Will NOT push to branches not matching issue pattern
- Requires explicit issue number matching branch
"""

import sys
import re
import json
from pathlib import Path

from lib.helpers import (
    RED, GREEN, YELLOW, BLUE, NC,
    run, get_repo_root, get_temp_dir, get_current_branch,
    get_staged_files, get_unstaged_changes, get_untracked_files,
    read_file_content, run_tests, run_lint, run_build,
    stage_all_changes, push_branch,
)

# Project configuration
PROJECT_NUMBER = 3
PROJECT_OWNER = "jcollard"
REPO_NAME = "LuaInTheWeb"
STATUS_FIELD_ID = "PVTSSF_lAHOADXapM4BKKH8zg6G6Vo"
NEEDS_REVIEW_OPTION_ID = "44687678"


def extract_issue_number_from_branch(branch):
    """Extract issue number from branch name like '10-some-feature'."""
    match = re.match(r'^(\d+)-', branch)
    return match.group(1) if match else None


def get_issue_title(issue_number):
    """Fetch issue title from GitHub."""
    output, _ = run(f'gh issue view {issue_number} --json title --jq ".title"', check=False)
    return output if output else None


def create_commit(issue_number, issue_title):
    """Create a commit with standardized message."""
    # Sanitize issue title for commit message
    clean_title = re.sub(r'^\[(Tech Debt|Roadmap|BUG)\]\s*', '', issue_title, flags=re.IGNORECASE)

    commit_message = f"""feat(#{issue_number}): {clean_title}

Closes #{issue_number}

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"""

    # Use local temp directory for the commit message to handle special characters
    temp_dir = get_temp_dir()
    temp_file = temp_dir / f"commit-{issue_number}.txt"
    temp_file.write_text(commit_message, encoding='utf-8')

    try:
        output, err = run(f'git commit -F "{temp_file}"')
        success = output is not None or (err and "nothing to commit" not in err.lower())
        return success, commit_message
    finally:
        temp_file.unlink(missing_ok=True)


def create_pr(issue_number, issue_title, summary, test_plan, base=None):
    """Create a pull request.

    Args:
        issue_number: The issue number
        issue_title: The issue title
        summary: PR summary text
        test_plan: Test plan text
        base: Target branch for PR (default: main, use epic-<n> for sub-issues)
    """
    # Sanitize title
    clean_title = re.sub(r'^\[(Tech Debt|Roadmap|BUG)\]\s*', '', issue_title, flags=re.IGNORECASE)
    pr_title = f"feat(#{issue_number}): {clean_title}"

    # Build PR body
    pr_body = f"""## Summary
{summary if summary else "- Implementation for issue #" + issue_number}

## Test plan
{test_plan if test_plan else "- All unit tests pass\n- Lint passes\n- Build succeeds"}

Fixes #{issue_number}

🤖 Generated with [Claude Code](https://claude.com/claude-code)"""

    # Use local temp directory for PR body
    temp_dir = get_temp_dir()
    temp_file = temp_dir / f"pr-body-{issue_number}.txt"
    temp_file.write_text(pr_body, encoding='utf-8')

    try:
        # Build the gh pr create command
        base_arg = f' --base "{base}"' if base else ''
        output, err = run(f'gh pr create --title "{pr_title}" --body-file "{temp_file}"{base_arg}')
        if output:
            # Extract PR URL from output
            lines = output.strip().split('\n')
            for line in lines:
                if 'github.com' in line and '/pull/' in line:
                    return True, line.strip()
            return True, output.strip()
        return False, err
    finally:
        temp_file.unlink(missing_ok=True)


def update_project_status(issue_number):
    """Update issue status to 'Needs Review' in GitHub Project."""
    # Get project items
    items_json, _ = run(
        f'gh project item-list {PROJECT_NUMBER} --owner {PROJECT_OWNER} --format json --limit 100',
        check=False
    )

    if not items_json:
        return False, "Could not fetch project items"

    try:
        data = json.loads(items_json)
        items = data.get('items', [])
    except json.JSONDecodeError:
        return False, "Invalid JSON from project"

    # Find the item for this issue
    item_id = None
    for item in items:
        content = item.get('content', {})
        if content.get('number') == int(issue_number):
            item_id = item.get('id')
            break

    if not item_id:
        return False, "Issue not found in project"

    # Get project ID
    project_json, _ = run(
        f'gh project list --owner {PROJECT_OWNER} --format json',
        check=False
    )

    project_id = None
    if project_json:
        try:
            projects = json.loads(project_json)
            for proj in projects.get('projects', []):
                if proj.get('number') == PROJECT_NUMBER:
                    project_id = proj.get('id')
                    break
        except json.JSONDecodeError:
            pass

    if not project_id:
        return False, "Could not find project ID"

    # Update the status
    output, err = run(
        f'gh project item-edit --project-id {project_id} --id {item_id} '
        f'--field-id {STATUS_FIELD_ID} --single-select-option-id {NEEDS_REVIEW_OPTION_ID}',
        check=False
    )

    if output is None and err:
        return False, f"Failed to update status: {err}"

    return True, "Status updated to Needs Review"


def parse_args():
    """Parse command line arguments."""
    args = {
        'issue_number': None,
        'summary': None,
        'test_plan': None,
        'summary_file': None,
        'test_plan_file': None,
        'base': None,  # Target branch for PR (default: main, use epic-<n> for sub-issues)
        'skip_checks': False,
        'dry_run': False
    }

    i = 1
    while i < len(sys.argv):
        arg = sys.argv[i]

        if arg == '--summary' and i + 1 < len(sys.argv):
            args['summary'] = sys.argv[i + 1]
            i += 2
        elif arg == '--test-plan' and i + 1 < len(sys.argv):
            args['test_plan'] = sys.argv[i + 1]
            i += 2
        elif arg == '--summary-file' and i + 1 < len(sys.argv):
            args['summary_file'] = sys.argv[i + 1]
            i += 2
        elif arg == '--test-plan-file' and i + 1 < len(sys.argv):
            args['test_plan_file'] = sys.argv[i + 1]
            i += 2
        elif arg == '--base' and i + 1 < len(sys.argv):
            args['base'] = sys.argv[i + 1]
            i += 2
        elif arg == '--skip-checks':
            args['skip_checks'] = True
            i += 1
        elif arg == '--dry-run':
            args['dry_run'] = True
            i += 1
        elif arg.isdigit() and args['issue_number'] is None:
            args['issue_number'] = arg
            i += 1
        else:
            i += 1

    # File-based inputs take precedence over inline arguments
    if args['summary_file']:
        file_content = read_file_content(args['summary_file'])
        if file_content:
            args['summary'] = file_content

    if args['test_plan_file']:
        file_content = read_file_content(args['test_plan_file'])
        if file_content:
            args['test_plan'] = file_content

    return args


def main():
    args = parse_args()

    if not args['issue_number']:
        print(f"{RED}Error: Issue number required{NC}")
        print(f"Usage: python {sys.argv[0]} <issue-number> [options]")
        print(f"")
        print(f"Options:")
        print(f"  --summary \"...\"       PR summary text (inline)")
        print(f"  --summary-file PATH   PR summary from file (recommended)")
        print(f"  --test-plan \"...\"     Test plan text (inline)")
        print(f"  --test-plan-file PATH Test plan from file (recommended)")
        print(f"  --base BRANCH         Target branch for PR (default: main)")
        print(f"  --skip-checks         Skip tests, lint, and build checks")
        print(f"  --dry-run             Show what would happen without doing it")
        sys.exit(1)

    issue_number = args['issue_number']

    print(f"{BLUE}Starting review process for issue #{issue_number}...{NC}")
    print()

    # Step 1: Validate we're in a git repo
    repo_root = get_repo_root()
    if not repo_root:
        print(f"{RED}Error: Not in a git repository{NC}")
        sys.exit(1)

    npm_dir = repo_root / "lua-learning-website"
    if not npm_dir.exists():
        print(f"{RED}Error: lua-learning-website directory not found{NC}")
        sys.exit(1)

    # Step 2: Check current branch
    branch = get_current_branch()
    print(f"  Branch: {GREEN}{branch}{NC}")

    # Safety: Never run on main/master
    if branch in ['main', 'master']:
        print(f"{RED}Error: Cannot run on {branch} branch{NC}")
        print("Switch to a feature branch first.")
        sys.exit(1)

    # Step 3: Validate branch matches issue number
    branch_issue = extract_issue_number_from_branch(branch)
    if branch_issue != issue_number:
        print(f"{RED}Error: Branch '{branch}' does not match issue #{issue_number}{NC}")
        print(f"Expected branch to start with '{issue_number}-'")
        sys.exit(1)

    # Step 4: Fetch issue title
    print(f"{BLUE}Fetching issue details...{NC}")
    issue_title = get_issue_title(issue_number)
    if not issue_title:
        print(f"{RED}Error: Could not fetch issue #{issue_number}{NC}")
        sys.exit(1)

    print(f"  Issue: {GREEN}#{issue_number} - {issue_title}{NC}")
    print()

    # Step 5: Run checks (unless skipped)
    if not args['skip_checks']:
        print(f"{BLUE}Running validation checks...{NC}")
        print()

        # Tests
        tests_pass, test_output = run_tests(npm_dir)
        if tests_pass:
            print(f"  Tests: {GREEN}[PASS]{NC}")
        else:
            print(f"  Tests: {RED}[FAIL]{NC}")
            print(f"\n{test_output}")
            print(f"\n{RED}Error: Tests must pass before creating PR{NC}")
            sys.exit(1)

        # Lint
        lint_pass, lint_output = run_lint(npm_dir)
        if lint_pass:
            print(f"  Lint: {GREEN}[PASS]{NC}")
        else:
            print(f"  Lint: {RED}[FAIL]{NC}")
            print(f"\n{lint_output}")
            print(f"\n{RED}Error: Lint must pass before creating PR{NC}")
            sys.exit(1)

        # Build
        build_pass, build_output = run_build(npm_dir)
        if build_pass:
            print(f"  Build: {GREEN}[PASS]{NC}")
        else:
            print(f"  Build: {RED}[FAIL]{NC}")
            print(f"\n{build_output}")
            print(f"\n{RED}Error: Build must pass before creating PR{NC}")
            sys.exit(1)

        print()
    else:
        print(f"{YELLOW}Skipping validation checks (--skip-checks){NC}")
        print()

    # Step 6: Check for changes to commit
    unstaged = get_unstaged_changes()
    untracked = get_untracked_files()
    staged = get_staged_files()

    has_changes = any([
        unstaged and unstaged != [''],
        untracked and untracked != [''],
        staged and staged != ['']
    ])

    if args['dry_run']:
        print(f"{YELLOW}Dry run mode - would perform:{NC}")
        if has_changes:
            print(f"  - Stage all changes")
            print(f"  - Create commit for issue #{issue_number}")
        print(f"  - Push to origin/{branch}")
        print(f"  - Create PR linking to issue #{issue_number}")
        print(f"  - Update project status to 'Needs Review'")
        sys.exit(0)

    # Step 7: Stage and commit changes
    if has_changes:
        print(f"{BLUE}Staging changes...{NC}")
        if not stage_all_changes():
            print(f"{RED}Error: Failed to stage changes{NC}")
            sys.exit(1)

        print(f"{BLUE}Creating commit...{NC}")
        success, commit_msg = create_commit(issue_number, issue_title)
        if not success:
            print(f"{RED}Error: Failed to create commit{NC}")
            sys.exit(1)

        print(f"  {GREEN}[OK] Commit created{NC}")
    else:
        print(f"{YELLOW}No changes to commit{NC}")

    # Step 8: Push to remote
    print()
    if not push_branch(branch):
        print(f"{RED}Error: Failed to push to remote{NC}")
        sys.exit(1)

    print(f"  {GREEN}[OK] Pushed to origin/{branch}{NC}")

    # Step 9: Check if PR already exists
    existing_pr, _ = run(f'gh pr view --json url --jq ".url"', check=False)
    if existing_pr and 'github.com' in existing_pr:
        print()
        print(f"{YELLOW}PR already exists: {existing_pr}{NC}")
        pr_url = existing_pr
    else:
        # Step 10: Create PR
        print()
        print(f"{BLUE}Creating pull request...{NC}")
        success, result = create_pr(issue_number, issue_title, args['summary'], args['test_plan'], args['base'])
        if not success:
            print(f"{RED}Error creating PR: {result}{NC}")
            sys.exit(1)

        pr_url = result
        print(f"  {GREEN}[OK] PR created{NC}")

    # Step 11: Update project status
    print()
    print(f"{BLUE}Updating project status...{NC}")
    success, message = update_project_status(issue_number)
    if success:
        print(f"  {GREEN}[OK] {message}{NC}")
    else:
        print(f"  {YELLOW}[WARN] {message}{NC}")

    # Success summary
    print()
    print(f"{GREEN}{'='*50}{NC}")
    print(f"{GREEN}Review process complete!{NC}")
    print(f"{GREEN}{'='*50}{NC}")
    print()
    print(f"  Issue:  {GREEN}#{issue_number} - {issue_title}{NC}")
    print(f"  Branch: {GREEN}{branch}{NC}")
    print(f"  PR:     {GREEN}{pr_url}{NC}")
    print()
    print(f"Next steps:")
    print(f"  - Review the PR on GitHub")
    print(f"  - Run {BLUE}/pr-review {issue_number}{NC} for code review")
    print(f"  - Merge when approved")


if __name__ == '__main__':
    main()
