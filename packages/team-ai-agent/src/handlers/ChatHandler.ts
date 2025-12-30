import { ServerClient } from '@qwen-team/server-sdk';
import { ProtocolTranslator, AcpMessage, AcpResponse } from '../protocol/ProtocolTranslator.js';
import { mapErrorToStandard } from '@qwen-team/shared';
import { UserSessionManager } from '../session/UserSessionManager.js';
import { spawn } from 'child_process';

export class ChatHandler {
  private translator = new ProtocolTranslator();

  constructor(
    private client: ServerClient,
    private sessionManager?: UserSessionManager
  ) {}

  async handleChatMessage(message: AcpMessage): Promise<AcpResponse> {
    try {
      console.log('[ChatHandler] Processing chat message:', message.type);
      
      const { prompt } = this.translator.acpToSdk(message);
      const sessionId = (message as any).data?.sessionId;
      const userId = (message as any).data?.userId;
      
      console.log(`[ChatHandler] Prompt: "${prompt.substring(0, 100)}..."`);
      console.log(`[ChatHandler] SessionId: ${sessionId}, UserId: ${userId}`);
      
      // Check for direct shell command execution (!command)
      if (prompt.trim().startsWith('!')) {
        const command = prompt.trim().substring(1); // Remove the !
        console.log(`[ChatHandler] Executing direct shell command: ${command}`);
        
        try {
          const shellResult = await this.executeShellCommand(command, userId);
          
          // Pass shell result to LLM for well-formatted response
          const llmPrompt = `I executed the shell command "${command}" and got this result:\n\n${shellResult}\n\nPlease provide a well-formatted response explaining what this output means.`;
          
          if (this.sessionManager && sessionId) {
            this.sessionManager.addMessageToHistory(sessionId, 'user', prompt);
            
            const history = this.sessionManager.getConversationHistory(sessionId);
            const contextPrompt = this.buildContextPrompt(history, llmPrompt);
            
            const result = await this.client.query(contextPrompt);
            const responseText = result.text || `Command executed successfully:\n\n${shellResult}`;
            
            this.sessionManager.addMessageToHistory(sessionId, 'assistant', responseText);
            return this.translator.sdkToAcp({ text: responseText, usage: result.usage }, message.id);
          } else {
            const result = await this.client.query(llmPrompt);
            const responseText = result.text || `Command executed successfully:\n\n${shellResult}`;
            return this.translator.sdkToAcp({ text: responseText, usage: result.usage }, message.id);
          }
        } catch (error) {
          const errorMsg = `Error executing command "${command}": ${error instanceof Error ? error.message : 'Unknown error'}`;
          return this.translator.sdkToAcp({ text: errorMsg, usage: { input: 0, output: 0, total: 0 } }, message.id);
        }
      }
      
      // Regular LLM processing for non-shell commands
      if (this.sessionManager && sessionId) {
        this.sessionManager.addMessageToHistory(sessionId, 'user', prompt);
        
        console.log(`[ChatHandler] Processing message with GeminiClient conversation management`);
        
        // CRITICAL FIX: Reset chat to clear any previous conversation context
        // This prevents context pollution from previous conversations
        await this.client.resetChat();
        console.log(`[ChatHandler] Reset chat to clear previous context`);
        
        // DEBUG: Check if tools are set before sending
        const toolRegistry = this.client.getConfig().getToolRegistry();
        const tools = toolRegistry.getAllTools();
        console.log(`[ChatHandler] Available tools before sendMessageStream: ${tools.length}`);
        
        // CRITICAL FIX: Ensure tools are set immediately before the call
        // This prevents tools from being overwritten by params.config
        await this.client.setTools();
        console.log(`[ChatHandler] Tools explicitly set right before sendMessageStream`);
        
        // Use GeminiClient's sendMessageStream like the CLI does
        // This properly handles conversation history and tools
        const stream = this.client.sendMessageStream(
          prompt, // Pass raw string like CLI, not wrapped in array
          new AbortController().signal,
          `chat-${Date.now()}`,
          { isContinuation: false }
        );
        
        let response = '';
        for await (const chunk of stream) {
          if (chunk.type === 'content' && 'value' in chunk) {
            response += (chunk as any).value;
          }
        }
        
        console.log(`[ChatHandler] Stream completed, response length: ${response.length}`);
        
        // Ensure we have some response text
        const responseText = response || 'I apologize, but I encountered an issue processing your message. Please try again.';
        
        // Add assistant response to history
        this.sessionManager.addMessageToHistory(sessionId, 'assistant', responseText);
        
        return this.translator.sdkToAcp({ 
          text: responseText, 
          usage: { input: 0, output: 0, total: 0 } 
        }, message.id);
      } else {
        console.log('[ChatHandler] No session manager or sessionId, using direct query');
        // Fallback without history
        const result = await this.client.query(prompt);
        const responseText = result.text || 'I apologize, but I encountered an issue processing your message. Please try again.';
        return this.translator.sdkToAcp({ text: responseText, usage: result.usage }, message.id);
      }
    } catch (error) {
      console.error('[ChatHandler] Error processing chat message:', error);
      return this.translator.errorToAcp(error, message.id);
    }
  }

