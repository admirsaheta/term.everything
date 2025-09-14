#!/usr/bin/env bun
/**
 * Simple macOS Terminal Implementation
 * 
 * A lightweight terminal that works like a full Linux terminal on macOS
 * without requiring the native module that's causing crashes
 */

import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { parseArgs } from 'util';

const execAsync = promisify(require('child_process').exec);

/**
 * Simple Terminal Manager for macOS
 */
class SimpleMacOSTerminal {
  private currentWorkingDirectory: string = process.cwd();
  private environmentVariables: Record<string, string>;
  
  constructor() {
    // Initialize with current environment, filtering out undefined values
    this.environmentVariables = Object.fromEntries(
      Object.entries(process.env).filter(([_, value]) => value !== undefined)
    ) as Record<string, string>;
    
    // Add macOS-specific environment variables
    this.environmentVariables.TERM_PLATFORM = 'macos';
    this.environmentVariables.DISPLAY_SERVER = 'quartz';
    this.environmentVariables.TERM = 'xterm-256color';
  }
  
  /**
   * Execute a command and return the result
   */
  async executeCommand(command: string): Promise<void> {
    try {
      console.log(`🚀 Executing: ${command}`);
      
      // Handle special commands
      if (command.startsWith('cd ')) {
        const newPath = command.substring(3).trim();
        this.changeDirectory(newPath);
        return;
      }
      
      if (command === 'pwd') {
        console.log(this.currentWorkingDirectory);
        return;
      }
      
      if (command.startsWith('open ')) {
        const appName = command.substring(5).trim();
        await this.openApplication(appName);
        return;
      }
      
      // Execute regular command
      const childProcess = spawn('sh', ['-c', command], {
        cwd: this.currentWorkingDirectory,
        env: this.environmentVariables,
        stdio: 'inherit'
      });
      
      return new Promise((resolve, reject) => {
        childProcess.on('exit', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Command failed with exit code ${code}`));
          }
        });
        
        childProcess.on('error', (error) => {
          reject(error);
        });
      });
    } catch (error) {
      console.error(`❌ Command failed:`, error);
      throw error;
    }
  }
  
  /**
   * Change working directory
   */
  private changeDirectory(newPath: string): void {
    try {
      const resolvedPath = path.resolve(this.currentWorkingDirectory, newPath);
      
      if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
        this.currentWorkingDirectory = resolvedPath;
        console.log(`📁 Changed directory to: ${this.currentWorkingDirectory}`);
      } else {
        console.error(`❌ Directory does not exist: ${resolvedPath}`);
      }
    } catch (error) {
      console.error(`❌ Failed to change directory:`, error);
    }
  }
  
  /**
   * Open an application on macOS
   */
  private async openApplication(appName: string): Promise<void> {
    try {
      console.log(`📱 Opening application: ${appName}`);
      
      const { stdout, stderr } = await execAsync(`open -a "${appName}"`, {
        env: this.environmentVariables
      });
      
      if (stderr) {
        // Try alternative methods
        try {
          await execAsync(`open "/Applications/${appName}.app"`);
          console.log(`✅ Successfully opened ${appName}`);
        } catch {
          console.error(`❌ Failed to open application: ${appName}`);
        }
      } else {
        console.log(`✅ Successfully opened ${appName}`);
      }
    } catch (error) {
      console.error(`❌ Failed to open application ${appName}:`, error);
    }
  }
  
  /**
   * Get system information
   */
  async getSystemInfo(): Promise<void> {
    console.log('\n🍎 macOS Terminal System Information');
    console.log('━'.repeat(50));
    
    const commands = {
      'macOS Version': 'sw_vers -productVersion',
      'System Name': 'uname -s',
      'Machine': 'uname -m',
      'Hostname': 'hostname',
      'User': 'whoami',
      'Shell': 'echo $SHELL',
      'Working Directory': 'pwd'
    };
    
    for (const [key, command] of Object.entries(commands)) {
      try {
        if (command === 'pwd') {
          console.log(`   ${key}: ${this.currentWorkingDirectory}`);
        } else {
          const { stdout } = await execAsync(command);
          console.log(`   ${key}: ${stdout.trim()}`);
        }
      } catch (error) {
        console.log(`   ${key}: Unknown`);
      }
    }
    
    console.log('\n💡 Usage Examples:');
    console.log('   • Run commands: bun src/simple_macos_terminal.ts "ls -la"');
    console.log('   • Open apps: bun src/simple_macos_terminal.ts "open Safari"');
    console.log('   • Execute scripts: bun src/simple_macos_terminal.ts "python script.py"');
    console.log('   • System commands: bun src/simple_macos_terminal.ts "top"');
    console.log('   • Change directory: bun src/simple_macos_terminal.ts "cd /Users"');
    console.log('━'.repeat(50));
  }
}

/**
 * Parse command line arguments
 */
function parseCommandLineArgs() {
  const args = parseArgs({
    options: {
      help: {
        type: 'boolean',
        short: 'h'
      },
      version: {
        type: 'boolean',
        short: 'v'
      }
    },
    args: Bun.argv.slice(2),
    allowPositionals: true
  });
  
  return args;
}

/**
 * Main entry point
 */
async function main() {
  const args = parseCommandLineArgs();
  
  if (args.values.help) {
    console.log('🍎 Simple macOS Terminal');
    console.log('Usage: bun src/simple_macos_terminal.ts [command]');
    console.log('\nOptions:');
    console.log('  -h, --help     Show this help message');
    console.log('  -v, --version  Show version information');
    console.log('\nExamples:');
    console.log('  bun src/simple_macos_terminal.ts "ls -la"');
    console.log('  bun src/simple_macos_terminal.ts "open Safari"');
    console.log('  bun src/simple_macos_terminal.ts "cd /Users && pwd"');
    return;
  }
  
  if (args.values.version) {
    console.log('Simple macOS Terminal v1.0.0');
    return;
  }
  
  const terminal = new SimpleMacOSTerminal();
  
  if (args.positionals.length > 0) {
    // Execute the provided command
    const command = args.positionals.join(' ');
    try {
      await terminal.executeCommand(command);
    } catch (error) {
      console.error('Command execution failed:', error);
      process.exit(1);
    }
  } else {
    // Show system information and usage
    await terminal.getSystemInfo();
  }
}

// Run if this file is executed directly
if (import.meta.main) {
  main().catch(console.error);
}

export { SimpleMacOSTerminal };