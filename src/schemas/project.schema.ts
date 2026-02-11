import { z } from 'zod';

export const TaskSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string().default('pending'),
  hours: z.number().optional(),
  actual_hours: z.number().optional(),
  assignee: z.string().optional(),
  notes: z.string().optional(),
  dependencies: z.array(z.string()).optional(),
});

export const PhaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string().default('pending'),
  estimated_hours: z.number().optional(),
  actual_hours: z.number().optional(),
  tasks: z.array(TaskSchema).optional(),
});

export const FeatureSchema = z.object({
  name: z.string(),
  status: z.string(),
});

export const ProjectSchema = z.object({
  code: z.string().regex(/^[A-Z][A-Z0-9-]*$/, 'Project code must be uppercase with hyphens'),
  name: z.string(),
  status: z.string(),
  progress: z.number().min(0).max(100).default(0),
  description: z.string().optional(),

  estimated_hours: z.number().optional(),
  actual_hours: z.number().optional(),

  detail_link: z.string().optional(),
  plan_link: z.string().optional(),

  completed_date: z.string().optional(),
  cancelled_date: z.string().optional(),
  cancelled_reason: z.string().optional(),

  latest_update: z.string().optional(),
  latest_update_date: z.string().optional(),

  phases: z.array(PhaseSchema).optional(),
  features: z.array(FeatureSchema).optional(),

  meta: z.record(z.string(), z.unknown()).optional(),
});

export type Project = z.infer<typeof ProjectSchema>;
export type Phase = z.infer<typeof PhaseSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type Feature = z.infer<typeof FeatureSchema>;
