#!/usr/bin/env node

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

console.log('Starting macOS test...');

try {
  console.log('Testing native module import...');
  const c_interop = require('./src/c_interop.cjs');
  console.log('Native module loaded successfully');
  console.log('Available functions:', Object.keys(c_interop));
  
  console.log('Testing parse_args import...');
  // Test if we can import the parse_args module
  const { parse_args } = await import('./src/parse_args.ts');
  console.log('parse_args imported successfully');
  const args = await parse_args();
  console.log('Args parsed:', args);
  console.log('Test completed successfully!');
  
} catch (error) {
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}