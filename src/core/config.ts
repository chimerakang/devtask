import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { join } from 'node:path';
import { ConfigSchema, type Config } from '../schemas/config.schema.js';
import { readTextFile, writeTextFile, fileExists } from '../utils/fs.js';

const CONFIG_DIR = '.tasks';
const CONFIG_FILE = 'config.yaml';

export function getConfigDir(cwd: string = process.cwd()): string {
  return join(cwd, CONFIG_DIR);
}

export function getConfigPath(cwd: string = process.cwd()): string {
  return join(cwd, CONFIG_DIR, CONFIG_FILE);
}

export function getProjectsDir(cwd: string = process.cwd()): string {
  return join(cwd, CONFIG_DIR, 'projects');
}

export async function configExists(cwd: string = process.cwd()): Promise<boolean> {
  return fileExists(getConfigPath(cwd));
}

export async function loadConfig(cwd: string = process.cwd()): Promise<Config> {
  const configPath = getConfigPath(cwd);

  if (!(await fileExists(configPath))) {
    throw new Error(
      `No .tasks/config.yaml found in ${cwd}. Run "devtask init" first.`
    );
  }

  const raw = await readTextFile(configPath);
  const data = parseYaml(raw);
  return ConfigSchema.parse(data);
}

export async function saveConfig(config: Config, cwd: string = process.cwd()): Promise<void> {
  const configPath = getConfigPath(cwd);
  const content = stringifyYaml(config, { lineWidth: 120 });
  await writeTextFile(configPath, content);
}

export function getStatusEmoji(config: Config, statusKey: string): string {
  return config.statuses[statusKey]?.emoji ?? '❓';
}

export function getStatusLabel(config: Config, statusKey: string): string {
  return config.statuses[statusKey]?.label ?? statusKey;
}

export function getStatusDisplay(config: Config, statusKey: string): string {
  const emoji = getStatusEmoji(config, statusKey);
  const label = getStatusLabel(config, statusKey);
  return `${emoji} ${label}`;
}

/** Sort priority for statuses: in_progress first, then testing, planning, paused */
export function getStatusPriority(config: Config, statusKey: string): number {
  const priorities: Record<string, number> = {};
  let i = 0;
  // Active statuses get lower numbers (higher priority)
  for (const s of config.active_statuses) {
    priorities[s] = i++;
  }
  // Completed
  for (const s of config.completed_statuses) {
    priorities[s] = i++;
  }
  // Cancelled
  for (const s of config.cancelled_statuses) {
    priorities[s] = i++;
  }
  return priorities[statusKey] ?? 999;
}
