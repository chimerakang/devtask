import { describe, it, expect } from 'vitest';
import { generateMasterTasks } from '../../src/generators/master-tasks.js';
import type { Config } from '../../src/schemas/config.schema.js';
import type { Project } from '../../src/schemas/project.schema.js';

const testConfig: Config = {
  version: 1,
  project: {
    name: 'Test Project',
    output_path: 'docs/MASTER_TASKS.md',
    tasks_dir: 'docs/tasks/',
    specs_dir: 'docs/specs/',
    lang: 'en',
  },
  statuses: {
    planning: { emoji: '📋', label: 'Planning' },
    in_progress: { emoji: '🔄', label: 'In Progress' },
    testing: { emoji: '🧪', label: 'Testing' },
    completed: { emoji: '✅', label: 'Completed' },
    paused: { emoji: '⏸️', label: 'Paused' },
    cancelled: { emoji: '❌', label: 'Cancelled' },
  },
  active_statuses: ['planning', 'in_progress', 'testing', 'paused'],
  completed_statuses: ['completed'],
  cancelled_statuses: ['cancelled'],
  generate: {
    include_status_legend: true,
    include_completed_details: true,
    include_doc_index: true,
  },
};

describe('generateMasterTasks', () => {
  it('generates empty project list', () => {
    const result = generateMasterTasks(testConfig, []);
    expect(result).toContain('# Test Project Master Task List');
    expect(result).toContain('---');
  });

  it('generates with active projects', () => {
    const projects: Project[] = [
      {
        code: 'PROJ-A',
        name: 'Project Alpha',
        status: 'in_progress',
        progress: 50,
        description: 'Test project A',
      },
      {
        code: 'PROJ-B',
        name: 'Project Beta',
        status: 'planning',
        progress: 10,
      },
    ];

    const result = generateMasterTasks(testConfig, projects);
    expect(result).toContain('PROJ-A');
    expect(result).toContain('PROJ-B');
    expect(result).toContain('Project Alpha');
    expect(result).toContain('50%');
    expect(result).toContain('🔄 In Progress');
  });

  it('separates active, completed, and cancelled projects', () => {
    const projects: Project[] = [
      { code: 'ACTIVE', name: 'Active', status: 'in_progress', progress: 50 },
      { code: 'DONE', name: 'Done', status: 'completed', progress: 100, completed_date: '2026-01-01' },
      { code: 'GONE', name: 'Gone', status: 'cancelled', progress: 0, cancelled_date: '2026-01-02', cancelled_reason: 'No longer needed' },
    ];

    const result = generateMasterTasks(testConfig, projects);

    expect(result).toContain('Active Projects');
    expect(result).toContain('Completed Projects');
    expect(result).toContain('Cancelled Projects');
    expect(result).toContain('No longer needed');
  });

  it('includes phases in project detail', () => {
    const projects: Project[] = [
      {
        code: 'PHASED',
        name: 'Phased Project',
        status: 'in_progress',
        progress: 66,
        phases: [
          { id: 'phase-1', name: 'Setup', status: 'completed' },
          { id: 'phase-2', name: 'Development', status: 'in_progress' },
          { id: 'phase-3', name: 'Testing', status: 'planning' },
        ],
      },
    ];

    const result = generateMasterTasks(testConfig, projects);
    expect(result).toContain('phase-1');
    expect(result).toContain('Setup');
    expect(result).toContain('✅ Completed');
    expect(result).toContain('phase-3');
  });

  it('sorts projects by status then code', () => {
    const projects: Project[] = [
      { code: 'ZZZ', name: 'Last', status: 'planning', progress: 0 },
      { code: 'AAA', name: 'First', status: 'in_progress', progress: 50 },
      { code: 'BBB', name: 'Second', status: 'planning', progress: 0 },
    ];

    const result = generateMasterTasks(testConfig, projects);
    const lines = result.split('\n');
    const projectRows = lines.filter(l => l.includes('| AAA') || l.includes('| BBB') || l.includes('| ZZZ'));

    // in_progress (AAA) should come after planning (BBB, ZZZ) because planning is index 0
    // Actually based on active_statuses order: planning=0, in_progress=1
    const bbbIndex = result.indexOf('BBB');
    const zzzIndex = result.indexOf('ZZZ');
    const aaaIndex = result.indexOf('AAA');
    expect(bbbIndex).toBeLessThan(aaaIndex);
    expect(zzzIndex).toBeLessThan(aaaIndex);
  });

  it('is deterministic - same input always same output', () => {
    const projects: Project[] = [
      { code: 'B-PROJ', name: 'B', status: 'in_progress', progress: 50 },
      { code: 'A-PROJ', name: 'A', status: 'planning', progress: 10 },
      { code: 'C-PROJ', name: 'C', status: 'completed', progress: 100, completed_date: '2026-01-01' },
    ];

    const result1 = generateMasterTasks(testConfig, projects);
    const result2 = generateMasterTasks(testConfig, projects);
    expect(result1).toBe(result2);
  });

  it('generates zh-TW output', () => {
    const zhConfig = { ...testConfig, project: { ...testConfig.project, lang: 'zh-TW' as const } };
    const projects: Project[] = [
      { code: 'TEST', name: '測試', status: 'in_progress', progress: 50 },
    ];

    const result = generateMasterTasks(zhConfig, projects);
    expect(result).toContain('主任務清單');
    expect(result).toContain('快速導覽');
    expect(result).toContain('進行中專案');
  });

  it('includes status legend', () => {
    const result = generateMasterTasks(testConfig, []);
    expect(result).toContain('Status Legend');
    expect(result).toContain('📋');
    expect(result).toContain('Planning');
  });

  it('includes latest update when present', () => {
    const projects: Project[] = [
      {
        code: 'UPDATED',
        name: 'Updated Project',
        status: 'in_progress',
        progress: 70,
        latest_update: '- Fixed bug\n- Added feature',
        latest_update_date: '2026-02-01',
      },
    ];

    const result = generateMasterTasks(testConfig, projects);
    expect(result).toContain('Latest Update');
    expect(result).toContain('2026-02-01');
    expect(result).toContain('Fixed bug');
  });
});
