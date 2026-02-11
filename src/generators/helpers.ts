import type { Config } from '../schemas/config.schema.js';
import type { Project, Phase } from '../schemas/project.schema.js';
import type { I18nStrings } from '../i18n/index.js';

/**
 * Generate a markdown table row with proper escaping.
 */
export function tableRow(cells: string[]): string {
  return '| ' + cells.join(' | ') + ' |';
}

/**
 * Generate a markdown table separator row.
 */
export function tableSeparator(count: number): string {
  return '| ' + Array(count).fill('------').join(' | ') + ' |';
}

/**
 * Format progress as percentage string.
 */
export function formatProgress(progress: number): string {
  return `${progress}%`;
}

/**
 * Format hours display (e.g., "146h / 160h").
 */
export function formatHours(actual?: number, estimated?: number): string {
  if (actual && estimated) return `${actual}h / ${estimated}h`;
  if (estimated) return `${estimated}h`;
  if (actual) return `${actual}h`;
  return '';
}

/**
 * Make a relative markdown link.
 */
export function mdLink(text: string, href: string): string {
  return `[${text}](${href})`;
}

/**
 * Generate the active projects summary table.
 */
export function generateActiveProjectTable(
  config: Config,
  projects: Project[],
  t: I18nStrings
): string {
  const lines: string[] = [];

  lines.push(tableRow([t.projectCode, t.projectName, t.status, t.progress, t.detailTasks]));
  lines.push(tableSeparator(5));

  for (const p of projects) {
    const statusDef = config.statuses[p.status];
    const statusDisplay = statusDef
      ? `${statusDef.emoji} ${statusDef.label}`
      : p.status;

    const detailCell = p.detail_link
      ? mdLink(`📋 ${t.detailTasks}`, p.detail_link)
      : '-';

    const progressCell = formatProgress(p.progress);

    lines.push(tableRow([p.code, p.name, statusDisplay, progressCell, detailCell]));
  }

  return lines.join('\n');
}

/**
 * Generate the completed projects summary table.
 */
export function generateCompletedProjectTable(
  config: Config,
  projects: Project[],
  t: I18nStrings
): string {
  const lines: string[] = [];

  lines.push(tableRow([t.projectCode, t.projectName, t.completionDate, t.detailTasks]));
  lines.push(tableSeparator(4));

  for (const p of projects) {
    const detailCell = p.detail_link
      ? mdLink(`📋 ${t.detailTasks}`, p.detail_link)
      : '-';

    lines.push(tableRow([p.code, p.name, p.completed_date ?? '-', detailCell]));
  }

  return lines.join('\n');
}

/**
 * Generate the cancelled projects summary table.
 */
export function generateCancelledProjectTable(
  projects: Project[],
  t: I18nStrings
): string {
  const lines: string[] = [];

  lines.push(tableRow([t.projectCode, t.projectName, t.cancelDate, t.reason]));
  lines.push(tableSeparator(4));

  for (const p of projects) {
    lines.push(tableRow([
      p.code,
      p.name,
      p.cancelled_date ?? '-',
      p.cancelled_reason ?? '-',
    ]));
  }

  return lines.join('\n');
}

/**
 * Generate a single project detail section.
 */
export function generateProjectDetail(
  config: Config,
  project: Project,
  t: I18nStrings
): string {
  const lines: string[] = [];
  const statusDisplay = config.statuses[project.status]
    ? `${config.statuses[project.status].emoji} ${config.statuses[project.status].label}`
    : project.status;

  // Title
  lines.push(`### ${project.code}: ${project.name}`);
  lines.push('');

  // Status line
  const statusLine = [`**${t.status}**: ${statusDisplay}`];
  statusLine.push(`**${t.progress}**: ${formatProgress(project.progress)}`);
  if (project.estimated_hours) {
    const hoursStr = formatHours(project.actual_hours, project.estimated_hours);
    if (hoursStr) statusLine.push(`(${hoursStr})`);
  }
  lines.push(statusLine.join(' | '));
  lines.push('');

  // Links
  if (project.detail_link || project.plan_link) {
    if (project.detail_link) {
      lines.push(`📋 **${t.detailTasks}**: ${mdLink(t.detailTasks, project.detail_link)}`);
    }
    if (project.plan_link) {
      lines.push(`📝 **Plan**: ${mdLink('Plan', project.plan_link)}`);
    }
    lines.push('');
  }

  // Description
  if (project.description) {
    lines.push(`**${t.goal}**: ${project.description}`);
    lines.push('');
  }

  // Phases table
  if (project.phases && project.phases.length > 0) {
    lines.push(tableRow([t.phase, t.status, t.description]));
    lines.push(tableSeparator(3));

    for (const phase of project.phases) {
      const phaseStatus = config.statuses[phase.status]
        ? `${config.statuses[phase.status].emoji} ${config.statuses[phase.status].label}`
        : phase.status;
      lines.push(tableRow([phase.id, phaseStatus, phase.name]));
    }

    lines.push('');
  }

  // Features list (alternative to phases)
  if (project.features && project.features.length > 0 && !project.phases?.length) {
    lines.push(tableRow([t.projectName, t.status]));
    lines.push(tableSeparator(2));

    for (const f of project.features) {
      const fStatus = config.statuses[f.status]
        ? `${config.statuses[f.status].emoji} ${config.statuses[f.status].label}`
        : f.status;
      lines.push(tableRow([f.name, fStatus]));
    }

    lines.push('');
  }

  // Estimated hours
  if (project.estimated_hours) {
    lines.push(`**${t.estimatedHours}**: ${project.estimated_hours}h`);
    lines.push('');
  }

  // Latest update
  if (project.latest_update) {
    const dateStr = project.latest_update_date ? ` (${project.latest_update_date})` : '';
    lines.push(`**${t.latestUpdate}**${dateStr}:`);
    // Handle multi-line update (indent as list items)
    const updateLines = project.latest_update.trim().split('\n');
    for (const line of updateLines) {
      const trimmed = line.trim();
      if (trimmed) {
        lines.push(trimmed.startsWith('-') ? trimmed : `- ${trimmed}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generate the status legend table.
 */
export function generateStatusLegend(config: Config, t: I18nStrings): string {
  const lines: string[] = [];

  lines.push(`## ${t.statusLegendTitle}`);
  lines.push('');
  lines.push(tableRow([t.statusLabel, t.symbol, t.statusDescription]));
  lines.push(tableSeparator(3));

  for (const [key, def] of Object.entries(config.statuses)) {
    lines.push(tableRow([def.label, def.emoji, def.description ?? key]));
  }

  return lines.join('\n');
}
