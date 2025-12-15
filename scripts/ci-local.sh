#!/bin/bash
# ci-local.sh - Run the same checks as CI locally
# Usage: ./scripts/ci-local.sh [--skip-e2e]
#
# This mirrors .github/workflows/e2e.yml for local validation before pushing.

set -e  # Exit on first error

SKIP_E2E=false
if [ "$1" = "--skip-e2e" ]; then
    SKIP_E2E=true
fi

echo "================================"
echo "🔍 Running CI checks locally..."
echo "================================"

# Get the root directory
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

# Step 1: Lint all packages
echo ""
echo "📝 Linting packages..."
echo "----------------------"

echo "  → Linting lua-runtime..."
cd packages/lua-runtime && npm run lint && cd "$ROOT_DIR"

echo "  → Linting lua-learning-website..."
cd lua-learning-website && npm run lint && cd "$ROOT_DIR"

echo "✅ Lint passed"

# Step 2: Build all packages (in dependency order)
echo ""
echo "🔨 Building packages..."
echo "-----------------------"

echo "  → Building shell-core..."
cd packages/shell-core && npm run build && cd "$ROOT_DIR"

echo "  → Building lua-runtime..."
cd packages/lua-runtime && npm run build && cd "$ROOT_DIR"

echo "  → Building lua-learning-website..."
cd lua-learning-website && npm run build && cd "$ROOT_DIR"

echo "✅ Build passed"

# Step 3: Test all packages
echo ""
echo "🧪 Running unit tests..."
echo "------------------------"

echo "  → Testing shell-core..."
cd packages/shell-core && npm run test && cd "$ROOT_DIR"

echo "  → Testing lua-runtime..."
cd packages/lua-runtime && npm run test && cd "$ROOT_DIR"

echo "  → Testing lua-learning-website..."
cd lua-learning-website && npm run test && cd "$ROOT_DIR"

echo "✅ Unit tests passed"

# Step 4: E2E tests (optional)
if [ "$SKIP_E2E" = false ]; then
    echo ""
    echo "🎭 Running E2E tests..."
    echo "-----------------------"
    cd lua-learning-website && npm run test:e2e && cd "$ROOT_DIR"
    echo "✅ E2E tests passed"
else
    echo ""
    echo "⏭️  Skipping E2E tests (--skip-e2e flag)"
fi

echo ""
echo "================================"
echo "✅ All CI checks passed!"
echo "================================"
