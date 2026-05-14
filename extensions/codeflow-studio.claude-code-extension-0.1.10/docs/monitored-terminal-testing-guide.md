# Testing the Monitored Terminal - Step by Step Guide

## 🎯 **Comprehensive Testing Guide**

### **Step 1: Setup & Configuration**

1. **Compile the extension**:
   ```bash
   npm run compile
   ```

2. **Launch Extension Development Host** (press `F5` in VS Code)

3. **Configure auto-response** in VS Code Settings:
   ```json
   {
     "claude-code-extension.autoResponse.enabled": true,
     "claude-code-extension.autoResponse.defaultYesNo": "yes",
     "claude-code-extension.autoResponse.showNotifications": true,
     "claude-code-extension.autoResponse.preferDontAskAgain": false
   }
   ```

### **Step 2: Launch Monitored Terminal**

**Method A: Command Palette**
1. Open Command Palette (`Cmd/Ctrl + Shift + P`)
2. Type: "Claude Code: Launch Monitored Terminal (Beta)"
3. Press Enter

**Method B: UI Button**
1. Open Claude Code sidebar
2. Look for the Claude robot icon button in the Terminal Input view header
3. Click the robot icon (Monitored Terminal button)

### **Step 3: Verify Integration**

After launching, you should see:
- ✅ **New terminal** named "Claude Code (Monitored)" with robot icon
- ✅ **Notification**: "Input field is now connected to this terminal"
- ✅ **Terminal output**: "🤖 Claude Code (Monitored) - Auto-response enabled"
- ✅ **Input field focus** automatically returns to the sidebar

### **Step 4: Test Input Connection**

1. **Type in the input field**: "Hello Claude"
2. **Press Send** (or Enter)
3. **Verify**: Text appears in the monitored terminal and is sent to Claude Code

### **Step 5: Test Auto-Response**

**Method A: Real Claude Prompt**
1. **In the input field, type**: 
   ```
   Can you read the package.json file? (This often triggers permission prompts)
   ```
2. **Wait for Claude's response** with an interactive prompt
3. **Watch for**: Auto-response notification and automatic selection

**Method B: Simulation Test**
1. **Command Palette**: "Claude Code: Simulate Exact Output (Dev)"
2. **Watch for**: Notification showing auto-response was triggered
3. **Verify**: Response was sent to the monitored terminal

### **Step 6: Test Different Settings**

**Test 1: Always Choose "Yes"**
```json
{"claude-code-extension.autoResponse.defaultYesNo": "yes"}
```

**Test 2: Prefer "Don't Ask Again"**
```json
{
  "claude-code-extension.autoResponse.defaultYesNo": "yes",
  "claude-code-extension.autoResponse.preferDontAskAgain": true
}
```

**Test 3: Always Decline**
```json
{"claude-code-extension.autoResponse.defaultYesNo": "no"}
```

## 🔍 **Troubleshooting**

### **Issue: Claude Code Not Starting**

**Symptoms**: Terminal shows error message about Claude not found

**Solutions**:
1. **Check Claude installation**: Run `claude --version` in regular terminal
2. **Check PATH**: Ensure `claude` command is in your PATH
3. **Install Claude**: Follow Claude Code installation instructions
4. **Restart VS Code**: After installing Claude

### **Issue: Input Field Not Connected**

**Symptoms**: Typing in input field doesn't appear in monitored terminal

**Solutions**:
1. **Re-launch**: Run "Launch Monitored Terminal" command again
2. **Check terminal name**: Ensure terminal is named "Claude Code (Monitored)"
3. **Restart extension**: Reload VS Code window

### **Issue: No Auto-Response**

**Symptoms**: Prompts appear but no automatic response occurs

**Solutions**:
1. **Check settings**: Ensure `autoResponse.enabled` is `true`
2. **Check notifications**: Turn on `showNotifications` to see what's happening
3. **Test simulation**: Use "Simulate Exact Output" command to test pattern detection
4. **Check terminal type**: Must use monitored terminal, not regular terminal

### **Issue: Wrong Response Selected**

**Symptoms**: Auto-response chooses unexpected option

**Solutions**:
1. **Check `defaultYesNo`**: Set to "yes" or "no" based on preference
2. **Check `preferDontAskAgain`**: Enable/disable based on preference
3. **Use manual override**: Add "numbered" to `alwaysAskFor` for manual control

## 🎯 **Expected Behavior Summary**

For Claude Code prompts like:
```
Do you want to proceed?
► 1. Yes
2. Yes, and don't ask again for similar commands
3. No, and tell Claude what to do differently (esc)
```

| Configuration | Expected Response | Notification |
|---------------|------------------|-------------|
| `defaultYesNo: "yes"` | Selects `1` | "Auto-responded with: 1" |
| `defaultYesNo: "yes"`, `preferDontAskAgain: true` | Selects `2` | "Auto-responded with: 2" |
| `defaultYesNo: "no"` | Selects `3` | "Auto-responded with: 3" |

## 🚀 **Success Indicators**

You know it's working when:
- ✅ **Monitored terminal** shows Claude Code running
- ✅ **Input field** sends text to monitored terminal
- ✅ **Notifications** appear when auto-responding
- ✅ **Claude prompts** get automatic responses
- ✅ **Workflow continues** without manual intervention

## 🔄 **Development Testing**

For testing during development:

1. **Quick Pattern Test**: 
   - Command: "Claude Code: Simulate Exact Output (Dev)"
   - Tests pattern detection without waiting for real Claude prompts

2. **Settings Test**:
   - Change settings and run simulation
   - Verify different responses are selected

3. **Integration Test**:
   - Use monitored terminal for real Claude Code session
   - Ask Claude to do something requiring permission
   - Verify auto-response works end-to-end

The monitored terminal approach is the **only way** to make auto-response work with VSCode's security limitations!