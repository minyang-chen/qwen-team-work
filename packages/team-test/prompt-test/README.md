# Prompt Test Suite

Automated tests for chat prompts from `CHAT_PROMPTS.md`.

## Prerequisites

- team-storage running on port 8000
- team-ai-agent running on port 8001
- Demo user account (username: demo, password: demo)

## Running Tests

```bash
# From this directory
node run-tests.js

# Or from project root
node packages/team-test/prompt-test/run-tests.js
```

## Test Cases

The test suite includes 14 prompts covering:

1. **Simple greeting** - Basic conversation
2. **List files** - Command interpretation
3. **Print working directory** - System commands
4. **Shell command** - Direct shell execution with `!`
5. **Content generation** - Creative writing
6. **Code generation** - Python quicksort
7. **File reading** - Read README.md
8. **Web scraping** - Fetch and summarize URL
9. **User memory set** - Store user information
10. **User memory recall** - Retrieve stored information
11. **Help command** - Display available commands
12. **File counting** - Count files in directory
13. **File creation** - Create sample.txt
14. **File deletion** - Delete sample.txt

## Output

The test runner provides:
- Individual test results with duration
- Response previews
- Summary statistics (passed/failed/average duration)
- Failed test details

## Example Output

```
🚀 Starting Prompt Tests
📍 Storage: http://localhost:8000
📍 AI Agent: http://localhost:8001

🔐 Logging in as: demo
✅ Login successful

📝 Creating new session...
✅ Session created: abc123...

================================================================================
📋 Test 1: Simple greeting
💬 Prompt: "hello"
================================================================================
⏱️  Duration: 1234ms
📊 Status: 200
✅ Response received
📝 Preview: Hello! How can I help you today?

...

================================================================================
📊 TEST SUMMARY
================================================================================
✅ Passed: 14/14
❌ Failed: 0/14
⏱️  Average Duration: 1500ms
================================================================================
```

## Configuration

Edit `run-tests.js` to modify:
- `STORAGE_BASE` - team-storage URL
- `AI_AGENT_BASE` - team-ai-agent URL
- `TEST_USER` - Test credentials
- `TEST_PROMPTS` - Test cases

## Notes

- Tests run sequentially with 1 second delay between each
- All tests use the same session to test conversation history
- Exit code 0 = all passed, 1 = some failed
