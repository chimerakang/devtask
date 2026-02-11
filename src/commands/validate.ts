import chalk from 'chalk';
import { loadConfig } from '../core/config.js';
import { loadAllProjects } from '../core/project.js';

export async function validateCommand(): Promise<void> {
  const cwd = process.cwd();
  let hasErrors = false;

  // Validate config
  console.log(chalk.bold('Validating .tasks/config.yaml...'));
  try {
    const config = await loadConfig(cwd);
    console.log(chalk.green('  ✓ Config is valid'));

    // Validate projects
    console.log(chalk.bold('\nValidating projects...'));
    const projects = await loadAllProjects(cwd);

    if (projects.length === 0) {
      console.log(chalk.yellow('  No projects found in .tasks/projects/'));
      return;
    }

    for (const project of projects) {
      const issues: string[] = [];

      // Check status is defined in config
      if (!config.statuses[project.status]) {
        issues.push(`Unknown status "${project.status}" (valid: ${Object.keys(config.statuses).join(', ')})`);
      }

      // Check phase statuses
      if (project.phases) {
        for (const phase of project.phases) {
          if (!config.statuses[phase.status]) {
            issues.push(`Phase ${phase.id}: unknown status "${phase.status}"`);
          }
        }
      }

      // Check progress bounds
      if (project.progress < 0 || project.progress > 100) {
        issues.push(`Progress ${project.progress}% out of bounds (0-100)`);
      }

      // Check completed projects have date
      if (config.completed_statuses.includes(project.status) && !project.completed_date) {
        issues.push('Completed project missing completed_date');
      }

      // Check cancelled projects have reason
      if (config.cancelled_statuses.includes(project.status) && !project.cancelled_reason) {
        issues.push('Cancelled project missing cancelled_reason');
      }

      if (issues.length > 0) {
        hasErrors = true;
        console.log(chalk.red(`  ✗ ${project.code}:`));
        for (const issue of issues) {
          console.log(chalk.red(`    - ${issue}`));
        }
      } else {
        console.log(chalk.green(`  ✓ ${project.code}`));
      }
    }

    console.log(`\n${projects.length} projects validated.`);
  } catch (err) {
    hasErrors = true;
    console.log(chalk.red(`  ✗ ${err instanceof Error ? err.message : err}`));
  }

  if (hasErrors) {
    process.exitCode = 1;
  }
}
