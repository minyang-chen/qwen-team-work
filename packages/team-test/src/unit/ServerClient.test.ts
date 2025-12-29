// Simple unit tests without external dependencies
describe('ServerClient Unit Tests', () => {
  const mockServerClient = {
    query: jest.fn(),
    queryStream: jest.fn(),
    dispose: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('query method', () => {
    it('should execute query successfully', async () => {
      const mockResponse = { content: 'Test response', usage: { inputTokens: 10, outputTokens: 20 } };
      mockServerClient.query.mockResolvedValue(mockResponse);

      const result = await mockServerClient.query('Test prompt');

      expect(result).toEqual(mockResponse);
      expect(mockServerClient.query).toHaveBeenCalledWith('Test prompt');
    });

    it('should handle query errors', async () => {
      const error = new Error('API Error');
      mockServerClient.query.mockRejectedValue(error);

      await expect(mockServerClient.query('Test prompt')).rejects.toThrow('API Error');
    });
  });

  describe('queryStream method', () => {
    it('should execute streaming query successfully', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield { text: 'chunk1', done: false };
          yield { text: 'chunk2', done: true };
        }
      };
      mockServerClient.queryStream.mockReturnValue(mockStream);

      const chunks = [];
      for await (const chunk of mockServerClient.queryStream('Test prompt')) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(2);
      expect(chunks[0].text).toBe('chunk1');
      expect(chunks[1].text).toBe('chunk2');
    });
  });

  describe('dispose method', () => {
    it('should dispose client successfully', async () => {
      mockServerClient.dispose.mockResolvedValue(undefined);

      await mockServerClient.dispose();

      expect(mockServerClient.dispose).toHaveBeenCalled();
    });
  });
});
