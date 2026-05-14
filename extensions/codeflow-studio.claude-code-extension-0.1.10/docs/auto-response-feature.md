# Auto-Response Feature for Claude Code VSCode Extension

## Overview

The Auto-Response feature enables the Claude Code extension to automatically respond to interactive prompts from Claude Code, eliminating the need for manual intervention during REPL sessions. This feature is particularly useful for repetitive tasks where you want Claude to always choose option 1, or always respond "yes" to permission requests.

## Features

### Supported Prompt Types

1. **Claude Code Numbered Options**: When Claude Code presents interactive choices
   - Example: 
     ```
     Do you want to proceed?
     ► 1. Yes
     2. Yes, and don't ask again for similar commands
     3. No, and tell Claude what to do differently (esc)
     ```
   - Intelligently selects based on your Yes/No preference rather than just option number

2. **Yes/No Prompts**: Simple yes/no questions
   - Example: "Do you want to continue? (y/n):"
   - Automatically responds with configured preference

3. **Permission Requests**: When Claude asks for permission to perform actions
   - Example: "This will modify files. Continue? (y/n)"
   - Can be configured to always ask or auto-respond

4. **File Conflicts**: When Claude encounters file conflicts
   - Example: "File exists. Overwrite? (y/n/a)"
   - Supports yes/no/all responses

### Configuration Options

Access these settings through VS Code Settings (search for "Claude Code"):

#### `claude-code-extension.autoResponse.enabled`
- **Type**: Boolean
- **Default**: `false`
- **Description**: Enable automatic response to Claude Code interactive prompts

#### `claude-code-extension.autoResponse.defaultOption`
- **Type**: Number (1-10)
- **Default**: `1`
- **Description**: Default option number to select for numbered choices

#### `claude-code-extension.autoResponse.defaultYesNo`
- **Type**: String (`"yes"` or `"no"`)
- **Default**: `"yes"`
- **Description**: Default response for yes/no prompts

#### `claude-code-extension.autoResponse.alwaysAskFor`
- **Type**: Array of strings
- **Default**: `["permission", "fileconflict"]`
- **Options**: `["numbered", "yesno", "permission", "fileconflict", "all"]`
- **Description**: Prompt types that should always require manual confirmation

#### `claude-code-extension.autoResponse.showNotifications`
- **Type**: Boolean
- **Default**: `true`
- **Description**: Show notifications when auto-responding to prompts

#### `claude-code-extension.autoResponse.preferDontAskAgain`
- **Type**: Boolean
- **Default**: `false`
- **Description**: When available, prefer "don't ask again" options in Claude Code prompts

## Usage

### Enabling Auto-Response

1. Open VS Code Settings (`Cmd/Ctrl + ,`)
2. Search for "Claude Code Auto Response"
3. Check "Enable automatic response to Claude Code interactive prompts"
4. Configure your preferences for default options and responses

### Testing the Feature

1. Open the Command Palette (`Cmd/Ctrl + Shift + P`)
2. Run "Claude Code: Test Auto-Response Feature"
3. Select a test scenario to see how the feature works
4. The system will show your current settings and simulate Claude prompts

### Manual Override

Even with auto-response enabled, you can configure certain prompt types to always require manual confirmation:

- **permission**: Permission requests (recommended for safety)
- **fileconflict**: File conflict resolutions (recommended for safety) 
- **numbered**: All numbered option prompts
- **yesno**: All yes/no prompts
- **all**: All prompt types (disables auto-response effectively)

When manual override is triggered, a VS Code Quick Pick dialog will appear, allowing you to make the choice manually.

## Examples

### Example 1: Always Choose Option 1
```json
{
  "claude-code-extension.autoResponse.enabled": true,
  "claude-code-extension.autoResponse.defaultOption": 1,
  "claude-code-extension.autoResponse.alwaysAskFor": ["permission", "fileconflict"]
}
```

### Example 2: Always Say Yes (with caution)
```json
{
  "claude-code-extension.autoResponse.enabled": true,
  "claude-code-extension.autoResponse.defaultYesNo": "yes",
  "claude-code-extension.autoResponse.alwaysAskFor": ["permission", "fileconflict"]
}
```

