"""Centralized GitHub Project configuration.

Single source of truth for all GitHub project board constants:
project IDs, field IDs, and option mappings.
"""

# Project identity
PROJECT_NUMBER = 3
PROJECT_OWNER = "jcollard"
PROJECT_ID = "PVT_kwHOADXapM4BKKH8"
REPO_NAME = "LuaInTheWeb"

# Field IDs
STATUS_FIELD_ID = "PVTSSF_lAHOADXapM4BKKH8zg6G6Vo"
PRIORITY_FIELD_ID = "PVTSSF_lAHOADXapM4BKKH8zg6G6Y4"
EFFORT_FIELD_ID = "PVTSSF_lAHOADXapM4BKKH8zg6G6Y8"
TYPE_FIELD_ID = "PVTSSF_lAHOADXapM4BKKH8zg6G6ZA"

# Status options
STATUS_OPTIONS = {
    "In Progress": "47fc9ee4",
    "Needs Review": "44687678",
    "Done": "98236657",
}

# Priority options
PRIORITY_OPTIONS = {
    "P0-Critical": "6959573a",
    "P1-High": "1aaa3eba",
    "P2-Medium": "db5c9ee4",
    "P3-Low": "05293cbc",
}

# Effort options
EFFORT_OPTIONS = {
    "XS": "cec6e7fb",
    "S": "cd99538a",
    "M": "fe8d3824",
    "L": "526971d0",
    "XL": "c4a28a01",
}

# Type options
TYPE_OPTIONS = {
    "Feature": "f719849f",
    "Bug": "ff58b733",
    "Tech Debt": "7ab66055",
    "Docs": "b7c57bb8",
}

# Type-to-label mapping for GitHub issue labels
TYPE_LABELS = {
    "Feature": "enhancement",
    "Bug": "bug",
    "Tech Debt": "tech-debt",
    "Docs": "documentation",
}
