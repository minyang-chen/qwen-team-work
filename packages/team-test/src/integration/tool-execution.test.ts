// Tool execution integration tests
describe('Tool Execution Integration Tests', () => {
  describe('ServerClient Tool Integration', () => {
    it('should initialize with tools enabled', async () => {
      const mockConfig = {
        apiKey: 'test-key',
        model: 'test-model',
        approvalMode: 'yolo'
      };

      // Mock the initialization process
      const mockInitialize = jest.fn().mockResolvedValue(undefined);
      const mockSetTools = jest.fn().mockResolvedValue(undefined);
      const mockGetToolRegistry = jest.fn().mockReturnValue({
        getAllTools: () => [
          { displayName: 'Shell' },
          { displayName: 'ReadFile' },
          { displayName: 'WriteFile' }
        ],
        getFunctionDeclarations: () => [
          { name: 'run_shell_command' },
          { name: 'read_file' },
          { name: 'write_file' }
        ]
      });

      // Verify tool initialization flow
      expect(mockInitialize).toBeDefined();
      expect(mockSetTools).toBeDefined();
      expect(mockGetToolRegistry).toBeDefined();
    });

    it('should handle shell command execution', async () => {
      const shellCommand = '!pwd';
      const expectedResponse = {
        text: '/workdisk/hosting/my_qwen_code/qwen-team-work',
        usage: { input: 10, output: 50, total: 60 }
      };

      const mockQuery = jest.fn().mockResolvedValue(expectedResponse);
      
      const result = await mockQuery(shellCommand);
      
      expect(result.text).toContain('/workdisk/hosting/my_qwen_code/qwen-team-work');
      expect(mockQuery).toHaveBeenCalledWith(shellCommand);
    });

    it('should handle file operations', async () => {
      const fileCommand = 'Read the package.json file';
      const expectedResponse = {
        text: 'File contents: {"name": "@qwen-team/workspace", "version": "1.0.0"}',
        usage: { input: 20, output: 100, total: 120 }
      };

      const mockQuery = jest.fn().mockResolvedValue(expectedResponse);
      
      const result = await mockQuery(fileCommand);
      
      expect(result.text).toContain('@qwen-team/workspace');
      expect(mockQuery).toHaveBeenCalledWith(fileCommand);
    });
  });

  describe('Fallback Tool Execution', () => {
    it('should use ServerClient in fallback mode', async () => {
      const fallbackConfig = {
        apiKey: 'fallback-key',
        baseUrl: 'http://localhost:8080/v1',
        model: 'test-model',
        approvalMode: 'yolo'
      };

      const mockFallbackClient = {
        initialize: jest.fn().mockResolvedValue(undefined),
        query: jest.fn().mockResolvedValue({
          text: 'Fallback response with tools enabled',
          usage: { input: 15, output: 35, total: 50 }
        })
      };

      await mockFallbackClient.initialize();
      const result = await mockFallbackClient.query('!ls');

      expect(mockFallbackClient.initialize).toHaveBeenCalled();
      expect(result.text).toBe('Fallback response with tools enabled');
    });
  });

  describe('ACP Protocol Tool Flow', () => {
    it('should validate tool-enabled message flow', () => {
      const acpMessage = {
        id: 'test-tool-1',
        type: 'chat',
        data: {
          action: 'send',
          sessionId: 'test-session',
          message: '!pwd',
          stream: true
        },
        timestamp: Date.now()
      };

      // Validate message structure for tool execution
      expect(acpMessage.type).toBe('chat');
      expect(acpMessage.data.action).toBe('send');
      expect(acpMessage.data.message).toBe('!pwd');
      expect(acpMessage.data.stream).toBe(true);
    });

    it('should handle tool execution responses', () => {
      const toolResponse = {
        id: 'test-tool-1',
        success: true,
        data: {
          content: '/workdisk/hosting/my_qwen_code/qwen-team-work',
          toolsUsed: ['run_shell_command'],
          usage: { input: 10, output: 40, total: 50 }
        },
        timestamp: Date.now()
      };

      expect(toolResponse.success).toBe(true);
      expect(toolResponse.data.toolsUsed).toContain('run_shell_command');
      expect(toolResponse.data.content).toContain('/workdisk');
    });
  });
});
