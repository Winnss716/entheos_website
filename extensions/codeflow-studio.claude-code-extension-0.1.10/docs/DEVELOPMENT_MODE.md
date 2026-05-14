# Development Mode Guide

This document explains how to use the extension's development mode with mock data during development.

## Overview

The Claude Code Extension includes a development mode that uses mock response data instead of making actual calls to Claude Code CLI. This allows you to:

- Develop and test the extension without Claude Code CLI installed
- Avoid API costs during development
- Test with predictable, repeatable responses
- Work offline during development

## How It Works

### Automatic Detection

Development mode is automatically enabled when:

1. **Extension Development Host**: VSCode is running in Extension Development Host mode (when you press F5 to debug the extension)
2. **Mock Data Available**: The file `claude-response.jsonl` exists in the workspace root

### Mock Data File

The mock data file `claude-response.jsonl` contains sample Claude Code CLI responses in JSON Lines format. Each line is a complete JSON object representing different types of Claude Code responses:

- System initialization messages
- Assistant messages with thinking blocks
- Tool usage examples
- Result summaries with cost and usage data

## Usage During Development

### 1. Enable Development Mode

When you launch the extension in debug mode (F5), it will automatically:
- Check if running in Extension Development Host
- Look for `claude-response.jsonl` in the workspace
- Enable development mode if both conditions are met

You'll see console logs like:
```
🔧 Development Mode Enabled: Using mock data from claude-response.jsonl
🔧 Loaded 10 mock messages from claude-response.jsonl
```

### 2. Testing Message Flow

In development mode, when you send messages through Direct Mode:
- Your input is tracked normally
- Mock responses are simulated with realistic delays
- Messages are processed through the same pipeline as real responses
- All message types are tested (system, assistant, thinking, tools, results)

### 3. Console Output

Development mode provides detailed logging:
```
🔧 Development Mode: Using mock data instead of spawning Claude CLI
🔧 User message: Explain this function
🔧 File references: ['src/example.ts']
🔧 Development Mode: Simulating response 1/10
🔧 Development Mode: Processing mock assistant message
```

### 4. Reloading Mock Data

During development, you can reload the mock data without restarting:

1. **Command Palette**: Run "Claude Code: Reload Mock Data (Development)"
2. **Programmatically**: The service will automatically reload if the file changes

## Creating Custom Mock Data

### Format

Each line in `claude-response.jsonl` should be a valid JSON object representing a Claude Code CLI response:

```json
{"type":"system","subtype":"init","session_id":"abc123","cwd":"/path/to/workspace"}
{"type":"assistant","message":{"content":[{"type":"text","text":"Hello! How can I help?"}]}}
{"type":"result","subtype":"success","cost_usd":0.05,"result":"Task completed"}
```

### Message Types

The mock data should include examples of:
- `system` - Initialization and system messages
- `assistant` - AI responses with text and thinking blocks
- `user` - Tool results and user inputs
- `result` - Final session summaries with costs
- `error` - Error conditions

### Realistic Delays

The system simulates realistic delays:
- System messages: 100ms
- Assistant with thinking: 2000ms
- Regular assistant: 800ms
- Tool results: 200ms
- Final results: 500ms

## Benefits for Development

### 1. Faster Development Cycle
- No need to wait for actual Claude Code CLI responses
- Predictable timing and content
- No network dependencies

### 2. Cost Savings
- No API calls during development
- Unlimited testing without usage costs

### 3. Consistent Testing
- Same responses every time
- Test edge cases with crafted responses
- Reproducible bugs and scenarios

### 4. Offline Development
- Work without internet connection
- No authentication required
- Independent of Claude Code CLI installation

## Production vs Development

### Development Mode (Extension Development Host)
- Uses `claude-response.jsonl` mock data
- 🔧 prefix in console logs
- Simulated delays and responses
- No actual Claude Code CLI processes

### Production Mode (Installed Extension)
- Uses real Claude Code CLI
- Actual API calls and responses
- Real costs and authentication
- Full functionality

## Troubleshooting

### Development Mode Not Activating

Check that:
1. VSCode shows "Extension Development Host" in the title
2. `claude-response.jsonl` exists in workspace root
3. File contains valid JSON lines
4. Check console for error messages

### Mock Data Issues

If mock responses aren't working:
1. Verify JSON format in `claude-response.jsonl`
2. Check console for parsing errors
3. Use "Reload Mock Data" command
4. Restart extension development session

### Mixed Mode Issues

Development mode only affects Direct Mode. Terminal Mode will still try to use real Claude Code CLI even in development mode.

## Example Mock Data

See the included `claude-response.jsonl` file for a complete example of mock responses covering all message types and scenarios.