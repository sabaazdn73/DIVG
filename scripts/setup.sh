#!/bin/bash
# DIVG one-shot setup — installs all dependencies INSIDE the project folder.
# Run from project root:   bash scripts/setup.sh

set -e
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "════════════════════════════════════════════"
echo "  DIVG · Project-Local Setup"
echo "════════════════════════════════════════════"
echo ""

# ─── 1. Check required system tools ────────────────────────
echo "▸ Checking system tools..."
MISSING=""
command -v node    >/dev/null || MISSING="$MISSING node"
command -v npm     >/dev/null || MISSING="$MISSING npm"
command -v python3 >/dev/null || MISSING="$MISSING python3"
command -v sui     >/dev/null || MISSING="$MISSING sui"
if [ -n "$MISSING" ]; then
  echo ""
  echo "✗ Missing system tools:$MISSING"
  echo ""
  echo "  Install once (system-wide, cannot be project-local):"
  echo "    brew install node python@3.11 sui"
  exit 1
fi
echo "  ✓ node    $(node --version)"
echo "  ✓ python3 $(python3 --version | cut -d' ' -f2)"
echo "  ✓ sui     $(sui --version | head -1)"
echo ""

# ─── 2. Backend ────────────────────────────────────────────
echo "▸ Installing backend (backend/node_modules)..."
cd "$PROJECT_ROOT/backend"
npm install --silent
echo "  ✓ Backend npm packages installed"
echo ""

echo "▸ Creating Python venv (backend/.venv)..."
if [ ! -d ".venv" ]; then python3 -m venv .venv; fi
# shellcheck disable=SC1091
source .venv/bin/activate
pip install --quiet --upgrade pip
pip install --quiet numpy
deactivate
echo "  ✓ Python deps in backend/.venv"
echo ""

# ─── 3. Frontend ───────────────────────────────────────────
echo "▸ Installing frontend (frontend/node_modules)..."
cd "$PROJECT_ROOT/frontend"
npm install --silent
echo "  ✓ Frontend npm packages installed"
echo ""

# ─── 4. Move build ─────────────────────────────────────────
echo "▸ Building Move package (build/)..."
cd "$PROJECT_ROOT"
sui move build 2>&1 | tail -3 || echo "  ⚠ Build had issues — run 'sui move build' from root for details"
echo ""

cd "$PROJECT_ROOT"
echo "════════════════════════════════════════════"
echo "  ✓ Setup complete"
echo "════════════════════════════════════════════"
echo ""
du -sh backend/node_modules backend/.venv frontend/node_modules build 2>/dev/null | sed 's/^/  /'
echo ""
echo "Next steps:"
echo "  1. sui move test                                   ← verify the 22 unit tests pass"
echo "  2. sui client publish --gas-budget 100000000      ← deploy Move package"
echo "  3. cp backend/.env.example backend/.env  &&  edit values"
echo "  4. npm run dev:backend     (in one terminal)"
echo "  5. npm run dev:frontend    (in another)"
echo ""
echo "  Open http://localhost:5173"
echo ""
