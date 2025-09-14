#!/usr/bin/env bun

console.log("Testing process.stdin.setRawMode()...");

try {
  console.log("Before setRawMode");
  process.stdin.setRawMode(true);
  console.log("setRawMode(true) completed successfully!");
  
  // Reset immediately to avoid hanging
  process.stdin.setRawMode(false);
  console.log("setRawMode(false) completed successfully!");
  
} catch (error) {
  console.error("Error in setRawMode:", error.message);
  console.error("Stack:", error.stack);
}

console.log("Test completed");