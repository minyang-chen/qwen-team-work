#!/usr/bin/env node

// Test script to verify function calling works with the LLM endpoint

const https = require('https');
const http = require('http');

const testFunctionCalling = async () => {
  const requestData = {
    model: "qwen3-coder:30b",
    messages: [
      {
        role: "user",
        content: "Write a Python script to print current date and time. Use the write_file function to save it."
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
              file_path: {
                type: "string",
                description: "Path to the file to write"
              },
              content: {
                type: "string", 
                description: "Content to write to the file"
              }
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

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('=== LLM Response ===');
          console.log(JSON.stringify(response, null, 2));
          
          if (response.choices && response.choices[0]) {
            const message = response.choices[0].message;
            console.log('\n=== Message Content ===');
            console.log(message.content);
            
            if (message.tool_calls) {
              console.log('\n=== Tool Calls ===');
              console.log(JSON.stringify(message.tool_calls, null, 2));
            } else {
              console.log('\n❌ NO TOOL CALLS FOUND - Function calling not working!');
            }
          }
          
          resolve(response);
        } catch (error) {
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(postData);
    req.end();
  });
};

console.log('Testing function calling with LLM endpoint...');
testFunctionCalling()
  .then(() => {
    console.log('\n✅ Test completed');
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
  });
