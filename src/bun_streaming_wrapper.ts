#!/usr/bin/env bun

/**
 * Bun-compatible wrapper for macOS desktop streaming
 * 
 * This module provides a workaround for Bun's native module compatibility issues
 * by spawning Node.js processes to handle the native streaming functionality.
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import type { StreamFrame, StreamCallback } from './macOS_Display_Server.ts';

export interface BunStreamingConfig {
  width?: number;
  height?: number;
  quality?: number;
  nodeExecutable?: string;
}

export class BunStreamingWrapper extends EventEmitter {
  private streamProcess?: ChildProcess;
  private isStreaming: boolean = false;
  private config: Required<BunStreamingConfig>;
  private callback?: StreamCallback;

  constructor(config: BunStreamingConfig = {}) {
    super();
    this.config = {
      width: config.width ?? 1920,
      height: config.height ?? 1080,
      quality: config.quality ?? 75,
      nodeExecutable: config.nodeExecutable ?? 'node'
    };
  }

  /**
   * Start desktop streaming using Node.js subprocess
   */
  async startDesktopStream(callback: StreamCallback): Promise<boolean> {
    if (this.isStreaming) {
      console.warn('Desktop streaming is already active');
      return false;
    }

    try {
      this.callback = callback;
      
      // Create Node.js script for streaming
      const streamScript = this.createStreamingScript();
      
      // Spawn Node.js process
      this.streamProcess = spawn(this.config.nodeExecutable, [
        '--input-type=module',
        '--eval', streamScript
      ], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, DEV: '1' }
      });

      // Handle process output with buffering for partial JSON messages
      let buffer = '';
      let lastHeartbeat = Date.now();
      
      this.streamProcess.stdout?.on('data', (data) => {
        buffer += data.toString();
        
        // Process complete JSON messages (separated by newlines)
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const message = JSON.parse(line.trim());
              
              switch (message.type) {
                case 'frame':
                  if (this.callback) {
                    this.callback({
                      data: Buffer.from(message.data, 'base64'),
                      width: message.width,
                      height: message.height,
                      size: message.size
                    });
                  }
                  break;
                  
                case 'status':
                  console.log('Streaming status:', message.message);
                  this.emit('status', message.message);
                  break;
                  
                case 'error':
                  console.error('Stream process error:', message.message);
                  this.emit('error', new Error(message.message));
                  break;
                  
                case 'heartbeat':
                  lastHeartbeat = Date.now();
                  break;
                  
                case 'pong':
                  // Response to ping - process is alive
                  break;
                  
                default:
                  console.log('Unknown message type:', message.type);
              }
            } catch (error) {
              // Skip non-JSON lines (likely console output from native module)
              if (line.length > 10) { // Only warn for substantial non-JSON output
                console.warn('Skipping non-JSON output:', line.substring(0, 100));
              }
            }
          }
        }
      });
      
      // Monitor process health with heartbeat
      const healthCheck = setInterval(() => {
        if (this.streamProcess && !this.streamProcess.killed) {
          const timeSinceHeartbeat = Date.now() - lastHeartbeat;
          if (timeSinceHeartbeat > 15000) { // 15 seconds without heartbeat
            console.warn('Stream process appears unresponsive, sending ping');
            this.sendCommand({ action: 'ping' });
          }
        } else {
          clearInterval(healthCheck);
        }
      }, 10000); // Check every 10 seconds

      this.streamProcess.stderr?.on('data', (data) => {
        console.error('Stream process error:', data.toString());
      });

      this.streamProcess.on('exit', (code) => {
        console.log(`Stream process exited with code ${code}`);
        this.isStreaming = false;
        this.emit('stopped');
      });

      // Send start command to subprocess
      const startCommand = {
        action: 'start',
        width: this.config.width,
        height: this.config.height
      };
      
      this.sendCommand(startCommand);
      
      this.isStreaming = true;
      this.emit('started');
      
      return true;
    } catch (error) {
      console.error('Error starting desktop stream:', error);
      return false;
    }
  }

  /**
   * Stop desktop streaming
   */
  async stopDesktopStream(): Promise<boolean> {
    if (!this.isStreaming || !this.streamProcess) {
      console.warn('Desktop streaming is not active');
      return false;
    }

    try {
      // Send graceful stop command first
      const stopCommand = { action: 'stop' };
      this.sendCommand(stopCommand);
      
      // Give the process time to clean up gracefully
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Send exit command for clean shutdown
      const exitCommand = { action: 'exit' };
      this.sendCommand(exitCommand);
      
      // Wait a bit more for graceful exit
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (this.streamProcess && !this.streamProcess.killed) {
        this.streamProcess.kill('SIGTERM');
        
        // Force kill if it doesn't respond
        setTimeout(() => {
          if (this.streamProcess && !this.streamProcess.killed) {
            this.streamProcess.kill('SIGKILL');
          }
        }, 5000);
      }
      
      this.isStreaming = false;
      this.streamProcess = undefined;
      this.callback = undefined;
      this.emit('stopped');
      
      return true;
    } catch (error) {
      console.error('Error stopping desktop stream:', error);
      return false;
    }
  }

  /**
   * Check if streaming is active
   */
  isDesktopStreaming(): boolean {
    return this.isStreaming;
  }

  /**
   * Set streaming quality
   */
  async setStreamQuality(quality: number): Promise<boolean> {
    if (quality < 0 || quality > 100) {
      console.error('Stream quality must be between 0 and 100');
      return false;
    }

    this.config.quality = quality;
    
    if (this.isStreaming && this.streamProcess) {
      const qualityCommand = {
        action: 'quality',
        quality: quality / 100
      };
      return this.sendCommand(qualityCommand);
    }
    
    return true;
  }

  /**
   * Send a command to the streaming subprocess
   */
  private sendCommand(command: any): boolean {
    if (!this.streamProcess || this.streamProcess.killed) {
      console.warn('Cannot send command: stream process is not running');
      return false;
    }

    try {
      this.streamProcess.stdin?.write(JSON.stringify(command) + '\n');
      return true;
    } catch (error) {
      console.error('Failed to send command:', error);
      return false;
    }
  }

  /**
   * Create the Node.js streaming script
   */
  private createStreamingScript(): string {
    return `
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Redirect console.log to stderr to avoid JSON parsing issues
const originalConsole = console.log;
console.log = (...args) => {
  process.stderr.write('[LOG] ' + args.join(' ') + '\\n');
};

let c;
let isStreaming = false;
let streamCallback = null;
let keepAlive = true;

// Load the native module with proper error handling
try {
  // Use absolute path since __dirname may not be reliable in eval context
  const cInteropPath = '/Users/admirsaheta/Desktop/opensource/term.everything/src/c_interop.cjs';
  c = require(cInteropPath);
  
  const status = {
    type: 'status',
    message: 'Native module loaded successfully'
  };
  process.stdout.write(JSON.stringify(status) + '\\n');
} catch (error) {
  const errorMsg = {
    type: 'error',
    message: 'Failed to load native module: ' + error.message
  };
  process.stderr.write(JSON.stringify(errorMsg) + '\\n');
  process.exit(1);
}

// Keep the process alive with a heartbeat
const heartbeat = setInterval(() => {
  if (keepAlive) {
    const status = {
      type: 'heartbeat',
      timestamp: Date.now()
    };
    process.stdout.write(JSON.stringify(status) + '\\n');
  }
}, 5000);

// Handle incoming commands
process.stdin.on('data', (data) => {
  try {
    const command = JSON.parse(data.toString().trim());
    
    switch (command.action) {
      case 'start':
        if (!isStreaming) {
          streamCallback = (data, width, height, size) => {
            try {
              const message = {
                type: 'frame',
                data: data.toString('base64'),
                width,
                height,
                size
              };
              process.stdout.write(JSON.stringify(message) + '\\n');
            } catch (error) {
              process.stderr.write('[ERROR] Frame callback error: ' + error.message + '\\n');
            }
          };
          
          try {
            const success = c.start_desktop_stream(command.width, command.height, streamCallback);
            isStreaming = success;
            
            const status = {
              type: 'status',
              message: success ? 'Streaming started' : 'Failed to start streaming'
            };
            process.stdout.write(JSON.stringify(status) + '\\n');
          } catch (error) {
            const errorMsg = {
              type: 'error',
              message: 'Start streaming error: ' + error.message
            };
            process.stderr.write(JSON.stringify(errorMsg) + '\\n');
          }
        }
        break;
        
      case 'stop':
        if (isStreaming) {
          try {
            const success = c.stop_desktop_stream();
            isStreaming = false;
            streamCallback = null;
            
            const status = {
              type: 'status',
              message: success ? 'Streaming stopped' : 'Failed to stop streaming'
            };
            process.stdout.write(JSON.stringify(status) + '\\n');
          } catch (error) {
            const errorMsg = {
              type: 'error',
              message: 'Stop streaming error: ' + error.message
            };
            process.stderr.write(JSON.stringify(errorMsg) + '\\n');
          }
        }
        break;
        
      case 'quality':
        if (isStreaming) {
          try {
            const success = c.set_stream_quality(command.quality);
            const status = {
              type: 'status',
              message: success ? \`Quality set to \${command.quality * 100}%\` : 'Failed to set quality'
            };
            process.stdout.write(JSON.stringify(status) + '\\n');
          } catch (error) {
            const errorMsg = {
              type: 'error',
              message: 'Set quality error: ' + error.message
            };
            process.stderr.write(JSON.stringify(errorMsg) + '\\n');
          }
        }
        break;
        
      case 'ping':
        const pong = {
          type: 'pong',
          timestamp: Date.now()
        };
        process.stdout.write(JSON.stringify(pong) + '\\n');
        break;
        
      case 'exit':
        keepAlive = false;
        clearInterval(heartbeat);
        if (isStreaming) {
          try {
            c.stop_desktop_stream();
          } catch (error) {
            process.stderr.write('[ERROR] Cleanup error: ' + error.message + '\\n');
          }
        }
        process.exit(0);
        break;
    }
  } catch (error) {
    const errorMsg = {
      type: 'error',
      message: 'Command processing error: ' + error.message
    };
    process.stderr.write(JSON.stringify(errorMsg) + '\\n');
  }
});

// Handle process termination gracefully
const cleanup = () => {
  keepAlive = false;
  clearInterval(heartbeat);
  if (isStreaming) {
    try {
      c.stop_desktop_stream();
    } catch (error) {
      process.stderr.write('[ERROR] Cleanup error: ' + error.message + '\\n');
    }
  }
};

process.on('SIGTERM', () => {
  cleanup();
  process.exit(0);
});

process.on('SIGINT', () => {
  cleanup();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  const errorMsg = {
    type: 'error',
    message: 'Uncaught exception: ' + error.message
  };
  process.stderr.write(JSON.stringify(errorMsg) + '\\n');
  cleanup();
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  const errorMsg = {
    type: 'error',
    message: 'Unhandled rejection: ' + reason
  };
  process.stderr.write(JSON.stringify(errorMsg) + '\\n');
});
`;
  }
}

export default BunStreamingWrapper;