import type { Project, Phase, Task } from '../schemas/project.schema.js';
import type { Config } from '../schemas/config.schema.js';

/**
 * Calculate estimated hours for a task based on type, complexity, and role.
 */
export function estimateHours(
  config: Config,
  taskType: string,
  complexity: 'simple' | 'medium' | 'complex' | 'very_complex' = 'medium',
  role?: string
): number {
  const baseHours = config.task_types?.[taskType]?.base_hours ?? 8;

  const complexityMultipliers: Record<string, number> = {
    simple: 1.0,
    medium: 1.5,
    complex: 2.0,
    very_complex: 3.0,
  };

  const complexityMult = complexityMultipliers[complexity] ?? 1.5;
  const roleMult = role ? (config.roles?.[role]?.multiplier ?? 1.0) : 1.0;

  return Math.round(baseHours * complexityMult * roleMult);
}

/**
 * Calculate project progress from phases/tasks.
 * If project has explicit progress field, returns that.
 * Otherwise calculates from completed phases.
 */
export function calculateProgress(project: Project, config: Config): number {
  // Explicit progress takes priority
  if (project.progress !== undefined && project.progress > 0) {
    return project.progress;
  }

  // Calculate from phases
  if (project.phases && project.phases.length > 0) {
    const completedPhases = project.phases.filter(
      p => config.completed_statuses.includes(p.status)
    ).length;
    return Math.round((completedPhases / project.phases.length) * 100);
  }

  // Calculate from features
  if (project.features && project.features.length > 0) {
    const completedFeatures = project.features.filter(
      f => config.completed_statuses.includes(f.status)
    ).length;
    return Math.round((completedFeatures / project.features.length) * 100);
  }

  return 0;
}

/**
 * Sum estimated hours from all phases.
 */
export function sumEstimatedHours(project: Project): number {
  if (project.estimated_hours) return project.estimated_hours;
  if (!project.phases) return 0;
  return project.phases.reduce((sum, p) => sum + (p.estimated_hours ?? 0), 0);
}

/**
 * Sum actual hours from all phases.
 */
export function sumActualHours(project: Project): number {
  if (project.actual_hours) return project.actual_hours;
  if (!project.phases) return 0;
  return project.phases.reduce((sum, p) => sum + (p.actual_hours ?? 0), 0);
}
