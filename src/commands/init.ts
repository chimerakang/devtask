import { join } from 'node:path';
import { stringify as stringifyYaml } from 'yaml';
import chalk from 'chalk';
import { configExists, getConfigDir, getProjectsDir } from '../core/config.js';
import { ensureDir, writeTextFile, fileExists } from '../utils/fs.js';

interface InitOptions {
  lang?: string;
  outputPath?: string;
  yes?: boolean;
  force?: boolean;
}

function defaultConfig(projectName: string, lang: string, outputPath: string): object {
  const isZh = lang === 'zh-TW';
  return {
    version: 1,
    project: {
      name: projectName,
      output_path: outputPath,
      tasks_dir: 'docs/tasks/',
      specs_dir: 'docs/specs/',
      lang,
    },
    statuses: {
      planning: {
        emoji: '📋',
        label: isZh ? '規劃中' : 'Planning',
      },
      in_progress: {
        emoji: '🔄',
        label: isZh ? '開發中' : 'In Progress',
      },
      testing: {
        emoji: '🧪',
        label: isZh ? '測試中' : 'Testing',
      },
      completed: {
        emoji: '✅',
        label: isZh ? '已完成' : 'Completed',
      },
      paused: {
        emoji: '⏸️',
        label: isZh ? '暫停' : 'Paused',
      },
      cancelled: {
        emoji: '❌',
        label: isZh ? '已取消' : 'Cancelled',
      },
    },
    active_statuses: ['planning', 'in_progress', 'testing', 'paused'],
    completed_statuses: ['completed'],
    cancelled_statuses: ['cancelled'],
    roles: {
      backend: { multiplier: 1.0, description: isZh ? '後端開發者' : 'Backend Developer' },
      frontend: { multiplier: 1.1, description: isZh ? '前端開發者' : 'Frontend Developer' },
      devops: { multiplier: 1.3, description: isZh ? 'DevOps 工程師' : 'DevOps Engineer' },
      qa: { multiplier: 1.0, description: isZh ? '測試工程師' : 'QA Engineer' },
    },
    generate: {
      include_status_legend: true,
      include_completed_details: true,
    },
  };
}

export async function initCommand(options: InitOptions): Promise<void> {
  const cwd = process.cwd();

  if (await configExists(cwd) && !options.force) {
    console.log(chalk.yellow('Already initialized. Use --force to reinitialize.'));
    return;
  }

  let projectName: string;
  let lang: string;
  let outputPath: string;

  if (options.yes) {
    // Non-interactive mode
    const dirName = cwd.split('/').pop() ?? 'My Project';
    projectName = dirName.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    lang = options.lang ?? 'en';
    outputPath = options.outputPath ?? 'docs/MASTER_TASKS.md';
  } else {
    // Interactive mode
    const { input, select } = await import('@inquirer/prompts');

    const dirName = cwd.split('/').pop() ?? 'My Project';
    const defaultName = dirName.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    projectName = await input({
      message: 'Project name:',
      default: defaultName,
    });

    lang = await select({
      message: 'Language:',
      choices: [
        { value: 'en', name: 'English' },
        { value: 'zh-TW', name: '繁體中文' },
      ],
      default: options.lang ?? 'en',
    });

    outputPath = await input({
      message: 'Output path for MASTER_TASKS.md:',
      default: options.outputPath ?? 'docs/MASTER_TASKS.md',
    });
  }

  // Create directories
  await ensureDir(getConfigDir(cwd));
  await ensureDir(getProjectsDir(cwd));

  // Write config.yaml
  const config = defaultConfig(projectName, lang, outputPath);
  const configPath = join(getConfigDir(cwd), 'config.yaml');
  await writeTextFile(configPath, stringifyYaml(config, { lineWidth: 120 }));
  console.log(chalk.green('  Created'), '.tasks/config.yaml');

  // Create .gitkeep in projects dir
  const gitkeepPath = join(getProjectsDir(cwd), '.gitkeep');
  if (!(await fileExists(gitkeepPath))) {
    await writeTextFile(gitkeepPath, '');
    console.log(chalk.green('  Created'), '.tasks/projects/.gitkeep');
  }

  // Install Claude Code skills
  await installClaudeSkills(cwd);

  console.log('');
  console.log(chalk.bold('Done! Next steps:'));
  console.log(`  1. Add a project:  ${chalk.cyan('npx devtask add project')}`);
  console.log(`  2. Generate MD:    ${chalk.cyan('npx devtask generate')}`);
  console.log(`  3. Use in Claude:  ${chalk.cyan('/tasks')}`);
}

async function installClaudeSkills(cwd: string): Promise<void> {
  const skillDir = join(cwd, '.claude', 'skills', 'tasks');
  const commandDir = join(cwd, '.claude', 'commands');

  await ensureDir(skillDir);
  await ensureDir(commandDir);

  // Copy skill template
  const skillContent = getSkillTemplate();
  const skillPath = join(skillDir, 'skill.md');
  if (await fileExists(skillPath)) {
    console.log(chalk.yellow('  Skipped'), '.claude/skills/tasks/skill.md (already exists)');
  } else {
    await writeTextFile(skillPath, skillContent);
    console.log(chalk.green('  Created'), '.claude/skills/tasks/skill.md');
  }

  // Copy command templates
  const commands: Record<string, string> = {
    'tasks.md': getTasksCommandTemplate(),
    'task-add.md': getTaskAddCommandTemplate(),
    'task-status.md': getTaskStatusCommandTemplate(),
  };

  for (const [filename, content] of Object.entries(commands)) {
    const filePath = join(commandDir, filename);
    if (await fileExists(filePath)) {
      console.log(chalk.yellow('  Skipped'), `.claude/commands/${filename} (already exists)`);
    } else {
      await writeTextFile(filePath, content);
      console.log(chalk.green('  Created'), `.claude/commands/${filename}`);
    }
  }
}

