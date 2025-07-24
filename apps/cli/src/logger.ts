function isAgentInboxInterruptSchema(value: unknown): boolean {
  const valueAsObject = Array.isArray(value) ? value[0] : value;
  return (
    valueAsObject &&
    typeof valueAsObject === "object" &&
    "action_request" in valueAsObject &&
    typeof valueAsObject.action_request === "object" &&
    "config" in valueAsObject &&
    typeof valueAsObject.config === "object" &&
    "allow_respond" in valueAsObject.config &&
    "allow_accept" in valueAsObject.config &&
    "allow_edit" in valueAsObject.config &&
    "allow_ignore" in valueAsObject.config
  );
}

interface LogChunk {
  event: string;
  data: any;
  ops?: Array<{ value: string }>;
}

interface MessageData {
  id: string;
  type: 'ai' | 'tool' | 'human';
  content: Array<{ type: string; text?: string; input?: string }> | string;
  tool_calls?: Array<ToolCall>;
  name?: string;
  tool_call_id?: string;
  status?: 'success' | 'error';
  graph_id?: string;
  langgraph_node?: string;
  additional_kwargs?: {
    reasoning?: string;
    notes?: string[];
  };
}

interface ToolCall {
  type: string;
  args?: string;
  name?: string;
  index?: number;
  id?: string;
}

/**
 * Format a tool call based on its type and arguments
 */
function formatToolCall(tool: ToolCall): string {
  try {
    const args = tool.args ? JSON.parse(tool.args) : {};
    const name = tool.name || 'unknown';

    switch (name.toLowerCase()) {
      case 'shell':
        return `$ ${args.command?.join(' ') || ''}`;
      case 'search':
        return `Search: "${args.query}"${args.include_pattern ? ` in ${args.include_pattern}` : ''}`;
      case 'edit_file':
        return `Edit: ${args.target_file}`;
      case 'read_file':
        return `Read: ${args.target_file}`;
      case 'grep_search':
        return `Grep: "${args.query}"`;
      case 'list_dir':
        return `List: ${args.relative_workspace_path}`;
      case 'file_search':
        return `Find file: ${args.query}`;
      case 'delete_file':
        return `Delete: ${args.target_file}`;
      case 'install_dependencies':
        return `Install: ${args.command || ''}`;
      case 'apply_patch':
        return `Apply patch to: ${args.file_path || ''}`;
      default:
        const argsStr = Object.entries(args)
          .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
          .join(', ');
        return `${name}(${argsStr})`;
    }
  } catch (e) {
    return tool.args || '';
  }
}

/**
 * Format a tool result based on its type and content
 */
function formatToolResult(message: MessageData): string {
  const content = typeof message.content === 'string' 
    ? message.content 
    : message.content?.[0]?.text || message.content?.[0]?.input || '';
  
  if (!content) return '';

  // For successful tool executions, format nicely
  if (message.status === 'success') {
    switch (message.name?.toLowerCase()) {
      case 'shell':
      case 'grep_search':
      case 'search':
        return content;
      case 'apply_patch':
        return content.includes('Error') ? `Error: ${content}` : 'Patch applied successfully';
      case 'install_dependencies':
        return content.includes('Error') ? `Error: ${content}` : 'Dependencies installed successfully';
      default:
        if (content.length > 200) {
          return content.slice(0, 200) + '...';
        }
        return content;
    }
  }

  // For errors, show full message
  return `Error: ${content}`;
}

