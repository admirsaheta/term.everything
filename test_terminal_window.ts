#!/usr/bin/env bun

import { Terminal_Window } from "./src/Terminal_Window.ts";
import { virtual_monitor_size } from "./src/virtual_monitor_size.ts";

// Mock socket listener for testing
class MockSocketListener {
  wayland_display_name: string = "test-display";
  clients: Set<any> = new Set();
  
  constructor() {}
  
  main_loop(): void {
    console.log("Mock socket listener main loop started");
  }
}

console.log("Testing Terminal_Window creation...");

try {
  const mockListener = new MockSocketListener();
  console.log("Creating Terminal_Window...");
  
  const terminal = new Terminal_Window(
    mockListener as any,
    false, // hide_status_bar
    virtual_monitor_size,
    false // will_show_app_right_at_startup
  );
  
  console.log("Terminal_Window created successfully!");
  console.log("Draw state:", terminal.draw_state ? "initialized" : "failed");
  
  // Don't call main_loop to avoid hanging
  console.log("Test completed - Terminal_Window constructor works");
  
} catch (error) {
  console.error("Error creating Terminal_Window:", error.message);
  console.error("Stack:", error.stack);
}