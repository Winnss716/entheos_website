# Streaming JSON Input Usage

This document explains how to use the new streaming JSON input feature in the Claude Code extension.

## Overview

The extension now supports both modes of Claude CLI interaction:

1. **Per-message mode** (default): Spawns `claude -p` for each message
2. **Streaming mode** (new): Maintains a persistent Claude process using `--input-format stream-json`

## Enabling Streaming Mode

### 🚀 Automatic (Default - Already Enabled!)

Streaming mode is **automatically enabled** when the extension starts. No action needed!

### 🎛️ Via Command Palette

1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Type "Claude Code: Enable Streaming Mode"
3. Press Enter
4. See confirmation message

### 💻 Programmatically

```typescript
// In your code (e.g., in extension.ts or when initializing)
const modeManager = new ModeManager(context, callbacks, workspaceRoot);

// Enable streaming mode
modeManager.enableStreamingMode(true);

// Disable streaming mode (return to per-message mode)
modeManager.enableStreamingMode(false);
```

### ⚙️ Via Settings (future enhancement)

```json
{
  "claudeCode.useStreamingMode": true
}
```

## How It Works

### Per-message Mode (Default)
- Each user message spawns a new `claude -p` process
- Uses `--resume` to maintain conversation continuity
- Process exits after response is complete
- Proven reliability but higher process overhead

### Streaming Mode
- Single persistent Claude process with `--input-format stream-json`
- Messages sent via stdin as JSON objects
- Lower overhead, faster message processing
- Maintains conversation state within single process

## Message Format

When using streaming mode, messages are sent as JSON to Claude's stdin in the correct format:

```json
{
  "type": "user",
  "message": {
    "role": "user",
    "content": [
      {
        "type": "text",
        "text": "Hello Claude!"
      }
    ]
  },
  "sessionId": "optional-session-id"
}
```

The extension automatically formats your simple text input into this structure.

## Benefits of Streaming Mode

1. **Lower Latency**: No process startup overhead for each message
2. **Better Resource Usage**: Single process vs multiple processes
3. **Faster Conversations**: Immediate message processing
4. **Session Continuity**: Native session handling within single process

## Fallback Behavior

- If streaming process fails, automatically falls back to per-message mode
- If streaming is disabled mid-conversation, switches gracefully
- All existing functionality preserved regardless of mode

## Testing

To test streaming mode:

1. Enable streaming in ModeManager
2. Start Direct Mode conversation
3. Send multiple messages
4. Observe single persistent Claude process
5. Check logs for "streaming mode" indicators

## Implementation Details

### ProcessManager Changes
- Added `startStreamingProcess()` method
- Added `sendStreamingMessage()` method with proper message formatting
- Added `isStreamingMode()` check
- Modified stdio configuration for streaming

### DirectModeService Changes
- Added `enableStreamingMode()` method
- Split `sendMessage()` into streaming and one-shot variants
- Added streaming-specific handlers
- Special handling for `result` messages to hide loading indicator
- Preserved all existing functionality

### ModeManager Integration
- Added `enableStreamingMode()` public method
- Maintains backward compatibility
- Easy to toggle between modes

### Loading Indicator Management
- In streaming mode, the loading indicator is automatically hidden when a `result` message is received
- The `result` message indicates the end of a turn but keeps the process running
- Uses `turnComplete` flag in metadata to signal UI updates

## Result Message Handling

When Claude sends a `result` message at the end of a turn:
```json
{
  "type": "result",
  "subtype": "success",
  "duration_ms": 1234.5,
  "duration_api_ms": 1000.2,
  "is_error": false,
  "num_turns": 1,
  "result": "Task completed successfully",
  "session_id": "session-123",
  "total_cost_usd": 0.001
}
```

The extension:
1. Processes the result message normally
2. Sets `processRunning: false` to hide the loading indicator
3. Sets `turnComplete: true` to indicate the turn is complete
4. Keeps the streaming process alive for the next message

## Future Enhancements

1. VSCode setting to control streaming mode
2. Automatic mode selection based on conversation length
3. Performance monitoring and auto-fallback
4. Streaming mode status indicator in UI
5. Display turn statistics from result messages