# devtask

YAML-driven task tracking CLI for software projects. Generates structured `MASTER_TASKS.md` from YAML data and integrates with Claude Code as a skill plugin.

## Install

```bash
npm install -g devtask
# or use directly
npx devtask
```

## Quick Start

```bash
# Initialize in your project
devtask init --lang zh-TW

# Add a project
devtask add project

# Generate MASTER_TASKS.md from YAML
devtask generate

# Check status
devtask status
```

## How It Works

```
.tasks/config.yaml          # Project settings + status definitions
.tasks/projects/*.yaml      # One YAML file per project (source of truth)
        ↓
  devtask generate
        ↓
docs/MASTER_TASKS.md        # Auto-generated, deterministic output
```

YAML is the single source of truth. The Markdown file is always regenerated from YAML, never edited by hand.

## Commands

| Command | Description |
|---------|-------------|
| `devtask init [--lang en\|zh-TW] [--yes]` | Initialize `.tasks/` structure + Claude Code skills |
| `devtask add project` | Interactively create a new project YAML |
| `devtask add task <code>` | Add a task to an existing project |
| `devtask status [code]` | Show project status with progress bars |
| `devtask generate [--dry-run]` | Generate MASTER_TASKS.md from YAML |
| `devtask import <path.md> [--dry-run]` | Import existing Markdown into YAML |
| `devtask validate` | Validate all YAML against schemas |

## YAML Schema

### Config (`.tasks/config.yaml`)

```yaml
version: 1

project:
  name: "My Project"
  output_path: "docs/MASTER_TASKS.md"
  tasks_dir: "docs/tasks/"
  specs_dir: "docs/specs/"
  lang: "en"  # or "zh-TW"

statuses:
  planning:    { emoji: "📋", label: "Planning" }
  in_progress: { emoji: "🔄", label: "In Progress" }
  testing:     { emoji: "🧪", label: "Testing" }
  completed:   { emoji: "✅", label: "Completed" }
  paused:      { emoji: "⏸️", label: "Paused" }
  cancelled:   { emoji: "❌", label: "Cancelled" }

active_statuses: [planning, in_progress, testing, paused]
completed_statuses: [completed]
cancelled_statuses: [cancelled]

generate:
  include_status_legend: true
  include_completed_details: true
  include_doc_index: true
```

### Project (`.tasks/projects/<CODE>.yaml`)

```yaml
code: BIL-SVC
name: "Billing Service"
status: testing
progress: 91
description: "Complete billing management system"
estimated_hours: 160
detail_link: "docs/specs/billing/TASKS.md"
plan_link: "docs/specs/billing/PLAN.md"

latest_update: "UAT test plan ready"
latest_update_date: "2026-02-07"

phases:
  - id: phase-1
    name: "Infrastructure"
    status: completed
    estimated_hours: 23
  - id: phase-2
    name: "UI Development"
    status: in_progress
    estimated_hours: 20
```

## Claude Code Integration

Running `devtask init` installs Claude Code skills and commands:

- **Skill**: `.claude/skills/tasks/skill.md` - Activated by saying "tasks", "progress", "todo"
- **Commands**: `/tasks`, `/task-add`, `/task-status` - Direct Claude Code slash commands

The skill dynamically reads `.tasks/config.yaml` and `.tasks/projects/*.yaml` at runtime, so it works with any project without hardcoding.

## Importing from Existing Markdown

If you already have a `MASTER_TASKS.md`, import it:

```bash
devtask import docs/MASTER_TASKS.md
devtask validate    # Check the imported data
devtask generate    # Regenerate to verify round-trip
```

The parser handles both English and Chinese (zh-TW) formats, including emoji-based status detection.

## Programmatic API

```typescript
import { loadConfig, loadAllProjects, generateMasterTasks } from 'devtask';

const config = await loadConfig('.tasks/config.yaml');
const projects = await loadAllProjects('.tasks/projects');
const markdown = generateMasterTasks(config, projects);
```

## i18n

Supported languages: `en`, `zh-TW`

Set in config:
```yaml
project:
  lang: "zh-TW"
```

## License

MIT
