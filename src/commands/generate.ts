import { join } from 'node:path';
import chalk from 'chalk';
import { loadConfig } from '../core/config.js';
import { loadAllProjects } from '../core/project.js';
import { generateMasterTasks } from '../generators/master-tasks.js';
import { writeTextFile, fileExists } from '../utils/fs.js';

interface GenerateOptions {
  dryRun?: boolean;
}

export async function generateCommand(options: GenerateOptions): Promise<void> {
  const cwd = process.cwd();

  const config = await loadConfig(cwd);
  const projects = await loadAllProjects(cwd);

  if (projects.length === 0) {
    console.log(chalk.yellow('No projects found in .tasks/projects/'));
    console.log(`Run ${chalk.cyan('npx devtask add project')} to add one.`);
    return;
  }

  const markdown = generateMasterTasks(config, projects);
  const outputPath = join(cwd, config.project.output_path);

  if (options.dryRun) {
    console.log(chalk.bold('--- Generated MASTER_TASKS.md (dry run) ---'));
    console.log(markdown);
    return;
  }

  const existed = await fileExists(outputPath);
  await writeTextFile(outputPath, markdown);

  const action = existed ? 'Updated' : 'Created';
  console.log(chalk.green(`${action} ${config.project.output_path}`));
  console.log(`  ${projects.length} projects, ${markdown.split('\n').length} lines`);
}
