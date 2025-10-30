#!/bin/bash

# Setup git hooks for automatic worker deployment

echo "🔧 Setting up git hooks..."

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
REPO_ROOT="$SCRIPT_DIR/.."

# Check if we're in a git repository
if [ ! -d "$REPO_ROOT/.git" ]; then
    echo "❌ Not in a git repository"
    exit 1
fi

# Copy pre-push hook from tracked template
if [ -f "$SCRIPT_DIR/hooks/pre-push" ]; then
    cp "$SCRIPT_DIR/hooks/pre-push" "$REPO_ROOT/.git/hooks/pre-push"
    chmod +x "$REPO_ROOT/.git/hooks/pre-push"
    echo "✅ Git hooks installed successfully!"
    echo ""
    echo "The pre-push hook will now automatically:"
    echo "  - Check for realtime-worker changes when you push"
    echo "  - Deploy the worker first if changes are detected"
    echo "  - Then allow the push to continue (triggering CF auto-deploy for main app)"
else
    echo "❌ Hook template not found at $SCRIPT_DIR/hooks/pre-push"
    exit 1
fi