export function formatDisplayLog(chunk: LogChunk | string): string[] {
  if (typeof chunk === 'string') {
    if (chunk.startsWith('Human feedback:')) {
      return [`[HUMAN FEEDBACK RECEIVED] ${chunk.replace('Human feedback:', '').trim()}`];
    }
    // Filter out raw file content and object references
    if (chunk === '[object Object]' || 
        chunk.includes('total 4') ||
        chunk.includes('drwxr-xr-x') ||
        chunk.includes('Exit code 1') ||
        chunk.startsWith('#') ||
        chunk.startsWith('-') ||
        chunk.startsWith('./')
    ) {
      return [];
    }
    return [`[SYSTEM] ${chunk}`];
  }

  const data = chunk.data;
  const logs: string[] = [];

  // Handle session events
  if (data.plannerSession) {
    logs.push('[PLANNER SESSION STARTED]');
  }
  if (data.programmerSession) {
    logs.push('[PROGRAMMER SESSION STARTED]');
  }

  // Handle interrupts and plans
  if (data.__interrupt__) {
    const interrupt = data.__interrupt__[0]?.value;
    if (interrupt?.action_request?.args?.plan) {
      const plan = interrupt.action_request.args.plan;
      const steps = plan.split(':::')
        .map((s: string) => s.trim())
        .filter(Boolean);
      logs.push(
        '[PROPOSED PLAN]',
        ...steps.map((step: string, idx: number) => `  ${idx + 1}. ${step}`)
      );
    } else {
      logs.push('[INTERRUPT] Waiting for feedback...');
    }
  }

  // Handle messages
  if ('messages' in data) {
    const messages = Array.isArray(data.messages) ? data.messages : [data.messages];
    for (const msg of messages) {
      // Handle tool results
      if (msg.type === 'tool') {
        const toolName = msg.name || 'tool';
        const result = formatToolResult(msg);
        if (result) {
          // Concatenate long tool results to a single line (truncate if too long)
          const maxLength = 500;
          let formattedResult = result.replace(/\s+/g, ' ');
          if (formattedResult.length > maxLength) {
            formattedResult = formattedResult.slice(0, maxLength) + '... [truncated]';
          }
          logs.push(`[TOOL RESULT] ${toolName}: ${formattedResult}`);
        }
      }

      // Handle AI messages
      if (msg.type === 'ai') {
        // Handle reasoning if present
        if (msg.additional_kwargs?.reasoning) {
          logs.push(`[REASONING]\n  ${msg.additional_kwargs.reasoning}`);
        }

        // Handle tool calls
        if (msg.tool_calls && msg.tool_calls.length > 0) {
          msg.tool_calls.forEach((tool: ToolCall) => {
            const action = formatToolCall(tool);
            const toolName = tool.name || 'unknown';
            logs.push(`[TOOL CALL] ${toolName}: ${JSON.stringify(tool.args, null, 2)}`);
          });
        }
        
        // Handle technical notes
        if (msg.additional_kwargs?.notes) {
          logs.push(
            '[TECHNICAL NOTES]',
            ...msg.additional_kwargs.notes.map((note: string) => `  • ${note}`)
          );
        }

        // Handle regular AI messages
        const text = typeof msg.content === 'string'
          ? msg.content
          : msg.content?.[0]?.text || msg.content?.[0]?.input || '';
        if (text) {
          logs.push(`[AI] ${text}`);
        }
      }

      // Handle human messages
      if (msg.type === 'human') {
        const text = typeof msg.content === 'string'
          ? msg.content
          : msg.content?.[0]?.text || msg.content?.[0]?.input || '';
        if (text) {
          logs.push(`[HUMAN] ${text}`);
        }
      }
    }
  }

  // Handle task status updates
  if (data.action) {
    const actionStr = JSON.stringify(data.action);
    if (actionStr !== '{}' && !actionStr.includes('[object Object]')) {
      logs.push(`[ACTION] ${actionStr}`);
    }
  }

  // Handle feedback messages
  if (data.command?.resume?.[0]?.type) {
    const type = data.command.resume[0].type;
    logs.push(`[HUMAN FEEDBACK RECEIVED] ${type}`);
  }

  return logs;
}

/**
 * Formats a log chunk for debug purposes, showing all raw data.
 * This should only be used during development.
 */
export function formatDebugLog(chunk: LogChunk | string): string {
  if (typeof chunk === 'string') return chunk;
  return JSON.stringify(chunk, null, 2);
}