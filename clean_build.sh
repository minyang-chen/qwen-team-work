#!/bin/bash

echo "🧹 Cleaning build artifacts..."

# Clean all package dist directories
for pkg in packages/team-*; do
  if [ -d "$pkg/dist" ]; then
    echo "  Cleaning $pkg/dist"
    rm -rf "$pkg/dist"
  fi
  if [ -d "$pkg/node_modules" ]; then
    echo "  Cleaning $pkg/node_modules"
    rm -rf "$pkg/node_modules"
  fi
done

# Clean root node_modules
if [ -d "node_modules" ]; then
  echo "  Cleaning root node_modules"
  rm -rf node_modules
fi

echo "✅ Clean complete"
echo "Run 'npm install' to reinstall dependencies"
