import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { generateCommand } from './commands/generate.js';
import { statusCommand } from './commands/status.js';
import { validateCommand } from './commands/validate.js';
import { addProjectCommand, addTaskCommand } from './commands/add.js';
import { importCommand } from './commands/import.js';

export function createCli(): Command {
  const program = new Command();

  program
    .name('devtask')
    .description('YAML-driven task management with auto-generated MASTER_TASKS.md')
    .version('0.1.0');

  // init
  program
    .command('init')
    .description('Initialize task tracking in the current project')
    .option('--lang <lang>', 'Language (en or zh-TW)', 'en')
    .option('--output-path <path>', 'Output path for MASTER_TASKS.md', 'docs/MASTER_TASKS.md')
    .option('-y, --yes', 'Skip prompts and use defaults')
    .option('--force', 'Reinitialize even if already set up')
    .action(async (opts) => {
      await initCommand(opts);
    });

  // generate
  program
    .command('generate')
    .alias('gen')
    .description('Generate MASTER_TASKS.md from YAML data')
    .option('--dry-run', 'Print output without writing')
    .action(async (opts) => {
      await generateCommand(opts);
    });

  // status
  program
    .command('status [project-code]')
    .alias('s')
    .description('Show project status overview')
    .option('-f, --format <format>', 'Output format (table or json)', 'table')
    .action(async (projectCode, opts) => {
      await statusCommand(projectCode, opts);
    });

  // validate
  program
    .command('validate')
    .alias('check')
    .description('Validate all YAML files against schemas')
    .action(async () => {
      await validateCommand();
    });

  // add
  const addCmd = program
    .command('add')
    .description('Add a new project or task');

  addCmd
    .command('project')
    .description('Add a new project interactively')
    .action(async () => {
      await addProjectCommand();
    });

  addCmd
    .command('task <project-code>')
    .description('Add a task to an existing project')
    .action(async (projectCode) => {
      await addTaskCommand(projectCode);
    });

  // import
  program
    .command('import <md-path>')
    .description('Import projects from an existing MASTER_TASKS.md')
    .option('--dry-run', 'Show what would be imported without writing')
    .action(async (mdPath, opts) => {
      await importCommand(mdPath, opts);
    });

  return program;
}
