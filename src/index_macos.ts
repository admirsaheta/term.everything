/**
 * macOS-specific entry point for term.everything
 * 
 * This provides macOS support as an alternative to the Linux/Wayland implementation
 */

import { Terminal_Window } from "./Terminal_Window.ts";
import { virtual_monitor_size } from "./virtual_monitor_size.ts";
import { parse_args } from "./parse_args.ts";
import { MacOSDisplayServer } from "./macOS_Display_Server.ts";
import { spawn } from 'child_process'

/**
 * Mock Wayland Socket Listener interface for macOS compatibility
 */
class MacOSSocketListener {
  wayland_display_name: string = "macos-display";
  clients: Set<any> = new Set(); // Empty set for compatibility with Terminal_Window
  
  constructor(private args: any) {
    // Initialize macOS-specific display handling
  }
  
  main_loop(): void {
    // macOS display server main loop
    // This replaces the Wayland socket listening functionality
  }
}

/**
 * Main entry point for macOS
 */
export async function startMacOSTerminal(): Promise<void> {
  const args = await parse_args();
  
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

  // Handle command execution on macOS
  if (command_args.length > 0) {
    const env: any = {
      ...process.env,
      DISPLAY_SERVER: "quartz",
      TERM_PLATFORM: "macos"
    };
    
    spawn(args.values["shell"], ["-c", command_args.join(" ")], {
      env,
    });
  }
}

// Auto-start if this file is run directly
if (import.meta.main) {
  startMacOSTerminal().catch(console.error);
}