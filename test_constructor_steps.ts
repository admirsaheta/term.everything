#!/usr/bin/env bun

import { Ansi_Escape_Codes } from "./src/Ansi_Escape_Codes.ts";
import { debug_turn_off_output } from "./src/debug_turn_off_output.ts";
import { on_exit } from "./src/on_exit.ts";
import c from "./src/c_interop.ts";
import { Display_Server_Type } from "./src/get_display_server_type.ts";

console.log("Testing Terminal_Window constructor steps...");

try {
  console.log("1. Creating display server type...");
  const display_server_type = new Display_Server_Type();
  
  console.log("2. Calling c.init_draw_state...");
  const draw_state = c.init_draw_state(display_server_type.type === "x11");
  
  console.log("3. Setting raw mode...");
  process.stdin.setRawMode(true);
  
  console.log("4. Writing ANSI escape codes...");
  
  if (!debug_turn_off_output()) {
    console.log("4a. Writing alternative screen buffer...");
    process.stdout.write(Ansi_Escape_Codes.enable_alternative_screen_buffer);
  }
  
  console.log("4b. Writing mouse tracking...");
  process.stdout.write(Ansi_Escape_Codes.enable_mouse_tracking);
  
  console.log("4c. Writing hide cursor...");
  process.stdout.write(Ansi_Escape_Codes.hide_cursor);
  
  console.log("5. Setting up on_exit...");
  const cleanup = () => {
    console.log("Cleanup called");
    process.stdout.write(Ansi_Escape_Codes.disable_alternative_screen_buffer);
    process.stdout.write(Ansi_Escape_Codes.show_cursor);
    process.stdout.write(Ansi_Escape_Codes.disable_mouse_tracking);
    process.stdin.setRawMode(false);
  };
  
  on_exit(cleanup);
  
  console.log("All constructor steps completed successfully!");
  
  // Clean up immediately
  cleanup();
  
} catch (error) {
  console.error("Error in constructor steps:", error.message);
  console.error("Stack:", error.stack);
  
  // Ensure cleanup
  try {
    process.stdin.setRawMode(false);
    process.stdout.write(Ansi_Escape_Codes.show_cursor);
  } catch (e) {}
}

console.log("Test completed");