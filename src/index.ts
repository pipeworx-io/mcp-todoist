interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * Todoist MCP Pack
 *
 * Requires OAuth connection — gateway injects credentials via _context.todoist.
 * Read-only access to a user's Todoist tasks, projects, sections, and labels
 * via the Todoist REST API v2.
 * Tools: list projects, list tasks, get task, list sections, list labels.
 */


interface TodoistContext {
  todoist?: { accessToken: string };
}

const API = 'https://api.todoist.com/rest/v2';

/**
 * Fetch helper for the Todoist REST API.
 * - Returns { error: 'connection_required' } when no OAuth token is present.
 * - Returns { error: <status>, message: <body text> } on non-2xx responses.
 * - Otherwise returns the parsed JSON body.
 */
async function tFetch(
  ctx: TodoistContext,
  url: string,
  options: RequestInit = {},
): Promise<unknown> {
  if (!ctx.todoist) {
    return {
      error: 'connection_required',
      message: 'Connect your Todoist account at https://pipeworx.io/account',
    };
  }
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${ctx.todoist.accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    return { error: res.status, message: text };
  }
  return res.json();
}

const tools: McpToolExport['tools'] = [
  {
    name: 'todoist_list_projects',
    description:
      'List all projects in the user\'s Todoist account. Returns each project\'s id, name, color, favorite status, web URL, and parent project id. Use to discover projects and their ids before listing tasks or sections.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'todoist_list_tasks',
    description:
      'List active (incomplete) tasks / to-do items from Todoist. Optionally filter by a project id, or by a Todoist filter query (a powerful query language, e.g. "today | overdue", "p1 & #Work", "no date"). Returns each task\'s id, content, description, project id, priority, due date/datetime, labels, and web URL.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_id: {
          type: 'string',
          description: 'Optional project id to restrict tasks to a single Todoist project (from todoist_list_projects).',
        },
        filter: {
          type: 'string',
          description: 'Optional Todoist filter query to select tasks, e.g. "today | overdue", "p1", "#Work & no date", "7 days". See Todoist\'s filter query language.',
        },
      },
      required: [],
    },
  },
  {
    name: 'todoist_get_task',
    description:
      'Get the full details of a single Todoist task / to-do item by its id, including content, description, project id, section id, priority, due date/datetime, labels, web URL, and creation time. Use after todoist_list_tasks to inspect one task.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        task_id: {
          type: 'string',
          description: 'The id of the Todoist task to retrieve (from a task list result).',
        },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'todoist_list_sections',
    description:
      'List the sections within a Todoist project. Sections group tasks inside a project. Returns each section\'s id, project id, name, and order. Use to understand how tasks in a project are organized.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_id: {
          type: 'string',
          description: 'The id of the Todoist project whose sections to list (from todoist_list_projects).',
        },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'todoist_list_labels',
    description:
      'List all personal labels in the user\'s Todoist account. Labels are tags applied to tasks. Returns each label\'s id, name, color, and favorite status. Use to discover labels for filtering or interpreting task labels.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
];

interface TodoistProject {
  id?: string;
  name?: string;
  color?: string;
  is_favorite?: boolean;
  url?: string;
  parent_id?: string | null;
}

interface TodoistDue {
  date?: string;
  datetime?: string | null;
}

interface TodoistTask {
  id?: string;
  content?: string;
  description?: string;
  project_id?: string;
  section_id?: string | null;
  priority?: number;
  due?: TodoistDue | null;
  is_completed?: boolean;
  labels?: string[];
  url?: string;
  created_at?: string;
}

interface TodoistSection {
  id?: string;
  project_id?: string;
  name?: string;
  order?: number;
}

interface TodoistLabel {
  id?: string;
  name?: string;
  color?: string;
  is_favorite?: boolean;
}

function mapProject(p: TodoistProject): Record<string, unknown> {
  return {
    id: p.id,
    name: p.name,
    color: p.color,
    is_favorite: p.is_favorite,
    url: p.url,
    parent_id: p.parent_id,
  };
}

function mapTask(t: TodoistTask): Record<string, unknown> {
  return {
    id: t.id,
    content: t.content,
    description: t.description,
    project_id: t.project_id,
    priority: t.priority,
    due: t.due?.date,
    due_datetime: t.due?.datetime,
    is_completed: t.is_completed,
    labels: t.labels,
    url: t.url,
  };
}

function mapSection(s: TodoistSection): Record<string, unknown> {
  return {
    id: s.id,
    project_id: s.project_id,
    name: s.name,
    order: s.order,
  };
}

function mapLabel(l: TodoistLabel): Record<string, unknown> {
  return {
    id: l.id,
    name: l.name,
    color: l.color,
    is_favorite: l.is_favorite,
  };
}

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const context = (args._context ?? {}) as TodoistContext;
  delete args._context;

  switch (name) {
    case 'todoist_list_projects': {
      const result = await tFetch(context, `${API}/projects`);
      if (Array.isArray(result)) return (result as TodoistProject[]).map(mapProject);
      return result;
    }
    case 'todoist_list_tasks': {
      const projectId = args.project_id as string | undefined;
      const filter = args.filter as string | undefined;
      const params = new URLSearchParams();
      if (projectId) params.set('project_id', projectId);
      if (filter) params.set('filter', filter);
      const qs = params.toString();
      const result = await tFetch(context, `${API}/tasks${qs ? `?${qs}` : ''}`);
      if (Array.isArray(result)) return (result as TodoistTask[]).map(mapTask);
      return result;
    }
    case 'todoist_get_task': {
      const taskId = args.task_id as string;
      const result = await tFetch(context, `${API}/tasks/${encodeURIComponent(taskId)}`);
      const t = result as TodoistTask;
      if (t && typeof t === 'object' && 'id' in t && !('error' in t)) {
        return {
          id: t.id,
          content: t.content,
          description: t.description,
          project_id: t.project_id,
          section_id: t.section_id,
          priority: t.priority,
          due: t.due,
          labels: t.labels,
          url: t.url,
          created_at: t.created_at,
        };
      }
      return result;
    }
    case 'todoist_list_sections': {
      const projectId = args.project_id as string;
      const params = new URLSearchParams({ project_id: projectId });
      const result = await tFetch(context, `${API}/sections?${params}`);
      if (Array.isArray(result)) return (result as TodoistSection[]).map(mapSection);
      return result;
    }
    case 'todoist_list_labels': {
      const result = await tFetch(context, `${API}/labels`);
      if (Array.isArray(result)) return (result as TodoistLabel[]).map(mapLabel);
      return result;
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export default { tools, callTool, meter: { credits: 1 }, provider: 'todoist' } satisfies McpToolExport;
