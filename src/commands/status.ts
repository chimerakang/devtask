import chalk from 'chalk';
import { loadConfig } from '../core/config.js';
import { loadAllProjects, filterByStatus } from '../core/project.js';

interface StatusOptions {
  format?: 'table' | 'json';
}

export async function statusCommand(projectCode: string | undefined, options: StatusOptions): Promise<void> {
  const cwd = process.cwd();
  const config = await loadConfig(cwd);
  const allProjects = await loadAllProjects(cwd);

  if (allProjects.length === 0) {
    console.log(chalk.yellow('No projects found.'));
    return;
  }

  // JSON format
  if (options.format === 'json') {
    if (projectCode) {
      const project = allProjects.find(p => p.code === projectCode.toUpperCase());
      console.log(JSON.stringify(project ?? null, null, 2));
    } else {
      console.log(JSON.stringify(allProjects, null, 2));
    }
    return;
  }

  // Single project detail
  if (projectCode) {
    const project = allProjects.find(p => p.code === projectCode.toUpperCase());
    if (!project) {
      console.log(chalk.red(`Project "${projectCode}" not found.`));
      console.log('Available:', allProjects.map(p => p.code).join(', '));
      return;
    }

    const statusDef = config.statuses[project.status];
    const emoji = statusDef?.emoji ?? '❓';

    console.log(chalk.bold(`\n${project.code}: ${project.name}`));
    console.log(`Status:   ${emoji} ${statusDef?.label ?? project.status}`);
    console.log(`Progress: ${project.progress}%`);
    if (project.estimated_hours) {
      console.log(`Hours:    ${project.actual_hours ?? '?'}h / ${project.estimated_hours}h`);
    }

    if (project.phases && project.phases.length > 0) {
      console.log(`\nPhases:`);
      for (const phase of project.phases) {
        const pStatus = config.statuses[phase.status];
        const pEmoji = pStatus?.emoji ?? '❓';
        console.log(`  ${pEmoji} ${phase.id}: ${phase.name}`);
      }
    }

    if (project.latest_update) {
      console.log(`\nLatest update (${project.latest_update_date ?? 'N/A'}):`);
      for (const line of project.latest_update.trim().split('\n')) {
        console.log(`  ${line.trim()}`);
      }
    }
    return;
  }

  // Summary table
  console.log(chalk.bold(`\n${config.project.name} - Project Status\n`));

  const active = filterByStatus(allProjects, config.active_statuses);
  const completed = filterByStatus(allProjects, config.completed_statuses);
  const cancelled = filterByStatus(allProjects, config.cancelled_statuses);

  if (active.length > 0) {
    console.log(chalk.bold('Active:'));
    for (const p of active) {
      const s = config.statuses[p.status];
      const bar = progressBar(p.progress);
      console.log(`  ${s?.emoji ?? '❓'} ${p.code.padEnd(20)} ${bar} ${p.progress}%  ${p.name}`);
    }
    console.log('');
  }

  if (completed.length > 0) {
    console.log(chalk.dim(`Completed: ${completed.length} projects`));
    for (const p of completed) {
      console.log(chalk.dim(`  ✅ ${p.code.padEnd(20)} ${p.completed_date ?? ''}  ${p.name}`));
    }
    console.log('');
  }

  if (cancelled.length > 0) {
    console.log(chalk.dim(`Cancelled: ${cancelled.length} projects`));
  }

  console.log(chalk.dim(`Total: ${allProjects.length} projects`));
}

function progressBar(percent: number, width: number = 20): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return chalk.green('█'.repeat(filled)) + chalk.dim('░'.repeat(empty));
}
