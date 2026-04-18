# Markdown Formatter

A configurable Markdown formatter built on top of `remark`, focused on practical writing workflows and CJK-friendly formatting rules.

This project includes:
- A CLI formatter in [src/main.ts](src/main.ts)
- A reusable formatting pipeline in [src/pipeline.ts](src/pipeline.ts)
- A VS Code extension in [vscode-extension](vscode-extension)



## Features

- Text correction with custom regex replacements
- Block-indent handling (including indent-to-fenced-code conversion)
- Heading line-spacing normalization
- CJK-aware word spacing rules
- List normalization (unordered marker style, ordered style, trailing char trimming)
- Table normalization (alignment, optional outer-border removal, max-width fallback)
- Inline formatting controls (`code`, `math`, `strong`)
- Misc options such as header-number stripping and optional custom ending injection



## Repository Structure

- [src](src): core formatter logic
- [tests](tests): test cases and fixtures
- [vscode-extension](vscode-extension): VS Code extension source



## Build Requirements

- Node.js (modern LTS recommended)
- `pnpm`

  ```bash
  pnpm install
  ```



## CLI Usage

Build once:

```bash
pnpm build
```

Run:

```bash
node dist/main.js [options] <input.md>
```

Options:

- `-o, --output <file>`: write result to a file (default: stdout)
- `-w, --write`: write back to input file
- `-c, --config <file>`: merge config file (can be repeated)
- `-j, --config-json <json>`: merge inline partial config JSON (can be repeated)
- `-h, --help`: show help

Notes:

- `-w` and `-o` are mutually exclusive
- `markdown.format` in current working directory is auto-loaded if present
- Merge order is: defaults -> auto config -> `-c` files -> `-j` inline JSON

Example:

```bash
node dist/main.js -c configs/base.json -j '{"inline":{"handleInlineCode":"removeAll"}}' input.md -o output.md
```



## Configuration Model

Main sections:
- `textCorrection`
- `blockIndent`
- `lineSpacing`
- `wordSpacing`
- `list`
- `table`
- `inline`
- `other`

Default values are defined in [src/config.ts](src/config.ts).

### Strict Config Validation

The project validates unknown section keys and unknown section-field keys.

Examples that fail fast:

- unknown section (e.g. `wordSpcing`)
- unknown field inside section (e.g. `wordSpacing.spaceBetweenChineseAndEnglih`)



## VS Code Extension

The extension source is in [vscode-extension](vscode-extension).

### Commands

- `Markdown Formatter: Format Document`
- `Markdown Formatter: Format Selection`
- `Markdown Formatter: Format Document with Profile`
- `Markdown Formatter: Format Selection with Profile`

### Settings

- `markdownFormatter.configFiles`: base config files
- `markdownFormatter.config`: inline partial config object (highest priority)
- `markdownFormatter.profiles`: named profile entries

`profiles` entries support both:

- file path strings
- inline partial config objects

Built-in profiles are defined in [vscode-extension/src/profile.ts](vscode-extension/src/profile.ts), including:

- `ClearInlineCodeAndMath`
- `ClearInlineCode`
- `ClearInlineMath`
- `FormatInlineToCode`
- `FormatInlineToMath`



## Development

```bash
pnpm typecheck
pnpm test
```



## Known Issues / Limitations

- Value-type validation is not fully strict yet.
  - Current validation in [src/config.ts](src/config.ts) checks unknown sections/keys, but does not deeply validate runtime value types or enum members (for example, invalid string literals may pass key-level validation).
- There are acknowledged preprocess edge cases tracked in source comments.
  - See TODO/BUG notes in [src/pipeline.ts](src/pipeline.ts), especially around list-marker edge handling.
