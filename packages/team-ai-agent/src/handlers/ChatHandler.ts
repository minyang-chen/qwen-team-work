import { ServerClient } from '@qwen-team/server-sdk';
import { ProtocolTranslator, AcpMessage, AcpResponse } from '../protocol/ProtocolTranslator.js';
import { mapErrorToStandard } from '@qwen-team/shared';
import { UserSessionManager } from '../session/UserSessionManager.js';

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
      
      // Add user message to history
      if (this.sessionManager && sessionId) {
        this.sessionManager.addMessageToHistory(sessionId, 'user', prompt);
        
        // Get conversation history for context
        const history = this.sessionManager.getConversationHistory(sessionId);
        const contextPrompt = this.buildContextPrompt(history, prompt);
        
        console.log(`[ChatHandler] Using context prompt with ${history.length} history messages`);
        
        const result = await this.client.query(contextPrompt);
        
        console.log(`[ChatHandler] Query result length: ${result.text?.length || 0}`);
        
        // Add assistant response to history
        this.sessionManager.addMessageToHistory(sessionId, 'assistant', result.text);
        
        return this.translator.sdkToAcp(result, message.id);
      } else {
        console.log('[ChatHandler] No session manager or sessionId, using direct query');
        // Fallback without history
        const result = await this.client.query(prompt);
        return this.translator.sdkToAcp(result, message.id);
      }
    } catch (error) {
      console.error('[ChatHandler] Error processing chat message:', error);
      return this.translator.errorToAcp(error, message.id);
    }
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
      
      // Add user message to history
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
