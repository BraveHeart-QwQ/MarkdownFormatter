#!/usr/bin/env python3
"""
Package the VS Code extension as a .vsix file.

Requirements:
  - Node.js + pnpm (for building)
  - @vscode/vsce (installed globally or via npx)

Usage:
  python3 PackageExtension.py [--skip-build] [--out <path>]
"""

import argparse
import subprocess
import sys
from pathlib import Path

EXTENSION_DIR = Path(__file__).parent.parent / "vscode-extension"


def run(cmd: list[str], cwd: Path) -> None:
    print(f"$ {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=cwd)
    if result.returncode != 0:
        sys.exit(result.returncode)


def main() -> None:
    parser = argparse.ArgumentParser(description="Package the Markdown Formatter VS Code extension.")
    parser.add_argument("--skip-build", action="store_true", help="Skip the build step (use existing dist/).")
    parser.add_argument("--out", metavar="PATH", help="Output .vsix path (default: <extension-dir>/<name>-<version>.vsix).")
    args = parser.parse_args()

    if not EXTENSION_DIR.is_dir():
        print(f"Error: extension directory not found: {EXTENSION_DIR}", file=sys.stderr)
        sys.exit(1)

    # Step 1: install dependencies
    run(["pnpm", "install", "--frozen-lockfile"], cwd=EXTENSION_DIR)

    # Step 2: production build (runs vscode:prepublish internally via vsce, but we do it explicitly)
    if not args.skip_build:
        run(["pnpm", "run", "build"], cwd=EXTENSION_DIR)

    # Step 3: package with vsce
    vsceCmd = ["pnpm", "exec", "vsce", "package", "--no-dependencies"]
    if args.out:
        out_path = Path(args.out).resolve()
        vsceCmd += ["--out", str(out_path)]
    run(vsceCmd, cwd=EXTENSION_DIR)

    # Find and report the produced .vsix
    vsixFiles = sorted(EXTENSION_DIR.glob("*.vsix"), key=lambda p: p.stat().st_mtime, reverse=True)
    if vsixFiles:
        print(f"\nPackaged: {vsixFiles[0]}")
    else:
        print("\nDone. (output path was specified explicitly)")


if __name__ == "__main__":
    main()