### Example 3: Conservative Settings (safer)
```json
{
  "claude-code-extension.autoResponse.enabled": true,
  "claude-code-extension.autoResponse.defaultOption": 1,
  "claude-code-extension.autoResponse.defaultYesNo": "no",
  "claude-code-extension.autoResponse.alwaysAskFor": ["permission", "fileconflict", "yesno"]
}
```

### Example 4: Claude Code Optimized Settings
```json
{
  "claude-code-extension.autoResponse.enabled": true,
  "claude-code-extension.autoResponse.defaultYesNo": "yes",
  "claude-code-extension.autoResponse.preferDontAskAgain": true,
  "claude-code-extension.autoResponse.alwaysAskFor": ["permission", "fileconflict"]
}
```

## Safety Considerations

### Recommended Safe Defaults

The extension ships with safe defaults:
- Auto-response is **disabled** by default
- Permission requests always require manual confirmation
- File conflicts always require manual confirmation
- Notifications are shown when auto-responding

### Best Practices

1. **Start Conservative**: Begin with auto-response disabled and enable it gradually
2. **Keep Manual Override**: Always keep `["permission", "fileconflict"]` in `alwaysAskFor`
3. **Test First**: Use the test command to understand how the feature works
4. **Monitor Notifications**: Keep notifications enabled to track auto-responses
5. **Review Settings**: Regularly review your auto-response settings

### Potential Risks

- **Unintended Actions**: Auto-responding "yes" to destructive operations
- **Wrong Choices**: Automatically selecting inappropriate options
- **Data Loss**: Overwriting files without confirmation

## Technical Implementation

### Architecture

The auto-response feature consists of several components:

1. **OutputMonitorService**: Analyzes Claude output for interactive prompts
2. **Pattern Detection**: Uses regex patterns to identify different prompt types
3. **Configuration Management**: Loads user preferences from VS Code settings
4. **Response Generation**: Creates appropriate responses based on configuration
5. **Terminal Integration**: Sends responses back to Claude Code terminal

### Limitations

- **Terminal Access**: VSCode extensions have limited access to terminal output
- **Pattern Matching**: Relies on text pattern recognition which may not be 100% accurate
- **Timing**: There may be slight delays in detecting and responding to prompts
- **Claude Updates**: Changes to Claude Code's prompt format may require updates

## Troubleshooting

### Auto-Response Not Working

1. **Check if enabled**: Verify `claude-code-extension.autoResponse.enabled` is `true`
2. **Check prompt type**: Ensure the prompt type isn't in `alwaysAskFor` list
3. **Check patterns**: Some custom prompts may not match the detection patterns
4. **Restart extension**: Try reloading the VS Code window

### Unexpected Responses

1. **Review settings**: Check your `defaultOption` and `defaultYesNo` values
2. **Use test command**: Test the feature with known scenarios
3. **Enable notifications**: Turn on notifications to see when auto-responses occur
4. **Add to override list**: Add problematic prompt types to `alwaysAskFor`

### Performance Issues

1. **Disable if not needed**: Turn off auto-response when not required
2. **Reduce monitoring**: The feature adds minimal overhead but can be disabled
3. **Check notifications**: Too many notifications can be distracting

## Future Enhancements

Potential improvements for future versions:

1. **Custom Pattern Support**: Allow users to define custom prompt patterns
2. **Context-Aware Responses**: Different responses based on the current task
3. **Learning Mode**: Learn from user manual responses to improve automation
4. **Advanced Override Logic**: More sophisticated rules for when to ask manually
5. **Integration with Claude Modes**: Different behavior for different Claude operating modes

## API Reference

### Commands

- `claude-code-extension.testAutoResponse`: Test the auto-response feature

### Configuration Schema

See the configuration options section above for the complete schema.

### Events

The auto-response system emits the following internal events:
- Prompt detected
- Response generated  
- Manual override triggered
- Configuration changed

---

This feature enhances productivity by reducing manual intervention in Claude Code sessions while maintaining safety through configurable manual overrides.