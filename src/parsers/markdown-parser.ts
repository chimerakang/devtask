import type { Project } from '../schemas/project.schema.js';

interface ImportResult {
  projects: Project[];
  warnings: string[];
}

type SectionContext = 'active' | 'completed' | 'cancelled' | 'unknown';

/**
 * Parse an existing MASTER_TASKS.md into Project objects.
 * This is best-effort parsing — complex formatting may require manual adjustment.
 */
export function parseMarkdownToProjects(content: string): ImportResult {
  const warnings: string[] = [];

  // 1. Parse summary tables with section context awareness
  const tableProjects = parseSectionAwareTables(content, warnings);

  // 2. Parse detail sections (### CODE: Name)
  const detailSections = parseDetailSections(content);

  // 3. Merge table data with detail sections
  for (const project of tableProjects) {
    const detail = detailSections.get(project.code);
    if (detail) {
      // Merge detail into project (detail enriches, doesn't override status)
      if (detail.description) project.description = detail.description;
      if (detail.estimated_hours) project.estimated_hours = detail.estimated_hours;
      if (detail.plan_link) project.plan_link = detail.plan_link;
      if (detail.phases && detail.phases.length > 0) project.phases = detail.phases;
    }
  }

  return { projects: tableProjects, warnings };
}

/**
 * Parse tables with awareness of which section (active/completed/cancelled) they belong to.
 */
function parseSectionAwareTables(content: string, warnings: string[]): Project[] {
  const projects: Project[] = [];
  const seen = new Set<string>();
  const lines = content.split('\n');
  let sectionContext: SectionContext = 'unknown';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect section headings to determine context
    if (line.match(/^###?\s/)) {
      sectionContext = detectSectionContext(line);
    }

    // Skip non-table lines
    const trimmed = line.trim();
    if (!trimmed.startsWith('|') || trimmed.includes('------')) continue;

    // Skip header rows
    if (isHeaderRow(trimmed)) continue;

    const cells = trimmed.split('|')
      .map(c => c.trim())
      .filter(c => c.length > 0);

    if (cells.length < 3) continue;

    const project = tryParseProjectRow(cells, sectionContext, warnings);
    if (project && !seen.has(project.code)) {
      seen.add(project.code);
      projects.push(project);
    }
  }

  return projects;
}

/**
 * Detect section context from a heading line.
 */
function detectSectionContext(heading: string): SectionContext {
  const t = heading.toLowerCase();

  // Completed section
  if (t.includes('已完成') || t.includes('completed')) return 'completed';
  // Cancelled section
  if (t.includes('已取消') || t.includes('cancelled')) return 'cancelled';
  // Active section
  if (t.includes('進行中') || t.includes('active') || t.includes('開發中')) return 'active';

  return 'unknown';
}

/**
 * Check if a table row is a header row by inspecting the first cell.
 * We only check the first cell to avoid false positives from data like "In Progress"
 * which contains "Progress".
 */
function isHeaderRow(line: string): boolean {
  const cells = line.split('|').map(c => c.trim()).filter(c => c.length > 0);
  if (cells.length === 0) return false;

  const firstCell = cells[0];
  const firstCellHeaderKeywords = [
    '專案代號', 'Code', '代號',
  ];

  // If the first cell is a known header keyword, it's a header row
  if (firstCellHeaderKeywords.some(k => firstCell.includes(k))) return true;

  // Also check if the second cell contains header-like text (when first cell is generic)
  if (cells.length >= 2) {
    const secondCell = cells[1];
    const secondCellHeaderKeywords = ['名稱', 'Name'];
    const thirdCellHeaderKeywords = ['狀態', 'Status', '完成日期', 'Completed', '取消日期', 'Date'];

    if (secondCellHeaderKeywords.some(k => secondCell.includes(k)) &&
        cells.length >= 3 && thirdCellHeaderKeywords.some(k => cells[2].includes(k))) {
      return true;
    }
  }

  return false;
}

/**
 * Try to parse a table row into a Project with section context.
 */
function tryParseProjectRow(
  cells: string[],
  sectionContext: SectionContext,
  _warnings: string[]
): Project | null {
  const code = cells[0].trim();

  // Validate code format (uppercase with hyphens, at least 2 chars)
  if (!/^[A-Z][A-Z0-9-]+$/.test(code)) return null;

  const name = cells[1].trim();
  if (!name) return null;

  const project: Project = {
    code,
    name,
    status: 'planning',
    progress: 0,
  };

  // Use section context as base status
  if (sectionContext === 'completed') {
    project.status = 'completed';
  } else if (sectionContext === 'cancelled') {
    project.status = 'cancelled';
  }

  // Check cells for progress percentage
  for (const cell of cells) {
    const progressMatch = cell.match(/(\d+)%/);
    if (progressMatch) {
      project.progress = parseInt(progressMatch[1], 10);
    }
  }

  // Check for status emojis/text (overrides section context if found)
  for (const cell of cells) {
    const status = detectStatus(cell);
    if (status) {
      project.status = status;
    }
  }

  // Check for detail links
  for (const cell of cells) {
    const linkMatch = cell.match(/\[.*?\]\((.*?)\)/);
    if (linkMatch) {
      project.detail_link = linkMatch[1];
    }
  }

  // Check for dates (YYYY-MM-DD format)
  for (const cell of cells) {
    const dateMatch = cell.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      if (project.status === 'completed') {
        project.completed_date = dateMatch[1];
      } else if (project.status === 'cancelled') {
        project.cancelled_date = dateMatch[1];
      }
    }
  }

  // Check for cancelled reason (last cell if cancelled, not a link or date)
  if (project.status === 'cancelled' && cells.length >= 4) {
    const lastCell = cells[cells.length - 1].trim();
    if (lastCell && !lastCell.includes('[') && !lastCell.match(/\d{4}-\d{2}-\d{2}/)) {
      project.cancelled_reason = lastCell;
    }
  }

  return project;
}

