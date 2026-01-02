#!/usr/bin/env node

// Test script to verify LLM generates proper tool calls for quicksort

const http = require('http');

const requestData = {
  model: "qwen3-coder:30b",
  messages: [
    {
      role: "system",
      content: "You are a helpful coding assistant. When asked to create code, write the complete implementation and save it to a file."
    },
    {
      role: "user",
      content: "create a quick sort script"
    }
  ],
  tools: [
    {
      type: "function",
      function: {
        name: "write_file",
        description: "Write content to a file",
        parameters: {
          type: "object",
          properties: {
            file_path: { type: "string", description: "Path to the file" },
            content: { type: "string", description: "Content to write" }
          },
          required: ["file_path", "content"]
        }
      }
    }
  ],
  tool_choice: "auto"
};

const postData = JSON.stringify(requestData);

const options = {
  hostname: '10.0.0.82',
  port: 8080,
  path: '/v1/chat/completions',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer sk-svcacct-team-key',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const response = JSON.parse(data);
    console.log('=== LLM Response ===');
    console.log(JSON.stringify(response, null, 2));
    
    if (response.choices && response.choices[0]) {
      const message = response.choices[0].message;
      console.log('\n=== Content ===');
      console.log(message.content);
      
      if (message.tool_calls) {
        console.log('\n=== Tool Calls ===');
        console.log(JSON.stringify(message.tool_calls, null, 2));
      } else {
        console.log('\n❌ NO TOOL CALLS - Function calling not working!');
      }
    }
  });
});

req.on('error', (error) => { console.error('Error:', error); });
req.write(postData);
req.end();
