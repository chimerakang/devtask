import chalk from 'chalk';
import { loadConfig, getProjectsDir } from '../core/config.js';
import { saveProject } from '../core/project.js';
import { readTextFile, fileExists } from '../utils/fs.js';
import { parseMarkdownToProjects } from '../parsers/markdown-parser.js';

interface ImportOptions {
  dryRun?: boolean;
}

export async function importCommand(mdPath: string, options: ImportOptions): Promise<void> {
  const cwd = process.cwd();

  if (!(await fileExists(mdPath))) {
    console.log(chalk.red(`File not found: ${mdPath}`));
    return;
  }

  const config = await loadConfig(cwd);
  const content = await readTextFile(mdPath);
  const { projects, warnings } = parseMarkdownToProjects(content);

  if (warnings.length > 0) {
    console.log(chalk.yellow('\nWarnings:'));
    for (const w of warnings) {
      console.log(chalk.yellow(`  - ${w}`));
    }
  }

  if (projects.length === 0) {
    console.log(chalk.yellow('No projects found in the markdown file.'));
    return;
  }

  console.log(chalk.bold(`\nFound ${projects.length} projects:\n`));

  for (const project of projects) {
    const statusDef = config.statuses[project.status];
    const emoji = statusDef?.emoji ?? '❓';

    console.log(`  ${emoji} ${project.code.padEnd(22)} ${(project.progress + '%').padEnd(5)} ${project.name}`);

    if (project.phases && project.phases.length > 0) {
      console.log(chalk.dim(`     ${project.phases.length} phases`));
    }
  }

  if (options.dryRun) {
    console.log(chalk.yellow('\n(dry run — no files written)'));
    return;
  }

  console.log('');

  for (const project of projects) {
    const filePath = await saveProject(project, cwd);
    console.log(chalk.green('  Created'), filePath.replace(cwd + '/', ''));
  }

  console.log(`\n${chalk.green('Done!')} ${projects.length} projects imported.`);
  console.log(`Run ${chalk.cyan('npx devtask validate')} to check for issues.`);
  console.log(`Run ${chalk.cyan('npx devtask generate')} to regenerate MASTER_TASKS.md.`);
}
