"""
Run the Markdown formatter via tsx.

Default behaviour (no arguments):
  input   : tests/fixtures/input.md
  output  : tests/fixtures/output.md
  configs : tests/configs/base.json  +  tests/configs/text-corrections.json

Examples
--------
  # Use defaults (input → output.md)
  python tests/format.py

  # Write back to the input file in-place
  python tests/format.py -w

  # Custom input/output
  python tests/format.py my_doc.md -o my_doc_formatted.md

  # Stack only specific configs
  python tests/format.py -c tests/configs/base.json

  # Stack multiple configs explicitly
  python tests/format.py -c tests/configs/base.json -c tests/configs/text-corrections.json
"""

import os
import argparse
import subprocess
import sys
from pathlib import Path

ROOT = "."
TESTS = "tests"
PNPM = "pnpm.cmd" if sys.platform == "win32" else "pnpm"

DEFAULT_INPUT = os.path.join(TESTS, "fixtures", "input.md")
DEFAULT_OUTPUT = os.path.join(TESTS, "fixtures", "output.md")
DEFAULT_CONFIGS = [
    os.path.join(TESTS, "configs", "base.json"),
    os.path.join(TESTS, "configs", "text-corrections.json"),
]

TSX_BIN = os.path.join(ROOT, "node_modules", ".bin", "tsx")
MAIN_TS = os.path.join(ROOT, "src", "main.ts")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run markdown-formatter via tsx",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "input",
        nargs="?",
        default=None,
        help="Input .md file (default: tests/fixtures/input.md)",
    )
    parser.add_argument(
        "-o", "--output",
        default=None,
        metavar="FILE",
        help="Output file (default: tests/fixtures/output.md)",
    )
    parser.add_argument(
        "-w", "--write",
        action="store_true",
        help="Write formatted result back to the input file (overrides -o)",
    )
    parser.add_argument(
        "-c", "--config",
        action="append",
        dest="configs",
        metavar="FILE",
        help=(
            "Config JSON file to layer on top of defaults; "
            "may be repeated (default: base.json + text-corrections.json)"
        ),
    )
    args = parser.parse_args()

    inputPath = Path(args.input) if args.input else DEFAULT_INPUT
    outputPath = Path(args.output) if args.output else DEFAULT_OUTPUT
    configPaths = [Path(c) for c in args.configs] if args.configs else DEFAULT_CONFIGS

    # ── Validation ────────────────────────────────────────────────────────────

    if not os.path.exists(TSX_BIN):
        print(
            f"Error: tsx not found at {TSX_BIN}\n"
            "Run `pnpm install` in the repo root first.",
            file=sys.stderr,
        )
        sys.exit(1)

    if not os.path.exists(inputPath):
        print(f"Error: input file not found: {inputPath}", file=sys.stderr)
        sys.exit(1)

    for cfg in configPaths:
        if not os.path.exists(cfg):
            print(f"Error: config file not found: {cfg}", file=sys.stderr)
            sys.exit(1)

    # ── Build command ─────────────────────────────────────────────────────────

    cmd: list[str] = [PNPM, "tsx", str(MAIN_TS)]

    for cfg in configPaths:
        cmd += ["-c", str(cfg)]

    if args.write:
        cmd += ["-w"]
    else:
        cmd += ["-o", str(outputPath)]

    cmd.append(str(inputPath))

    # ── Run ───────────────────────────────────────────────────────────────────

    print("$", " ".join(cmd))
    result = subprocess.run(cmd, cwd=str(ROOT))
    sys.exit(result.returncode)


if __name__ == "__main__":
    main()
