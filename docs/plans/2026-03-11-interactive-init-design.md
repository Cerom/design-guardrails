# Interactive `init` wizard — Design

## Summary

Replace the current `init` command (which just prints a config template) with an interactive wizard that scans the project, detects components and tokens, confirms with the user, then writes both the config and Claude Code hook.

## Entry point

- `npx design-guardrails` (no subcommand) → launches wizard
- `npx design-guardrails init` → same wizard
- `npx design-guardrails check` → unchanged

## Wizard steps

### Step 1: Detect framework

Read `package.json` to identify framework (Next.js, Vite, CRA, Remix, etc.). Display result.

### Step 2: Scan for component wrappers

For each native HTML element in a predefined list:

```
button, input, a, select, textarea, img, form, label, dialog, table
```

Search the project's component directories for custom components that wrap them:

1. Find all `.tsx`/`.jsx` files in common component paths (`src/components/`, `components/`, `app/components/`, etc.)
2. For each native element, check which component files render it (search for `<button`, `<input`, etc. in file contents)
3. If a component renders a native element, suggest it as a replacement rule

Example result:
```
<button> → <Button> from @/components/ui/button
<input>  → <Input>  from @/components/ui/input
<a>      → <Link>   from @/components/ui/link
```

### Step 3: Scan for color tokens

**Tailwind config:** Read `tailwind.config.js/ts`, walk `theme.colors` and `theme.extend.colors`, extract hex values mapped to class names.

**CSS variables:** Read `globals.css/scss` (or `app/globals.css` for Next.js), extract CSS custom properties with hex values (e.g. `--color-primary: #1a1a1a` → `--color-primary`).

### Step 4: Confirm with user

Show detected rules in a table. User can add, remove, or accept.

Element rules:
```
? Confirm element rules:
  ┌──────────┬──────────────────────────────────────────┐
  │ <button> │ → <Button> from @/components/ui/button   │
  │ <input>  │ → <Input>  from @/components/ui/input    │
  │ <a>      │ → <Link>   from @/components/ui/link     │
  └──────────┴──────────────────────────────────────────┘
  [Accept] / Add / Remove
```

Token rules:
```
? Confirm token rules:
  ┌───────────┬─────────────────┐
  │ #1a1a1a   │ → --foreground  │
  │ #ffffff   │ → --background  │
  │ #3b82f6   │ → blue-500      │
  └───────────┴─────────────────┘
  [Accept] / Add / Remove
```

### Step 5: Include pattern

Ask which files to watch. Default: `src/**/*.tsx`.

### Step 6: Write config

Write `guardrails.config.js` (or `.ts` if project uses TS) to project root.

### Step 7: Install Claude Code hook

Read `.claude/settings.json` (create if missing). Merge a `PostToolUse` hook entry that runs the design-guardrails hook. Preserve any existing hooks — append, don't overwrite.

Hook entry:
```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Edit|Write",
      "hooks": [{
        "type": "command",
        "command": "npx design-guardrails check --hook"
      }]
    }]
  }
}
```

### UX

- Use `cli-spinner` (npm package) for loading states during scanning steps
- Use `inquirer` (already a dependency) for prompts
- Use `chalk` (already a dependency) for colored output

## Files to create/modify

- `src/cli.ts` — add default command (no subcommand → wizard), rewrite `init` to call wizard
- `src/wizard/index.ts` — orchestrates the wizard flow
- `src/wizard/detect-framework.ts` — reads package.json
- `src/wizard/scan-components.ts` — finds custom component wrappers for native HTML elements
- `src/wizard/scan-tokens.ts` — reads tailwind config + globals.css for color tokens
- `src/wizard/install-hook.ts` — merges hook into .claude/settings.json
- `src/wizard/write-config.ts` — writes guardrails.config.js

## Dependencies to add

- `cli-spinner` (+ `@types/cli-spinner`)
