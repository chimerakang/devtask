import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { join, basename } from 'node:path';
import { ProjectSchema, type Project } from '../schemas/project.schema.js';
import { type Config } from '../schemas/config.schema.js';
import { readTextFile, writeTextFile, listYamlFiles } from '../utils/fs.js';
import { getProjectsDir } from './config.js';

export async function loadProject(filePath: string): Promise<Project> {
  const raw = await readTextFile(filePath);
  const data = parseYaml(raw);
  return ProjectSchema.parse(data);
}

export async function loadAllProjects(cwd: string = process.cwd()): Promise<Project[]> {
  const dir = getProjectsDir(cwd);
  const files = await listYamlFiles(dir);
  const projects: Project[] = [];

  for (const file of files) {
    try {
      const project = await loadProject(file);
      projects.push(project);
    } catch (err) {
      const name = basename(file);
      console.warn(`Warning: Failed to parse ${name}: ${err instanceof Error ? err.message : err}`);
    }
  }

  return projects;
}

export async function saveProject(project: Project, cwd: string = process.cwd()): Promise<string> {
  const dir = getProjectsDir(cwd);
  const filename = project.code.toLowerCase() + '.yaml';
  const filePath = join(dir, filename);
  const content = stringifyYaml(project, { lineWidth: 120 });
  await writeTextFile(filePath, content);
  return filePath;
}

export function sortProjects(projects: Project[], config: Config): Project[] {
  const statusOrder = new Map<string, number>();
  let i = 0;
  for (const s of config.active_statuses) statusOrder.set(s, i++);
  for (const s of config.completed_statuses) statusOrder.set(s, i++);
  for (const s of config.cancelled_statuses) statusOrder.set(s, i++);

  return [...projects].sort((a, b) => {
    const aPri = statusOrder.get(a.status) ?? 999;
    const bPri = statusOrder.get(b.status) ?? 999;
    if (aPri !== bPri) return aPri - bPri;
    return a.code.localeCompare(b.code);
  });
}

export function filterByStatus(projects: Project[], statusKeys: string[]): Project[] {
  return projects.filter(p => statusKeys.includes(p.status));
}
