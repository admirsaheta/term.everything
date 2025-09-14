#!/usr/bin/env bun

import { parse_args } from "./src/parse_args.ts";
import { MacOSDisplayServer } from "./src/macOS_Display_Server.ts";
import { virtual_monitor_size } from "./src/virtual_monitor_size.ts";

console.log('Starting simple macOS test...');

try {
  console.log('1. Parsing args...');
  const args = await parse_args();
  console.log('Args parsed successfully:', args);
  
  console.log('2. Creating display server...');
  const displayServer = new MacOSDisplayServer();
  console.log('Display server created');
  
  console.log('3. Initializing display server...');
  await displayServer.initialize();
  console.log('Display server initialized');
  
  console.log('4. Starting display server...');
  await displayServer.start();
  console.log('Display server started');
  
  console.log('5. Getting virtual monitor size...');
  console.log('Virtual monitor size:', virtual_monitor_size);
  
  console.log('Test completed successfully!');
  process.exit(0);
  
} catch (error) {
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}