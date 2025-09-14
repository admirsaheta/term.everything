/**
 * macOS Terminal Manager
 * 
 * Provides comprehensive terminal functionality for macOS, enabling the app to work
 * like a full Linux terminal - running any command and opening any application
 */

import { spawn, ChildProcess, exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  process: ChildProcess;
}

export interface MacOSAppInfo {
  name: string;
  bundleId?: string;
  path?: string;
}

/**
 * Enhanced terminal manager for macOS that provides Linux-like terminal functionality
 */
export class MacOSTerminalManager {
  private runningProcesses: Map<string, ChildProcess> = new Map();
  private environmentVariables: Record<string, string> = {};
  private currentWorkingDirectory: string = process.cwd();
  
  constructor() {
    // Initialize with current environment, filtering out undefined values
    this.environmentVariables = Object.fromEntries(
      Object.entries(process.env).filter(([_, value]) => value !== undefined)
    ) as Record<string, string>;
    
    // Add macOS-specific environment variables
    this.environmentVariables.TERM_PLATFORM = 'macos';
    this.environmentVariables.DISPLAY_SERVER = 'quartz';
  }
  
  /**
   * Initialize the terminal manager
   */
  initialize(): void {
    console.log('🍎 macOS Terminal Manager initialized');
    console.log(`📁 Working directory: ${this.currentWorkingDirectory}`);
    
    // Set up signal handlers for graceful shutdown
    process.on('SIGINT', this.handleShutdown.bind(this));
    process.on('SIGTERM', this.handleShutdown.bind(this));
  }
  
  /**
   * Execute a command in the macOS terminal environment
   */
  executeCommand(command: string, args: string[] = [], options: any = {}): ChildProcess {
    const processId = `${command}_${Date.now()}`;
    
    console.log(`🚀 Executing: ${command} ${args.join(' ')}`);
    
    const childProcess = spawn(command, args, {
      cwd: options.cwd || this.currentWorkingDirectory,
      env: { ...this.environmentVariables, ...options.env },
      stdio: options.stdio || 'inherit',
      shell: true,
      ...options
    });
    
    // Track the process
    this.runningProcesses.set(processId, childProcess);
    
    // Handle process events
    childProcess.on('exit', (code, signal) => {
      console.log(`✅ Process ${command} exited with code ${code}`);
      this.runningProcesses.delete(processId);
    });
    
    childProcess.on('error', (error) => {
      console.error(`❌ Process ${command} error:`, error);
      this.runningProcesses.delete(processId);
    });
    
    return childProcess;
  }
  
