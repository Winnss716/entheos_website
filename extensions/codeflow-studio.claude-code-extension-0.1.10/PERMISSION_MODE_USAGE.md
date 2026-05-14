# Permission Mode Feature

## Overview

The Claude Code VSCode Extension now includes a **Permission Mode Selector** that allows users to control how Claude handles tool execution permissions. This feature is seamlessly integrated into the extension's header alongside the existing Direct/Terminal mode toggle.

## Features

### 🎛️ Permission Modes

1. **Ask Each Time** (`default`)
   - Claude prompts for permission before using each tool
   - Safest option for interactive use
   - Recommended for general development

2. **Plan Only** (`plan`)
   - Claude handles tool approval behavior internally based on planning context
   - Designed for analysis and planning phases
   - Allows Claude to explore and understand with appropriate restrictions

3. **Auto-Accept Edits** (`acceptEdits`)
   - Automatically approves file editing tools (Edit, Write, Read, MultiEdit)
   - Still prompts for potentially dangerous tools (Bash commands, etc.)
   - Good balance of automation and safety

4. **Bypass All (Dangerous)** (`bypassPermissions`)
   - Automatically approves ALL tools without prompting
   - Use only in secure, isolated environments
   - Equivalent to `--dangerously-skip-permissions` flag

### 🎨 UI Design

- **Location**: Integrated in the extension header next to the Direct/Terminal mode toggle
- **Visual Indicators**: Color-coded borders based on safety level
  - Blue: Default (safe)
  - Purple: Plan Only (read-only safe)
  - Yellow: Accept Edits (moderate)
  - Red: Bypass All (dangerous)
- **Responsive**: Adapts to narrow VSCode sidebars with stacked layout
- **Accessibility**: Full keyboard navigation and screen reader support

### 💾 Persistence

The permission mode setting is persisted in two ways:

1. **VSCode Global State**: Quick restoration across extension restarts
2. **Workspace Settings**: Saved to `.claude/settings.local.json` for workspace-specific preferences

## Usage

### Setting Permission Mode

1. **Via UI**: Use the dropdown in the extension header
2. **Via Settings**: Modify `.claude/settings.local.json`:
   ```json
   {
     "permissionMode": "plan",
     "allowedTools": ["Read", "Write", "Edit"]
   }
   ```

### Command Line Integration

The permission mode is automatically translated to Claude CLI arguments:

- `default` → `--permission-mode default`
- `plan` → `--permission-mode plan`
- `acceptEdits` → `--permission-mode acceptEdits`
- `bypassPermissions` → `--permission-mode bypassPermissions`

## Architecture

### Backend Components

1. **PermissionService** (`src/service/permissionService.ts`)
   - Manages permission mode state
   - Handles CLI argument generation
   - Provides auto-approval logic

2. **ModeManager** (`src/ui/services/ModeManager.ts`)
   - Coordinates permission mode changes
   - Handles persistence to VSCode global state
   - Manages UI communication

3. **DirectModeService** (`src/service/directModeService.ts`)
   - Integrates permission mode args into Claude CLI commands
   - Exposes PermissionService instance

### Frontend Components

1. **HTML Template** (`src/ui/services/WebviewTemplateGenerator.ts`)
   - Permission mode selector UI
   - Responsive CSS styling
   - Visual safety indicators

2. **Permission Mode Manager** (`media/js/modules/permissionModeManager.js`)
   - Handles UI interactions
   - Manages frontend state
   - Provides user feedback

3. **Main Application** (`media/js/main.js`)
   - Coordinates module initialization
   - Handles backend communication

## Security Considerations

### Safe Defaults
- Extension defaults to `default` mode (ask each time)
- Visual warnings for dangerous modes
- Automatic fallback on errors

### Workspace Isolation
- Settings saved per workspace
- No cross-workspace permission leakage
- Clear mode indicators

### Tool Auto-Approval by Mode

**Plan Mode** (`plan`):
- Claude handles tool approval internally based on planning context
- Behavior is managed by Claude's internal logic

**Accept Edits Mode** (`acceptEdits`) - File editing tools are auto-approved:
- `Edit` - File modifications
- `Write` - File creation
- `Read` - File reading
- `MultiEdit` - Batch file operations

All other tools (especially `Bash`) still require explicit permission in Accept Edits mode.

## Testing

### Manual Testing Checklist

1. **UI Functionality**
   - [ ] Permission mode selector appears in header
   - [ ] Dropdown shows all three options
   - [ ] Visual indicators change with mode selection
   - [ ] Responsive layout works on narrow sidebars

2. **Backend Integration**
   - [ ] Mode changes trigger backend updates
   - [ ] Claude CLI receives correct `--permission-mode` args
   - [ ] Auto-approval works as expected in each mode

3. **Persistence**
   - [ ] Mode persists across extension restarts
   - [ ] Workspace-specific settings work correctly
   - [ ] Global state restoration functions properly

4. **Error Handling**
   - [ ] Graceful fallback to default mode on errors
   - [ ] File permission errors handled properly
   - [ ] Invalid mode values rejected

### End-to-End Test Scenarios

1. **Default Mode Test**
   ```
   1. Set mode to "Ask Each Time"
   2. Ask Claude to edit a file
   3. Verify permission dialog appears
   4. Approve the action
   5. Verify file is edited
   ```

2. **Plan Mode Test**
   ```
   1. Set mode to "Plan Only"
   2. Ask Claude to analyze the codebase
   3. Verify no permission dialog for Read/Grep/Glob/LS tools
   4. Ask Claude to edit a file
   5. Verify permission dialog appears for Edit tools
   6. Ask Claude to run a bash command
   7. Verify permission dialog appears for Bash
   ```

3. **Accept Edits Mode Test**
   ```
   1. Set mode to "Auto-Accept Edits"
   2. Ask Claude to edit a file
   3. Verify no permission dialog for Edit tools
   4. Ask Claude to run a bash command
   5. Verify permission dialog appears for Bash
   ```

4. **Bypass Mode Test**
   ```
   1. Set mode to "Bypass All (Dangerous)"
   2. Ask Claude to edit files and run commands
   3. Verify no permission dialogs appear
   4. Verify all actions execute automatically
   ```

## Future Enhancements

### Possible Improvements

1. **Custom Tool Groups**
   - Allow users to define custom auto-approval groups
   - More granular control over tool categories

2. **Workspace Templates**
   - Pre-configured permission modes for different project types
   - Quick setup for common development scenarios

3. **Activity Logging**
   - Track tool usage and permission grants
   - Security audit capabilities

4. **Integration with VSCode Settings**
   - Native VSCode settings panel integration
   - Workspace vs. user-level preferences

## Implementation Notes

### Key Design Decisions

1. **Sidebar Placement**: Positioned next to mode toggle for logical grouping
2. **Visual Safety Cues**: Color coding to indicate risk levels
3. **Dual Persistence**: Both global state and workspace settings for flexibility
4. **Module Separation**: Clean architecture with dedicated permission mode manager

### Performance Considerations

- Permission mode checks are performed synchronously
- Settings persistence is async to avoid blocking UI
- Minimal overhead for permission mode argument injection

### Compatibility

- Works with all existing Claude Code CLI features
- Backward compatible with existing workflows
- No breaking changes to existing extension functionality

## Conclusion

The Permission Mode feature provides users with fine-grained control over Claude's tool execution permissions while maintaining the extension's ease of use. The three-tier system (Ask Each Time, Auto-Accept Edits, Bypass All) covers common usage patterns from maximum security to full automation, with clear visual indicators and robust persistence mechanisms.