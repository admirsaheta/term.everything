/**
 * macOS-specific entry point for term.everything
 * 
 * This provides macOS support as an alternative to the Linux/Wayland implementation
 * Enhanced to work like a full Linux terminal on macOS
 */

import { Terminal_Window } from "./Terminal_Window.ts";
import { virtual_monitor_size } from "./virtual_monitor_size.ts";
import { parse_args } from "./parse_args.ts";
import { MacOSDisplayServer } from "./macOS_Display_Server.ts";
import { spawn, ChildProcess } from 'child_process';
import { MacOSTerminalManager } from "./MacOSTerminalManager.ts";

/**
 * Enhanced Wayland Socket Listener interface for macOS compatibility
 * Provides full terminal functionality similar to Linux
 */
class MacOSSocketListener {
  wayland_display_name: string = "macos-display";
  clients: Set<any> = new Set(); // Empty set for compatibility with Terminal_Window
  public terminalManager: MacOSTerminalManager;
  
  constructor(private args: any) {
    // Initialize macOS-specific display handling with full terminal support
    this.terminalManager = new MacOSTerminalManager();
  }
  
  main_loop(): void {
    // macOS display server main loop
    // This replaces the Wayland socket listening functionality
    // Enhanced to handle terminal operations
    this.terminalManager.initialize();
  }
  
  /**
   * Execute command in macOS terminal environment
   */
  executeCommand(command: string, args: string[] = []): ChildProcess {
    return this.terminalManager.executeCommand(command, args);
  }
  
  /**
   * Open application on macOS
   */
  openApplication(appName: string): Promise<void> {
    return this.terminalManager.openApplication(appName);
  }
}

/**
 * Main entry point for macOS - Enhanced Terminal Functionality
 */
export async function startMacOSTerminal(): Promise<void> {
  const args = await parse_args();
  
  console.log('🍎 Starting macOS Terminal with enhanced functionality...');
  
  // Initialize macOS display server instead of Wayland
  const displayServer = new MacOSDisplayServer();
  await displayServer.initialize();
  
  const command_args = args.positionals;
  const listener = new MacOSSocketListener(args.values);
  const will_show_app_right_at_startup = command_args.length > 0;

  const terminal_window = new Terminal_Window(
    listener as any, // Type compatibility with existing Terminal_Window
    args.values["hide-status-bar"],
    virtual_monitor_size,
    will_show_app_right_at_startup
  );

  // Start the display server and terminal
  await displayServer.start();
  
  // Start both main loops concurrently (don't await them)
  listener.main_loop();
  terminal_window.main_loop();

  // Enhanced command execution on macOS
  if (command_args.length > 0) {
    const fullCommand = command_args.join(" ");
    console.log(`🚀 Executing command: ${fullCommand}`);
    
    try {
      // Check if it's an application to open
      if (fullCommand.startsWith('open ') || isApplicationName(fullCommand)) {
        await listener.openApplication(fullCommand.replace('open ', ''));
      } else {
        // Execute as regular command with enhanced environment
        const result = await listener.terminalManager.executeCommonCommand(
          args.values["shell"], 
          ["-c", fullCommand]
        );
        
        if (result.exitCode !== 0) {
          console.error(`❌ Command failed with exit code ${result.exitCode}`);
          if (result.stderr) {
            console.error(result.stderr);
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to execute command:', error);
    }
  } else {
    // Interactive mode - show system info and available commands
    await showWelcomeMessage(listener.terminalManager);
  }
}

/**
 * Check if the command is an application name
 */
function isApplicationName(command: string): boolean {
  const commonApps = [
    'safari', 'chrome', 'firefox', 'vscode', 'code', 'xcode',
    'terminal', 'iterm', 'finder', 'calculator', 'calendar',
    'mail', 'messages', 'facetime', 'photos', 'music', 'tv',
    'notes', 'reminders', 'maps', 'weather', 'stocks', 'news'
  ];
  
  return commonApps.some(app => 
    command.toLowerCase().includes(app) || 
    command.toLowerCase() === app
  );
}

/**
 * Show welcome message and system information
 */
async function showWelcomeMessage(terminalManager: MacOSTerminalManager): Promise<void> {
  console.log('\n🍎 Welcome to term.everything for macOS!');
  console.log('━'.repeat(50));
  console.log('This terminal provides Linux-like functionality on macOS.');
  console.log('You can run any command or open any application.\n');
  
  try {
    const systemInfo = await terminalManager.getSystemInfo();
    console.log('📊 System Information:');
    for (const [key, value] of Object.entries(systemInfo)) {
      console.log(`   ${key}: ${value}`);
    }
  } catch (error) {
    console.log('   Unable to retrieve system information');
  }
  
  console.log('\n💡 Usage Examples:');
  console.log('   • Run commands: bun src/index_macos.ts "ls -la"');
  console.log('   • Open apps: bun src/index_macos.ts "open Safari"');
  console.log('   • Execute scripts: bun src/index_macos.ts "python script.py"');
  console.log('   • System commands: bun src/index_macos.ts "top"');
  console.log('━'.repeat(50));
}

// Auto-start if this file is run directly
if (import.meta.main) {
  startMacOSTerminal().catch(console.error);
}