function getSkillTemplate(): string {
  return `---
name: tasks
description: Display and manage development task progress. Activated when user says "tasks", "progress", "todo", "what to do", "next step", "任務", "進度", "待辦".
allowed-tools: Read, Grep, Glob
---

# Tasks - Task Tracking Assistant

## When to Use

When the user:
- Says "show tasks", "task progress", "current status"
- Says "what to do", "next step", "todo items"
- Says "查看任務", "任務進度", "要做什麼", "下一步", "待辦"
- Runs \`/tasks\` or \`/tasks <project-code>\`

## Execution Steps

### 1. Load Configuration

Read \`.tasks/config.yaml\` to discover:
- Project name and settings
- Status definitions and their emojis
- Language preference

### 2. Discover All Projects

Scan \`.tasks/projects/*.yaml\` to find all project definitions.

For each project YAML file, extract:
- \`code\`: Project code (e.g., BIL-SVC)
- \`name\`: Project name
- \`status\`: Current status key (must match config statuses)
- \`progress\`: Completion percentage (0-100)
- \`phases\`: Phase breakdown if available

### 3. Display Status Summary

Group projects by status:
- **Active**: statuses listed in \`active_statuses\` config
- **Completed**: statuses listed in \`completed_statuses\` config
- **Cancelled**: statuses listed in \`cancelled_statuses\` config

### 4. If User Specifies a Project Code

When a specific project code is mentioned:
1. Read \`.tasks/projects/<code-lowercase>.yaml\`
2. Display phase-by-phase breakdown with task statuses
3. If \`detail_link\` field exists, also read that file for full details
4. Show time estimates vs actuals if available

### 5. Suggest Next Steps

Based on project statuses, suggest:
- Projects needing attention (in_progress with low progress)
- Next logical tasks to work on
`;
}

function getTasksCommandTemplate(): string {
  return `---
description: Show project tasks and progress (e.g., /tasks or /tasks BIL-SVC)
argument-hint: [project-code]
allowed-tools: Read, Grep, Glob
---

# Tasks - Show Project Progress

## Task

Show development task progress. Project filter: **$ARGUMENTS**

## Steps

### 1. Read Configuration

Read \`.tasks/config.yaml\` to get project settings and status definitions.

### 2. Discover Projects

Scan \`.tasks/projects/*.yaml\` to find all project YAML files.

### 3. Display Results

If \`$ARGUMENTS\` is empty:
- Show summary table of ALL projects grouped by status
- Include progress percentage

If \`$ARGUMENTS\` specifies a project code:
- Read \`.tasks/projects/<code-lowercase>.yaml\`
- Show detailed phase and task breakdown
- If project has \`detail_link\`, also read that file for full details

## Output Format

Use a clear table showing: project code, name, status emoji, progress %.
For detailed view: phase breakdown with task statuses.
`;
}

function getTaskAddCommandTemplate(): string {
  return `---
description: Add a new project or task to tracking (e.g., /task-add NEW-PROJECT)
argument-hint: <project-code> [task-description]
allowed-tools: Read, Grep, Glob, Write, Edit
---

# Task Add - Add Project or Task

## Task

Add a new item to task tracking: **$ARGUMENTS**

## Steps

### 1. Read Configuration

Read \`.tasks/config.yaml\` for status definitions and valid status keys.

### 2. Determine Action

If \`$ARGUMENTS\` is a new project code (no matching file in \`.tasks/projects/\`):
- Create a new project YAML file at \`.tasks/projects/<code-lowercase>.yaml\`
- Ask user for: name, description, status, estimated hours
- Use the ProjectSchema format:
  \`\`\`yaml
  code: NEW-CODE
  name: "Project Name"
  status: planning
  progress: 0
  description: "What this project does"
  \`\`\`

If matching an existing project:
- Read the existing YAML
- Add a new phase or task to it
- Save the updated YAML

### 3. Remind to Regenerate

After changes, tell user to run \`npx devtask generate\` to update MASTER_TASKS.md.
`;
}

function getTaskStatusCommandTemplate(): string {
  return `---
description: Update project status or progress (e.g., /task-status BIL-SVC completed 100)
argument-hint: <project-code> [status] [progress]
allowed-tools: Read, Grep, Glob, Write, Edit
---

# Task Status - Update Progress

## Task

Update status for: **$ARGUMENTS**

## Steps

### 1. Read Configuration

Read \`.tasks/config.yaml\` for valid status values.

### 2. Parse Arguments

Parse \`$ARGUMENTS\` as: <project-code> [new-status] [new-progress]

### 3. Load and Update Project

Read \`.tasks/projects/<code-lowercase>.yaml\`, update:
- \`status\` field if new status provided
- \`progress\` field if new progress provided
- \`completed_date\` automatically when status becomes completed

### 4. Save and Regenerate

Save updated YAML. Remind user to run \`npx devtask generate\`.
`;
}
