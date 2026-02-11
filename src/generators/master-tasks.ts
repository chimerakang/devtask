import type { Config } from '../schemas/config.schema.js';
import type { Project } from '../schemas/project.schema.js';
import { getI18n } from '../i18n/index.js';
import { sortProjects, filterByStatus } from '../core/project.js';
import {
  generateActiveProjectTable,
  generateCompletedProjectTable,
  generateCancelledProjectTable,
  generateProjectDetail,
  generateStatusLegend,
} from './helpers.js';

/**
 * Generate complete MASTER_TASKS.md content from config and projects.
 * Output is deterministic: same input always produces identical output.
 */
export function generateMasterTasks(config: Config, projects: Project[]): string {
  const t = getI18n(config.project.lang);
  const sorted = sortProjects(projects, config);
  const sections: string[] = [];

  // 1. Title
  sections.push(`# ${config.project.name} ${t.masterTasksTitle}`);
  sections.push('');

  // 2. Custom header
  if (config.generate.header_text) {
    sections.push(config.generate.header_text.trim());
    sections.push('');
  }

  sections.push('---');
  sections.push('');

  // 3. Quick navigation
  sections.push(`## ${t.quickNav}`);
  sections.push('');

  // 3a. Active projects
  const activeProjects = filterByStatus(sorted, config.active_statuses);
  if (activeProjects.length > 0) {
    sections.push(`### ${config.statuses['in_progress']?.emoji ?? '🔄'} ${t.activeProjects}`);
    sections.push('');
    sections.push(generateActiveProjectTable(config, activeProjects, t));
    sections.push('');
  }

  // 3b. Completed projects
  const completedProjects = filterByStatus(sorted, config.completed_statuses)
    .sort((a, b) => (b.completed_date ?? '').localeCompare(a.completed_date ?? ''));
  if (completedProjects.length > 0) {
    sections.push(`### ${config.statuses['completed']?.emoji ?? '✅'} ${t.completedProjects}`);
    sections.push('');
    sections.push(generateCompletedProjectTable(config, completedProjects, t));
    sections.push('');
  }

  // 3c. Cancelled projects
  const cancelledProjects = filterByStatus(sorted, config.cancelled_statuses);
  if (cancelledProjects.length > 0) {
    sections.push(`### ${config.statuses['cancelled']?.emoji ?? '❌'} ${t.cancelledProjects}`);
    sections.push('');
    sections.push(generateCancelledProjectTable(cancelledProjects, t));
    sections.push('');
  }

  // 4. Status legend
  if (config.generate.include_status_legend) {
    sections.push('---');
    sections.push('');
    sections.push(generateStatusLegend(config, t));
    sections.push('');
  }

  // 5. Active project details
  if (activeProjects.length > 0) {
    sections.push('---');
    sections.push('');
    sections.push(`## ${t.activeProjectDetails}`);
    sections.push('');
    for (const project of activeProjects) {
      sections.push(generateProjectDetail(config, project, t));
      sections.push('---');
      sections.push('');
    }
  }

  // 6. Completed project details
  if (config.generate.include_completed_details && completedProjects.length > 0) {
    sections.push(`## ${t.completedProjectSummaries}`);
    sections.push('');
    for (const project of completedProjects) {
      sections.push(generateProjectDetail(config, project, t));
      sections.push('---');
      sections.push('');
    }
  }

  // 7. Custom footer
  if (config.generate.footer_text) {
    sections.push(config.generate.footer_text.trim());
    sections.push('');
  }

  // Ensure single trailing newline
  return sections.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}