  private async executeShellCommand(command: string, userId: string): Promise<string> {
    // Get user workspace directory
    const nfsBasePath = process.env.NFS_BASE_PATH || '../../infrastructure/nfs-data';
    const userWorkspaceDir = `${nfsBasePath}/workspaces/${userId}`;
    
    return new Promise((resolve, reject) => {
      const proc = spawn('docker', [
        'run', '--rm',
        '-v', `${userWorkspaceDir}:/workspace`,
        '-w', '/workspace',
        '--network', 'bridge',
        '--memory', '1g',
        '--cpus', '2',
        '--security-opt', 'no-new-privileges',
        '--cap-drop', 'ALL',
        'ubuntu:latest',
        '/bin/bash', '-c', command
      ], { stdio: 'pipe' });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        console.log(`[ChatHandler] Shell command completed with exit code: ${code}`);
        if (code === 0) {
          resolve(stdout || 'Command executed successfully');
        } else {
          reject(new Error(stderr || `Command failed with exit code ${code}`));
        }
      });

      proc.on('error', (error) => {
        console.error('[ChatHandler] Shell command error:', error);
        reject(error);
      });
    });
  }

  private buildContextPrompt(history: any[], currentPrompt: string): string {
    if (history.length === 0) {
      return currentPrompt;
    }
    
    // Build context from conversation history
    const contextMessages = history.map(msg => 
      `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
    ).join('\n\n');
    
    return `Previous conversation:\n${contextMessages}\n\nCurrent message:\nUser: ${currentPrompt}`;
  }

  async handleStreamingChat(message: AcpMessage, onChunk: (data: any) => void): Promise<AcpResponse> {
    try {
      const { prompt } = this.translator.acpToSdk(message);
      const sessionId = (message as any).data?.sessionId;
      const userId = (message as any).data?.userId;
      
      // Check for direct shell command execution (!command)
      if (prompt.trim().startsWith('!')) {
        const command = prompt.trim().substring(1); // Remove the !
        console.log(`[ChatHandler] Executing direct shell command (streaming): ${command}`);
        
        try {
          const shellResult = await this.executeShellCommand(command, userId);
          
          // Pass shell result to LLM for well-formatted response
          const llmPrompt = `I executed the shell command "${command}" and got this result:\n\n${shellResult}\n\nPlease provide a well-formatted response explaining what this output means.`;
          
          if (this.sessionManager && sessionId) {
            this.sessionManager.addMessageToHistory(sessionId, 'user', prompt);
            
            const history = this.sessionManager.getConversationHistory(sessionId);
            const contextPrompt = this.buildContextPrompt(history, llmPrompt);
            
            let assistantResponse = '';
            
            for await (const chunk of this.client.queryStream(contextPrompt)) {
              onChunk(this.translator.streamChunkToAcp(chunk));
              if (chunk.type === 'content') {
                assistantResponse += chunk.text;
              }
            }
            
            if (assistantResponse) {
              this.sessionManager.addMessageToHistory(sessionId, 'assistant', assistantResponse);
            }
          } else {
            for await (const chunk of this.client.queryStream(llmPrompt)) {
              onChunk(this.translator.streamChunkToAcp(chunk));
            }
          }
          
          return this.translator.sdkToAcp({ text: '', usage: { input: 0, output: 0, total: 0 } }, message.id);
        } catch (error) {
          const errorMsg = `Error executing command "${command}": ${error instanceof Error ? error.message : 'Unknown error'}`;
          onChunk(this.translator.streamChunkToAcp({ type: 'content', text: errorMsg }));
          onChunk(this.translator.streamChunkToAcp({ type: 'finished' }));
          return this.translator.sdkToAcp({ text: errorMsg, usage: { input: 0, output: 0, total: 0 } }, message.id);
        }
      }
      
      // Regular LLM streaming for non-shell commands
      if (this.sessionManager && sessionId) {
        this.sessionManager.addMessageToHistory(sessionId, 'user', prompt);
        // Get conversation history for context
        const history = this.sessionManager.getConversationHistory(sessionId);
        const contextPrompt = this.buildContextPrompt(history, prompt);
        
        let assistantResponse = '';
        
        for await (const chunk of this.client.queryStream(contextPrompt)) {
          onChunk(this.translator.streamChunkToAcp(chunk));
          if (chunk.type === 'content') {
            assistantResponse += chunk.text;
          }
        }
        
        // Add complete assistant response to history
        if (assistantResponse) {
          this.sessionManager.addMessageToHistory(sessionId, 'assistant', assistantResponse);
        }
      } else {
        // Fallback without history
        for await (const chunk of this.client.queryStream(prompt)) {
          onChunk(this.translator.streamChunkToAcp(chunk));
        }
      }
      
      return {
        id: message.id,
        success: true,
        data: { content: 'Stream complete' },
        timestamp: Date.now(),
      };
    } catch (error) {
      return this.translator.errorToAcp(error, message.id);
    }
  }
}
