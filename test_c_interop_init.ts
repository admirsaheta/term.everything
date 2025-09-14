#!/usr/bin/env bun

import c from "./src/c_interop.ts";
import { Display_Server_Type } from "./src/get_display_server_type.ts";

console.log("Testing c.init_draw_state()...");

try {
  const display_server_type = new Display_Server_Type();
  console.log("Display server type:", display_server_type.type);
  
  console.log("Calling c.init_draw_state()...");
  const draw_state = c.init_draw_state(display_server_type.type === "x11");
  
  console.log("c.init_draw_state() completed successfully!");
  console.log("Draw state:", draw_state ? "initialized" : "failed");
  
} catch (error) {
  console.error("Error in c.init_draw_state():", error.message);
  console.error("Stack:", error.stack);
}

console.log("Test completed");