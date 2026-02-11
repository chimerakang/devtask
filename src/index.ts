// Public API exports for programmatic use
export { ConfigSchema, type Config } from './schemas/config.schema.js';
export { ProjectSchema, PhaseSchema, TaskSchema, type Project, type Phase, type Task } from './schemas/project.schema.js';
export { loadConfig, saveConfig } from './core/config.js';
export { loadProject, loadAllProjects, saveProject, sortProjects, filterByStatus } from './core/project.js';
export { generateMasterTasks } from './generators/master-tasks.js';
export { parseMarkdownToProjects } from './parsers/markdown-parser.js';
export { getI18n } from './i18n/index.js';
