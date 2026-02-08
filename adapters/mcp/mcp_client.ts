
// Layer: ADAPTERS
// Purpose: Lightweight MCP Client (SSE Transport).
// This connects to a Model Context Protocol server over HTTP SSE.

export interface McpTool {
    name: string;
    description?: string;
    inputSchema?: any;
}

export class McpClient {
    private eventSource: EventSource | null = null;
    private initialized = false;
    private serverUrl: string;
    private availableTools: McpTool[] = [];

    constructor(serverUrl: string) {
        this.serverUrl = serverUrl;
    }

    async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.initialized) {
                resolve();
                return;
            }

            console.log(`[McpClient] Connecting to ${this.serverUrl}...`);
            
            try {
                // In a full MCP implementation, we would perform the handshake here.
                // For this lightweight adapter, we assume the SSE endpoint acts as a simplified relay
                // or we are connecting to a server that supports the basic JSON-RPC over HTTP flow.
                
                // Note: Standard MCP uses JSON-RPC. 
                // Since this is a browser client, we typically use POST for requests and SSE for notifications.
                // Assuming standard "Transport" via HTTP POST for tools:
                this.initialized = true;
                resolve();
            } catch (e) {
                console.error("MCP Connection error", e);
                reject(e);
            }
        });
    }

    /**
     * Executes a tool on the MCP server.
     * Uses JSON-RPC 2.0 format over HTTP POST (standard for HTTP transports).
     */
    async callTool(name: string, args: any = {}): Promise<any> {
        if (!this.initialized) await this.connect();

        console.log(`[McpClient] Calling tool: ${name}`, args);

        const rpcPayload = {
            jsonrpc: "2.0",
            method: "tools/call",
            params: {
                name: name,
                arguments: args
            },
            id: crypto.randomUUID()
        };

        try {
            // Note: If using an SSE transport, the endpoint for POST might be different 
            // or negotiated. Here we assume a standard /message endpoint or similar convention.
            // For a basic 'mcp-proxy' running locally:
            const response = await fetch(this.serverUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(rpcPayload)
            });

            if (!response.ok) {
                throw new Error(`MCP Server Error: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.error) {
                throw new Error(`MCP Tool Error: ${data.error.message}`);
            }

            // MCP returns { content: [{ type: 'text', text: '...' }] }
            // We verify the structure and return the result.
            if (data.result && data.result.content && data.result.content.length > 0) {
                const textContent = data.result.content.find((c: any) => c.type === 'text');
                if (textContent) {
                    try {
                        return JSON.parse(textContent.text);
                    } catch {
                        return textContent.text;
                    }
                }
                // Image or other types
                return data.result.content[0]; 
            }
            
            return data.result;

        } catch (e: any) {
            console.error(`[McpClient] Tool execution failed:`, e);
            throw e;
        }
    }

    async disconnect(): Promise<void> {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        this.initialized = false;
    }
}
