#!/usr/bin/env bun

import { Terminal_Window } from "./src/Terminal_Window.ts";
import { virtual_monitor_size } from "./src/virtual_monitor_size.ts";

// Mock socket listener for testing
class MockSocketListener {
  wayland_display_name: string = "test-display";
  clients: Set<any> = new Set();
  
  constructor() {}
  
  main_loop(): void {
    console.error("Mock socket listener main loop started");
  }
}

console.error("Testing Terminal_Window creation...");

try {
  const mockListener = new MockSocketListener();
  console.error("Creating Terminal_Window...");
  
  const terminal = new Terminal_Window(
    mockListener as any,
    false, // hide_status_bar
    virtual_monitor_size,
    false // will_show_app_right_at_startup
  );
  
  console.error("Terminal_Window created successfully!");
  console.error("Draw state:", terminal.draw_state ? "initialized" : "failed");
  
  // Clean up immediately
  try {
    process.stdin.setRawMode(false);
    console.error("Raw mode reset successfully");
  } catch (e) {
    console.error("Error resetting raw mode:", e);
  }
  
  console.error("Test completed successfully");
  
} catch (error) {
  console.error("Error creating Terminal_Window:", error.message);
  console.error("Stack:", error.stack);
  
  // Ensure cleanup
  try {
    process.stdin.setRawMode(false);
  } catch (e) {
    console.error("Error during cleanup:", e);
  }
}