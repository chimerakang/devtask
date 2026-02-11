import { z } from 'zod';

export const StatusDefinitionSchema = z.object({
  emoji: z.string(),
  label: z.string(),
  description: z.string().optional(),
});

export const RoleDefinitionSchema = z.object({
  multiplier: z.number().default(1.0),
  description: z.string(),
});

export const TaskTypeDefinitionSchema = z.object({
  base_hours: z.number(),
  description: z.string().optional(),
});

export const GenerateOptionsSchema = z.object({
  include_status_legend: z.boolean().default(true),
  include_completed_details: z.boolean().default(true),
  include_doc_index: z.boolean().default(true),
  header_text: z.string().optional(),
  footer_text: z.string().optional(),
}).default({
  include_status_legend: true,
  include_completed_details: true,
  include_doc_index: true,
});

export const ConfigSchema = z.object({
  version: z.number().default(1),

  project: z.object({
    name: z.string(),
    output_path: z.string().default('docs/MASTER_TASKS.md'),
    tasks_dir: z.string().default('docs/tasks/'),
    specs_dir: z.string().default('docs/specs/'),
    lang: z.enum(['en', 'zh-TW']).default('en'),
  }),

  statuses: z.record(z.string(), StatusDefinitionSchema).default({
    planning: { emoji: '📋', label: 'Planning' },
    in_progress: { emoji: '🔄', label: 'In Progress' },
    testing: { emoji: '🧪', label: 'Testing' },
    completed: { emoji: '✅', label: 'Completed' },
    paused: { emoji: '⏸️', label: 'Paused' },
    cancelled: { emoji: '❌', label: 'Cancelled' },
  }),

  active_statuses: z.array(z.string()).default([
    'planning', 'in_progress', 'testing', 'paused',
  ]),

  completed_statuses: z.array(z.string()).default(['completed']),

  cancelled_statuses: z.array(z.string()).default(['cancelled']),

  roles: z.record(z.string(), RoleDefinitionSchema).optional(),

  task_types: z.record(z.string(), TaskTypeDefinitionSchema).optional(),

  generate: GenerateOptionsSchema,
});

export type Config = z.infer<typeof ConfigSchema>;
export type StatusDefinition = z.infer<typeof StatusDefinitionSchema>;