  /**
   * Execute a shell command and return the result
   */
  async executeShellCommand(command: string): Promise<CommandResult> {
    try {
      console.log(`🐚 Shell command: ${command}`);
      
      const { stdout, stderr } = await execAsync(command, {
        cwd: this.currentWorkingDirectory,
        env: this.environmentVariables,
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });
      
      return {
        stdout,
        stderr,
        exitCode: 0,
        process: null as any
      };
    } catch (error: any) {
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        exitCode: error.code || 1,
        process: null as any
      };
    }
  }
  
  /**
   * Open an application on macOS
   */
  async openApplication(appName: string): Promise<void> {
    try {
      console.log(`📱 Opening application: ${appName}`);
      
      // Try different methods to open the application
      const openMethods = [
        // Method 1: Direct app name with 'open'
        () => this.executeShellCommand(`open -a "${appName}"`),
        
        // Method 2: Bundle identifier
        () => this.executeShellCommand(`open -b "${appName}"`),
        
        // Method 3: Full path
        () => this.executeShellCommand(`open "${appName}"`),
        
        // Method 4: Search in Applications folder
        () => this.executeShellCommand(`open "/Applications/${appName}.app"`),
        
        // Method 5: Use Spotlight to find and open
        () => this.executeShellCommand(`mdfind "kMDItemDisplayName == '${appName}'" | head -1 | xargs open`)
      ];
      
      for (const method of openMethods) {
        try {
          const result = await method();
          if (result.exitCode === 0) {
            console.log(`✅ Successfully opened ${appName}`);
            return;
          }
        } catch (error) {
          // Continue to next method
          continue;
        }
      }
      
      throw new Error(`Failed to open application: ${appName}`);
    } catch (error) {
      console.error(`❌ Failed to open application ${appName}:`, error);
      throw error;
    }
  }
  
  /**
   * Change working directory
   */
  changeDirectory(newPath: string): boolean {
    try {
      const resolvedPath = path.resolve(this.currentWorkingDirectory, newPath);
      
      if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
        this.currentWorkingDirectory = resolvedPath;
        console.log(`📁 Changed directory to: ${this.currentWorkingDirectory}`);
        return true;
      } else {
        console.error(`❌ Directory does not exist: ${resolvedPath}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Failed to change directory:`, error);
      return false;
    }
  }
  
  /**
   * Set environment variable
   */
  setEnvironmentVariable(key: string, value: string): void {
    this.environmentVariables[key] = value;
    console.log(`🔧 Set environment variable: ${key}=${value}`);
  }
  
  /**
   * Get environment variable
   */
  getEnvironmentVariable(key: string): string | undefined {
    return this.environmentVariables[key];
  }
  
  /**
   * List running processes
   */
  getRunningProcesses(): string[] {
    return Array.from(this.runningProcesses.keys());
  }
  
  /**
   * Kill a running process
   */
  killProcess(processId: string): boolean {
    const process = this.runningProcesses.get(processId);
    if (process) {
      process.kill('SIGTERM');
      this.runningProcesses.delete(processId);
      console.log(`🔪 Killed process: ${processId}`);
      return true;
    }
    return false;
  }
  
  /**
   * Get current working directory
   */
  getCurrentDirectory(): string {
    return this.currentWorkingDirectory;
  }
  
  /**
   * Execute common macOS commands with enhanced functionality
   */
  async executeCommonCommand(command: string, args: string[]): Promise<CommandResult> {
    const fullCommand = `${command} ${args.join(' ')}`;
    
    // Handle special commands
    switch (command) {
      case 'cd':
        if (args.length > 0) {
          const success = this.changeDirectory(args[0]);
          return {
            stdout: success ? '' : `cd: ${args[0]}: No such file or directory`,
            stderr: success ? '' : `cd: ${args[0]}: No such file or directory`,
            exitCode: success ? 0 : 1,
            process: null as any
          };
        }
        break;
        
      case 'pwd':
        return {
          stdout: this.currentWorkingDirectory + '\n',
          stderr: '',
          exitCode: 0,
          process: null as any
        };
        
      case 'open':
        if (args.length > 0) {
          try {
            await this.openApplication(args.join(' '));
            return {
              stdout: '',
              stderr: '',
              exitCode: 0,
              process: null as any
            };
          } catch (error: any) {
            return {
              stdout: '',
              stderr: error.message,
              exitCode: 1,
              process: null as any
            };
          }
        }
        break;
    }
    
    // Execute as regular shell command
    return this.executeShellCommand(fullCommand);
  }
  
  /**
   * Handle graceful shutdown
   */
  private handleShutdown(): void {
    console.log('🛑 Shutting down macOS Terminal Manager...');
    
    // Kill all running processes
    for (const [processId, process] of this.runningProcesses) {
      console.log(`🔪 Terminating process: ${processId}`);
      process.kill('SIGTERM');
    }
    
    this.runningProcesses.clear();
  }
  
  /**
   * Get system information
   */
  async getSystemInfo(): Promise<Record<string, string>> {
    const commands = {
      'macOS Version': 'sw_vers -productVersion',
      'System Name': 'uname -s',
      'Machine': 'uname -m',
      'Hostname': 'hostname',
      'User': 'whoami',
      'Shell': 'echo $SHELL',
      'Terminal': 'echo $TERM'
    };
    
    const info: Record<string, string> = {};
    
    for (const [key, command] of Object.entries(commands)) {
      try {
        const result = await this.executeShellCommand(command);
        info[key] = result.stdout.trim();
      } catch (error) {
        info[key] = 'Unknown';
      }
    }
    
    return info;
  }
}