import chalk from 'chalk';
import { loadConfig } from '../core/config.js';
import { loadAllProjects, saveProject } from '../core/project.js';
import type { Project, Phase } from '../schemas/project.schema.js';

export async function addProjectCommand(): Promise<void> {
  const cwd = process.cwd();
  const config = await loadConfig(cwd);
  const existingProjects = await loadAllProjects(cwd);
  const existingCodes = new Set(existingProjects.map(p => p.code));

  const { input, select } = await import('@inquirer/prompts');

  const code = (await input({
    message: 'Project code (uppercase, e.g., BIL-SVC):',
    validate: (v) => {
      const upper = v.toUpperCase();
      if (!/^[A-Z][A-Z0-9-]*$/.test(upper)) return 'Must be uppercase alphanumeric with hyphens';
      if (existingCodes.has(upper)) return `Project ${upper} already exists`;
      return true;
    },
  })).toUpperCase();

  const name = await input({ message: 'Project name:' });

  const description = await input({
    message: 'Description (optional):',
    default: '',
  });

  const status = await select({
    message: 'Initial status:',
    choices: Object.entries(config.statuses).map(([key, def]) => ({
      value: key,
      name: `${def.emoji} ${def.label}`,
    })),
    default: 'planning',
  });

  const estimatedHoursStr = await input({
    message: 'Estimated hours (optional, enter 0 to skip):',
    default: '0',
  });
  const estimatedHours = parseInt(estimatedHoursStr, 10) || undefined;

  const project: Project = {
    code,
    name,
    status,
    progress: 0,
    ...(description && { description }),
    ...(estimatedHours && { estimated_hours: estimatedHours }),
  };

  const filePath = await saveProject(project, cwd);
  console.log(chalk.green(`Created ${filePath}`));
  console.log(`Run ${chalk.cyan('npx devtask generate')} to update MASTER_TASKS.md`);
}

export async function addTaskCommand(projectCode: string): Promise<void> {
  const cwd = process.cwd();
  const config = await loadConfig(cwd);
  const projects = await loadAllProjects(cwd);
  const project = projects.find(p => p.code === projectCode.toUpperCase());

  if (!project) {
    console.log(chalk.red(`Project "${projectCode}" not found.`));
    console.log('Available:', projects.map(p => p.code).join(', '));
    return;
  }

  const { input, select } = await import('@inquirer/prompts');

  const addType = await select({
    message: 'What to add?',
    choices: [
      { value: 'phase', name: 'New phase' },
      { value: 'task', name: 'Task to existing phase' },
    ],
  });

  if (addType === 'phase') {
    const phaseId = await input({ message: 'Phase ID (e.g., phase-3):' });
    const phaseName = await input({ message: 'Phase name:' });
    const hoursStr = await input({ message: 'Estimated hours:', default: '0' });
    const hours = parseInt(hoursStr, 10) || undefined;

    const phase: Phase = {
      id: phaseId,
      name: phaseName,
      status: 'planning',
      ...(hours && { estimated_hours: hours }),
    };

    if (!project.phases) project.phases = [];
    project.phases.push(phase);

    await saveProject(project, cwd);
    console.log(chalk.green(`Added phase "${phaseId}" to ${project.code}`));
  } else {
    // Add task to existing phase
    if (!project.phases || project.phases.length === 0) {
      console.log(chalk.yellow('No phases found. Add a phase first.'));
      return;
    }

    const phaseId = await select({
      message: 'Select phase:',
      choices: project.phases.map(p => ({
        value: p.id,
        name: `${p.id}: ${p.name}`,
      })),
    });

    const phase = project.phases.find(p => p.id === phaseId);
    if (!phase) return;

    const taskId = await input({ message: 'Task ID (e.g., 3.1):' });
    const taskName = await input({ message: 'Task name:' });
    const hoursStr = await input({ message: 'Estimated hours:', default: '0' });
    const hours = parseInt(hoursStr, 10) || undefined;

    if (!phase.tasks) phase.tasks = [];
    phase.tasks.push({
      id: taskId,
      name: taskName,
      status: 'planning',
      ...(hours && { hours }),
    });

    await saveProject(project, cwd);
    console.log(chalk.green(`Added task "${taskId}" to phase "${phaseId}" in ${project.code}`));
  }

  console.log(`Run ${chalk.cyan('npx devtask generate')} to update MASTER_TASKS.md`);
}
