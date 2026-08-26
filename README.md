# mcp-todoist

Todoist MCP Pack

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1476+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `todoist_list_projects` | List all projects in the user's Todoist account. Returns each project's id, name, color, favorite status, web URL, and parent project id. Use to discover projects and their ids before listing tasks or sections. |
| `todoist_list_tasks` | List active (incomplete) tasks / to-do items from Todoist. Optionally filter by a project id, or by a Todoist filter query (a powerful query language, e.g. "today \| overdue", "p1 & #Work", "no date"). Returns each task's id, content, description, project id, priority, due date/datetime, labels, and web URL. |
| `todoist_get_task` | Get the full details of a single Todoist task / to-do item by its id, including content, description, project id, section id, priority, due date/datetime, labels, web URL, and creation time. Use after todoist_list_tasks to inspect one task. |
| `todoist_list_sections` | List the sections within a Todoist project. Sections group tasks inside a project. Returns each section's id, project id, name, and order. Use to understand how tasks in a project are organized. |
| `todoist_list_labels` | List all personal labels in the user's Todoist account. Labels are tags applied to tasks. Returns each label's id, name, color, and favorite status. Use to discover labels for filtering or interpreting task labels. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "todoist": {
      "url": "https://gateway.pipeworx.io/todoist/mcp"
    }
  }
}
```

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/todoist/mcp` returns the tools in the table
above **plus the shared Pipeworx meta-tools** — `ask_pipeworx`,
`discover_tools`, `search_within`, `remember`/`recall` and the rest of the
gateway-wide set. So the tool count you see is larger than this table: a
single-pack endpoint currently lists roughly 30 shared tools alongside the
pack's own. The connection's `initialize` response states its exact scope, and
is the authoritative answer for a given day.

This is deliberate, not multiplexing by accident. The meta-tools are what let a
scoped connection answer a question this pack does not cover — via
`ask_pipeworx`, which routes across the whole catalog — without you adding a
second MCP server. There is currently no way to mount a pack endpoint without
them; if the extra schemas cost you more context than the routing is worth,
connect to the full gateway once rather than to several pack endpoints.

Or connect to the full Pipeworx gateway to get every pack's tools listed
directly, instead of just this one's:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

Both URLs reach the same gateway and the same 1476+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about Todoist data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