/**
 * Detect status from a cell's text/emoji content.
 */
function detectStatus(text: string): string | null {
  const t = text.toLowerCase();

  // Emoji-based detection (most reliable)
  if (text.includes('🔄')) return 'in_progress';
  if (text.includes('🧪')) return 'testing';
  if (text.includes('⏸️') || text.includes('⏸')) return 'paused';
  if (text.includes('❌')) return 'cancelled';
  // ✅ can appear in both status and phase descriptions — only treat as completed
  // if it's the primary status indicator
  if (text.includes('✅') && !text.includes('Phase')) return 'completed';

  // Text-based detection (for cells without emoji)
  if (t.includes('待 uat') || t.includes('待uat')) return 'testing';
  if (t.includes('開發中') || t.includes('in progress') || t.includes('進行中')) return 'in_progress';
  if (t.includes('規劃') || t.includes('planning')) return 'planning';
  if (t.includes('測試') || t.includes('testing')) return 'testing';
  if (t.includes('暫停') || t.includes('paused')) return 'paused';
  if (t.includes('研究完成')) return 'planning';

  // Special: "✅ Phase N 完成" in active table means still in_progress overall
  if (text.includes('✅') && t.includes('phase') && t.includes('完成')) return 'in_progress';
  // "✅ 核心完成" similarly
  if (text.includes('✅') && t.includes('核心完成')) return 'in_progress';

  return null;
}

/**
 * Parse ### heading detail sections into a map of code -> partial project data.
 */
function parseDetailSections(content: string): Map<string, Partial<Project>> {
  const sections = new Map<string, Partial<Project>>();
  const lines = content.split('\n');

  let currentCode: string | null = null;
  let currentLines: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^###\s+([A-Z][A-Z0-9-]+):\s+(.+)/);
    if (headingMatch) {
      if (currentCode) {
        sections.set(currentCode, parseDetailContent(currentLines));
      }
      currentCode = headingMatch[1];
      currentLines = [];
      continue;
    }

    if (line.match(/^##\s/) && currentCode) {
      sections.set(currentCode, parseDetailContent(currentLines));
      currentCode = null;
      currentLines = [];
      continue;
    }

    if (currentCode) {
      currentLines.push(line);
    }
  }

  if (currentCode) {
    sections.set(currentCode, parseDetailContent(currentLines));
  }

  return sections;
}

/**
 * Parse the content lines of a detail section.
 */
function parseDetailContent(lines: string[]): Partial<Project> {
  const result: Partial<Project> = {};

  for (const line of lines) {
    const goalMatch = line.match(/\*\*(?:目標|Goal)\*\*[:：]\s*(.+)/);
    if (goalMatch) {
      result.description = goalMatch[1].trim();
    }

    const hoursMatch = line.match(/\*\*(?:預估工時|Est\.?\s*Hours?)\*\*[:：]\s*(\d+)/);
    if (hoursMatch) {
      result.estimated_hours = parseInt(hoursMatch[1], 10);
    }

    const planMatch = line.match(/📝.*?\[.*?\]\((.*?)\)/);
    if (planMatch) {
      result.plan_link = planMatch[1];
    }
  }

  const phases = parsePhasesFromLines(lines);
  if (phases.length > 0) {
    result.phases = phases;
  }

  return result;
}

/**
 * Parse phase rows from a detail section's table.
 */
function parsePhasesFromLines(lines: string[]): Array<{ id: string; name: string; status: string }> {
  const phases: Array<{ id: string; name: string; status: string }> = [];

  for (const line of lines) {
    if (!line.trim().startsWith('|')) continue;
    if (line.includes('------')) continue;

    const cells = line.split('|').map(c => c.trim()).filter(c => c.length > 0);
    if (cells.length < 2) continue;

    // Skip header rows
    if (cells[0].includes('Phase') && cells.length > 1 &&
        (cells[1].includes('狀態') || cells[1].includes('Status'))) continue;

    // Try to detect phase row: "Phase N" or specific phase patterns
    const phaseIdMatch = cells[0].match(/(?:Phase\s+)?(\d+)/i);
    if (phaseIdMatch) {
      const rawStatus = cells[1];
      const status = detectPhaseStatus(rawStatus) ?? 'planning';
      const name = cells.length > 2 ? cells[2] : rawStatus.replace(/[📋🔄🧪✅⏸️❌⬜]/g, '').trim();

      phases.push({
        id: `phase-${phaseIdMatch[1]}`,
        name,
        status,
      });
    }
  }

  return phases;
}

/**
 * Detect phase-level status (different from project-level).
 */
function detectPhaseStatus(text: string): string | null {
  if (text.includes('✅')) return 'completed';
  if (text.includes('🔄')) return 'in_progress';
  if (text.includes('🧪')) return 'testing';
  if (text.includes('⬜')) return 'planning';
  if (text.includes('⏸')) return 'paused';

  const t = text.toLowerCase();
  if (t.includes('已完成') || t.includes('completed')) return 'completed';
  if (t.includes('進行中') || t.includes('in progress')) return 'in_progress';
  if (t.includes('待開始') || t.includes('not started')) return 'planning';

  return null;
}
