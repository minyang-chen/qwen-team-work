import { ServerClient } from '@qwen-team/server-sdk';

async function main() {
  // Create client
  const client = new ServerClient({
    apiKey: process.env.OPENAI_API_KEY!,
    baseUrl: process.env.OPENAI_BASE_URL,
    model: 'qwen-coder-plus',
    workingDirectory: process.cwd(),
  });

  // Initialize
  await client.initialize();

  // Simple query
  console.log('Querying...');
  const result = await client.query('What is 2+2?');
  console.log('Result:', result.text);
  console.log('Usage:', result.usage);

  // Streaming query
  console.log('\nStreaming query...');
  for await (const chunk of client.queryStream('Count from 1 to 5')) {
    if (chunk.type === 'content') {
      process.stdout.write(chunk.text);
    } else if (chunk.type === 'tool') {
      console.log(`\n[Tool: ${chunk.toolName}]`);
    }
  }

  // Cleanup
  await client.dispose();
}

main().catch(console.error);
