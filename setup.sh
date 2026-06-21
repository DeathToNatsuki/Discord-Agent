#!/usr/bin/env bash
set -e

echo "Discord Agent — Setup"
echo "=============================="
echo ""

# Check node
if ! command -v node &>/dev/null; then
  echo "ERROR: Node.js is not installed."
  echo "Download from https://nodejs.org (v18+)"
  exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "WARNING: Node.js v18+ recommended. Found: $(node --version)"
fi

echo "Node.js $(node --version) found."
echo ""
echo "Installing dependencies..."
npm install

echo ""
echo "Setup complete."
echo ""
echo "Start development mode:   npm run dev"
echo "Build for production:     npm run build"
echo ""
