import { describe, it, expect } from 'vitest';
import { parseMarkdownToProjects } from '../../src/parsers/markdown-parser.js';

describe('parseMarkdownToProjects', () => {
  it('parses active projects from table', () => {
    const md = `
## Quick Navigation

### 🔄 Active Projects

| Code | Name | Status | Progress | Details |
|------|------|--------|----------|---------|
| PROJ-A | Alpha | 🔄 In Progress | 50% | [📋 Tasks](./tasks/a.md) |
| PROJ-B | Beta | 📋 Planning | 10% | - |
`;

    const { projects } = parseMarkdownToProjects(md);
    expect(projects).toHaveLength(2);
    expect(projects[0].code).toBe('PROJ-A');
    expect(projects[0].status).toBe('in_progress');
    expect(projects[0].progress).toBe(50);
    expect(projects[0].detail_link).toBe('./tasks/a.md');
    expect(projects[1].code).toBe('PROJ-B');
    expect(projects[1].status).toBe('planning');
    expect(projects[1].progress).toBe(10);
  });

  it('parses completed projects with dates', () => {
    const md = `
### ✅ Completed Projects

| Code | Name | Completed | Details |
|------|------|-----------|---------|
| DONE-1 | Done One | 2026-01-25 | [📋 Tasks](./tasks/done.md) |
| DONE-2 | Done Two | 2026-01-20 | - |
`;

    const { projects } = parseMarkdownToProjects(md);
    expect(projects).toHaveLength(2);
    expect(projects[0].status).toBe('completed');
    expect(projects[0].completed_date).toBe('2026-01-25');
    expect(projects[1].status).toBe('completed');
    expect(projects[1].completed_date).toBe('2026-01-20');
  });

  it('parses cancelled projects with reasons', () => {
    const md = `
### ❌ Cancelled Projects

| Code | Name | Date | Reason |
|------|------|------|--------|
| OLD-1 | Old One | 2026-01-11 | Replaced by NEW-1 |
`;

    const { projects } = parseMarkdownToProjects(md);
    expect(projects).toHaveLength(1);
    expect(projects[0].status).toBe('cancelled');
    expect(projects[0].cancelled_date).toBe('2026-01-11');
    expect(projects[0].cancelled_reason).toBe('Replaced by NEW-1');
  });

  it('avoids duplicate projects', () => {
    const md = `
### 🔄 Active

| Code | Name | Status | Progress | Details |
|------|------|--------|----------|---------|
| PROJ-A | Alpha | 🔄 In Progress | 50% | - |

### PROJ-A: Alpha

**Status**: 🔄 In Progress | **Progress**: 50%

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | ✅ Completed | Setup |
| Phase 2 | 🔄 In Progress | Dev |
`;

    const { projects } = parseMarkdownToProjects(md);
    expect(projects).toHaveLength(1);
    expect(projects[0].phases).toHaveLength(2);
    expect(projects[0].phases![0].status).toBe('completed');
  });

  it('parses Chinese status text', () => {
    const md = `
### 🔄 進行中專案

| 專案代號 | 名稱 | 狀態 | 進度 | 詳細任務 |
|---------|------|------|------|---------|
| HR-PAY | 薪資系統 | 🔄 開發中 | 80% | - |
| BIL-SVC | 帳單系統 | 🧪 待 UAT | 91% | - |

### ✅ 已完成專案

| 專案代號 | 名稱 | 完成日期 | 詳細任務 |
|---------|------|---------|---------|
| HR-CLK | 打卡系統 | 2026-01-10 | - |
`;

    const { projects } = parseMarkdownToProjects(md);
    expect(projects).toHaveLength(3);
    expect(projects[0].status).toBe('in_progress');
    expect(projects[1].status).toBe('testing');
    expect(projects[2].status).toBe('completed');
  });

  it('enriches projects with detail sections', () => {
    const md = `
### 🔄 Active

| Code | Name | Status | Progress | Details |
|------|------|--------|----------|---------|
| MY-PROJ | My Project | 🔄 In Progress | 60% | - |

### MY-PROJ: My Project

**Goal**: Build the thing

**Est. Hours**: 160

📝 Plan: [Plan](./specs/my-proj/PLAN.md)

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | ✅ Completed | Foundation |
| Phase 2 | 🔄 In Progress | Core |
| Phase 3 | ⬜ Not Started | Polish |
`;

    const { projects } = parseMarkdownToProjects(md);
    expect(projects).toHaveLength(1);
    expect(projects[0].description).toBe('Build the thing');
    expect(projects[0].estimated_hours).toBe(160);
    expect(projects[0].plan_link).toBe('./specs/my-proj/PLAN.md');
    expect(projects[0].phases).toHaveLength(3);
    expect(projects[0].phases![0].name).toBe('Foundation');
    expect(projects[0].phases![2].status).toBe('planning');
  });

  it('handles empty content', () => {
    const { projects, warnings } = parseMarkdownToProjects('');
    expect(projects).toHaveLength(0);
    expect(warnings).toHaveLength(0);
  });
});
