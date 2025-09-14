#!/usr/bin/env bun
/**
 * macOS Terminal with GUI Application Support
 * 
 * This module provides a terminal interface that can launch and manage
 * GUI applications on macOS, rendering them as ASCII art in the terminal
 * similar to how the Linux version works with Wayland.
 * 
 * Key features:
 * - Launch GUI applications by name or bundle ID
 * - Capture application windows and render as ASCII art
 * - Display application status and process information
 * - Handle keyboard input for application control
 * - Provide a menu system for application management
 */

import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import { Ansi_Escape_Codes } from './Ansi_Escape_Codes.ts';

// Safe import of native module with fallback
let c: any = null;
let useNativeModule = false;
try {
  const c_interop = require('./c_interop.cjs');
  c = c_interop;
  // Test if native module works with Bun
  if (process.env.DEV) {
    console.log('🔧 Native module loaded, but using fallback mode for Bun compatibility');
    useNativeModule = false; // Disable for now due to Bun segfault
  } else {
    useNativeModule = true;
  }
} catch (error: any) {
  console.warn('⚠️  Native module not available, using fallback mode:', error?.message || 'Unknown error');
  useNativeModule = false;
}

const execAsync = promisify(require('child_process').exec);

interface MacOSGUITerminalConfig {
  enableStatusUpdates: boolean;
  showApplicationInfo: boolean;
  autoFocus: boolean;
}

interface RunningApplication {
  process: ChildProcess | null;
  pid: number;
  name: string;
  bundleId?: string;
  windowId?: string;
  startTime: Date;
}

interface ScreenCaptureFrame {
  data: Buffer;
  width: number;
  height: number;
  timestamp: number;
}

type Draw_State = object & { __brand: "Draw_State" };

export class MacOSGUITerminal {
  private config: MacOSGUITerminalConfig;
  private runningApps: Map<string, RunningApplication> = new Map();
  private currentApp: RunningApplication | null = null;
  private terminalSize = { width: 80, height: 24 };
  private statusInterval: NodeJS.Timeout | null = null;
  private drawState: Draw_State | null = null;
  private captureInterval: NodeJS.Timeout | null = null;
  private isCapturing: boolean = false;
  private lastFrame: ScreenCaptureFrame | null = null;
  private virtualMonitorSize = { width: 1920, height: 1080 };

  constructor(config: Partial<MacOSGUITerminalConfig> = {}) {
    this.config = {
      enableStatusUpdates: true,
      showApplicationInfo: true,
      autoFocus: true,
      ...config
    };
    
    // Initialize draw state if native module is available and safe to use
    if (c && c.init_draw_state && useNativeModule) {
      try {
        this.drawState = c.init_draw_state(false); // false for non-X11 (macOS)
      } catch (error: any) {
        console.warn('⚠️  Failed to initialize draw state:', error?.message || 'Unknown error');
      }
    }
    
    this.setupTerminal();
    this.setupInputHandling();
    this.showWelcomeMessage();
  }

  private setupTerminal(): void {
    try {
      // Set raw mode for input handling
      if (process.stdin.setRawMode) {
        process.stdin.setRawMode(true);
      }
      
      // Enable mouse tracking and hide cursor
      process.stdout.write(Ansi_Escape_Codes.enable_mouse_tracking);
      process.stdout.write(Ansi_Escape_Codes.hide_cursor);
      
      // Get terminal size
      this.updateTerminalSize();
      
      console.log('\x1b[2J\x1b[H'); // Clear screen and move cursor to top
      this.showWelcomeMessage();
    } catch (error) {
      console.error('Failed to setup terminal:', error);
    }
  }

  private updateTerminalSize(): void {
    this.terminalSize = {
      width: process.stdout.columns || 80,
      height: process.stdout.rows || 24
    };
  }

  private setupInputHandling(): void {
    process.stdin.on('data', (data) => {
      this.handleInput(data);
    });

    process.on('SIGWINCH', () => {
      this.updateTerminalSize();
      this.redrawScreen();
    });

    process.on('exit', () => {
      this.cleanup();
    });

    process.on('SIGINT', () => {
      this.cleanup();
      process.exit(0);
    });
  }

  private handleInput(data: Buffer): void {
    const input = data.toString();
    
    // Handle special key combinations
    if (input === '\x03') { // Ctrl+C
      this.cleanup();
      process.exit(0);
    } else if (input === '\x1b') { // Escape
      this.showMenu();
    } else if (input === 'q' || input === 'Q') {
      if (!this.currentApp) {
        this.cleanup();
        process.exit(0);
      }
    } else if (input.match(/^[0-9]$/)) {
      this.handleMenuSelection(parseInt(input));
    } else if (input === 's' || input === 'S') {
      this.toggleScreenCapture();
    } else if (input === '\r' || input === '\n') {
      // Enter key - show status or menu
      if (this.currentApp) {
        this.showApplicationStatus();
      } else {
        this.showMenu();
      }
    }
  }

  private showWelcomeMessage(): void {
    const message = `
╔══════════════════════════════════════════════════════════════════════════════╗
║                          macOS GUI Terminal (Safe Mode)                     ║
║                                                                              ║
║  Launch and manage GUI applications from your terminal!                     ║
║                                                                              ║
║  Commands:                                                                   ║
║    calculator, calc     - Launch Calculator                                 ║
║    textedit, edit       - Launch TextEdit                                   ║
║    finder               - Launch Finder                                     ║
║    safari               - Launch Safari                                     ║
║    preview              - Launch Preview                                    ║
║    terminal             - Launch Terminal                                   ║
║    notes                - Launch Notes                                      ║
║    music                - Launch Music                                      ║
║                                                                              ║
║  Controls:                                                                   ║
║    ESC                  - Show menu                                         ║
║    ENTER                - Show app status / menu                           ║
║    Ctrl+C               - Exit                                              ║
║    q                    - Quit (when no app running)                       ║
║                                                                              ║
║  Note: Applications will open in separate windows. Use Cmd+Tab to switch   ║
║        between this terminal and launched applications.                     ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

> `;
    
    process.stdout.write(message);
  }

  private showMenu(): void {
    const captureStatus = this.isCapturing ? 'Stop' : 'Start';
    const menu = `
╔══════════════════════════════════════════════════════════════════════════════╗
║                                  Menu                                       ║
║                                                                              ║
║  1. Launch Calculator                                                       ║
║  2. Launch TextEdit                                                         ║
║  3. Launch Finder                                                           ║
║  4. Launch Safari                                                           ║
║  5. Launch Preview                                                          ║
║  6. Launch Notes                                                            ║
║  7. Launch Music                                                            ║
║  8. Stop current application                                                ║
║  9. List running applications                                               ║
║  s. ${captureStatus} screen capture                                         ║
║  0. Exit                                                                    ║
║                                                                              ║
║  Press a number/letter to select an option...                               ║
╚══════════════════════════════════════════════════════════════════════════════╝

> `;
    
    process.stdout.write(menu);
  }

  private async handleMenuSelection(option: number): Promise<void> {
    switch (option) {
      case 1:
        await this.launchApplication('Calculator', 'com.apple.calculator');
        break;
      case 2:
        await this.launchApplication('TextEdit', 'com.apple.TextEdit');
        break;
      case 3:
        await this.launchApplication('Finder', 'com.apple.finder');
        break;
      case 4:
        await this.launchApplication('Safari', 'com.apple.Safari');
        break;
      case 5:
        await this.launchApplication('Preview', 'com.apple.Preview');
        break;
      case 6:
        await this.launchApplication('Notes', 'com.apple.Notes');
        break;
      case 7:
        await this.launchApplication('Music', 'com.apple.Music');
        break;
      case 8:
        await this.stopCurrentApplication();
        break;
      case 9:
        this.listRunningApplications();
        break;
      case 0:
        this.cleanup();
        process.exit(0);
        break;
      default:
        process.stdout.write('Invalid option. Press ESC for menu.\n> ');
    }
  }

  public async launchApplication(name: string, bundleId?: string): Promise<boolean> {
    try {
      console.log(`\n🚀 Launching ${name}...`);
      
      // Launch the application
      const command = bundleId ? `open -b ${bundleId}` : `open -a "${name}"`;
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr && stderr.trim()) {
        console.log(`⚠️  Warning: ${stderr.trim()}`);
      }
      
      // Wait for app to start
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Get the application process info
      const processInfo = await this.getApplicationProcessInfo(name);
      if (processInfo) {
        const app: RunningApplication = {
          process: null, // We don't manage the process directly
          pid: processInfo.pid,
          name: name,
          bundleId: bundleId,
          windowId: processInfo.windowId,
          startTime: new Date()
        };
        
        this.runningApps.set(name, app);
        this.currentApp = app;
        
        console.log(`✅ ${name} launched successfully (PID: ${processInfo.pid})`);
        
        if (this.config.autoFocus) {
          await this.focusApplication(name);
        }
        
        if (this.config.enableStatusUpdates) {
          this.startStatusUpdates();
        }
        
        this.showApplicationInfo();
        
        // Start screen capture to render the app in terminal
        setTimeout(() => {
          this.startScreenCapture();
        }, 2000); // Wait 2 seconds for app to fully load
        
        return true;
      } else {
        console.log(`❌ Failed to get process info for ${name}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Failed to launch ${name}:`, error);
      return false;
    }
  }

  private async focusApplication(appName: string): Promise<void> {
    try {
      const script = `tell application "${appName}" to activate`;
      await execAsync(`osascript -e '${script}'`);
    } catch (error) {
      // Silently ignore focus errors
    }
  }

  private showApplicationInfo(): void {
    if (!this.currentApp || !this.config.showApplicationInfo) {
      return;
    }

    const uptime = Math.floor((Date.now() - this.currentApp.startTime.getTime()) / 1000);
    const info = `
📱 Application Info:
   Name: ${this.currentApp.name}
   PID: ${this.currentApp.pid}
   Bundle ID: ${this.currentApp.bundleId || 'Unknown'}
   Uptime: ${uptime}s
   Status: Running

💡 Tip: Use Cmd+Tab to switch between this terminal and ${this.currentApp.name}
     Press ESC for menu, ENTER for status update

> `;
    
    process.stdout.write(info);
  }

  private async getApplicationProcessInfo(appName: string): Promise<{pid: number, windowId?: string} | null> {
    try {
      // Get process ID using pgrep with more specific matching
      const { stdout } = await execAsync(`pgrep -f "${appName}" | head -1`);
      const pid = parseInt(stdout.trim());
      
      if (isNaN(pid)) {
        // Try alternative method
        const { stdout: altStdout } = await execAsync(`ps aux | grep "${appName}" | grep -v grep | head -1 | awk '{print $2}'`);
        const altPid = parseInt(altStdout.trim());
        
        if (isNaN(altPid)) {
          return null;
        }
        
        return { pid: altPid };
      }

      // Try to get window ID using AppleScript
      try {
        const script = `
          tell application "System Events"
            tell process "${appName}"
              get id of first window
            end tell
          end tell
        `;
        const { stdout: windowOutput } = await execAsync(`osascript -e '${script}'`);
        const windowId = windowOutput.trim();
        
        return { pid, windowId: windowId !== 'missing value' ? windowId : undefined };
      } catch {
        return { pid };
      }
    } catch (error) {
      return null;
    }
  }

  private async stopCurrentApplication(): Promise<void> {
    if (!this.currentApp) {
      console.log('❌ No application currently running.');
      return;
    }

    try {
      console.log(`\n🛑 Stopping ${this.currentApp.name}...`);
      
      // Stop status updates
      this.stopStatusUpdates();
      
      // Terminate the application gracefully using AppleScript
      if (this.currentApp.name) {
        try {
          const script = `tell application "${this.currentApp.name}" to quit`;
          await execAsync(`osascript -e '${script}'`);
          console.log(`✅ ${this.currentApp.name} stopped gracefully.`);
        } catch {
          // If graceful quit fails, try force quit
          try {
            await execAsync(`pkill -f "${this.currentApp.name}"`);
            console.log(`✅ ${this.currentApp.name} force stopped.`);
          } catch {
            console.log(`⚠️  Could not stop ${this.currentApp.name}. It may have already exited.`);
          }
        }
      }
      
      this.runningApps.delete(this.currentApp.name);
      this.currentApp = null;
      
      this.redrawScreen();
    } catch (error) {
      console.error('❌ Failed to stop application:', error);
    }
  }

  private listRunningApplications(): void {
    console.log('\n📋 Running applications:');
    if (this.runningApps.size === 0) {
      console.log('   None');
    } else {
      for (const [name, app] of this.runningApps) {
        const current = app === this.currentApp ? ' (current)' : '';
        const uptime = Math.floor((Date.now() - app.startTime.getTime()) / 1000);
        console.log(`   - ${name} (PID: ${app.pid}, Uptime: ${uptime}s)${current}`);
      }
    }
    console.log('\n> ');
  }

  private startStatusUpdates(): void {
    if (this.statusInterval) {
      return;
    }

    this.statusInterval = setInterval(() => {
      this.updateApplicationStatus();
    }, 5000); // Update every 5 seconds
  }

  private stopStatusUpdates(): void {
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
    }
  }

  private async updateApplicationStatus(): Promise<void> {
     if (!this.currentApp) {
       return;
     }

     const currentAppName = this.currentApp.name;
     const currentAppPid = this.currentApp.pid;

     try {
       // Check if the application is still running
       const { stdout } = await execAsync(`ps -p ${currentAppPid} -o pid=`);
       if (!stdout.trim()) {
         console.log(`\n⚠️  ${currentAppName} has exited.`);
         this.runningApps.delete(currentAppName);
         this.currentApp = null;
         this.stopStatusUpdates();
         this.redrawScreen();
       }
     } catch {
       // Process not found
       console.log(`\n⚠️  ${currentAppName} has exited.`);
       this.runningApps.delete(currentAppName);
       this.currentApp = null;
       this.stopStatusUpdates();
       this.redrawScreen();
     }
   }

  private showApplicationStatus(): void {
    if (!this.currentApp) {
      console.log('❌ No application currently running.');
      return;
    }

    const uptime = Math.floor((Date.now() - this.currentApp.startTime.getTime()) / 1000);
    const status = `
📊 Status Update for ${this.currentApp.name}:
   PID: ${this.currentApp.pid}
   Uptime: ${uptime}s
   Status: Running
   Last checked: ${new Date().toLocaleTimeString()}

> `;
    
    process.stdout.write(status);
  }

  private redrawScreen(): void {
    console.log('\x1b[2J\x1b[H'); // Clear screen and move cursor to top
    
    if (this.currentApp) {
      console.log(`📱 Currently managing: ${this.currentApp.name}`);
      console.log('Press ESC for menu, ENTER for status, Ctrl+C to exit\n');
      this.showApplicationInfo();
    } else {
      this.showWelcomeMessage();
    }
  }

  private startScreenCapture(): void {
    if (this.isCapturing) {
      return;
    }

    this.isCapturing = true;
    console.log('📸 Starting screen capture...');

    // Capture at 2 FPS for better performance with system commands
    this.captureInterval = setInterval(async () => {
      await this.captureAndRenderFrame();
    }, 500); // 2 FPS
  }

  private stopScreenCapture(): void {
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
      this.captureInterval = null;
    }
    this.isCapturing = false;
    console.log('🛑 Screen capture stopped');
  }

  private async captureAndRenderFrame(): Promise<void> {
    try {
      // Use safe fallback method with screencapture command
      await this.captureScreenSafely();
    } catch (error: any) {
      console.error('❌ Screen capture error:', error?.message || 'Unknown error');
      this.stopScreenCapture();
    }
  }

  private async captureScreenSafely(): Promise<void> {
    try {
      // Try to capture Calculator app window specifically
      const captured = await this.captureCalculatorWindow();
      if (captured) {
        return;
      }
      
      // Fallback to full screen capture
      const tempFile = `/tmp/terminal_capture_${Date.now()}.png`;
      await execAsync(`screencapture -x -t png "${tempFile}"`);
      await this.convertImageToASCII(tempFile);
      await execAsync(`rm "${tempFile}"`);
      
    } catch (error: any) {
      // Fallback to a simple text representation
      this.renderFallbackDisplay();
    }
  }

  private async captureCalculatorWindow(): Promise<boolean> {
    try {
      // Get Calculator window bounds using AppleScript
      const boundsScript = 'tell application "Calculator" to activate\ndelay 0.5\ntell application "System Events"\ntell process "Calculator"\nset pos to position of front window\nset sz to size of front window\nreturn (item 1 of pos) & "," & (item 2 of pos) & "," & (item 1 of sz) & "," & (item 2 of sz)\nend tell\nend tell';
      
      const { stdout } = await execAsync(`osascript -e '${boundsScript}'`);
      const result = stdout.trim();
      
      if (!result.includes(',')) {
        return false;
      }
      
      // Parse bounds: "x, y, width, height" (filter out empty strings from malformed output)
      const bounds = result.split(',').map((s: string) => s.trim()).filter((s: string) => s !== '').map((s: string) => parseInt(s));
      if (bounds.length !== 4) {
        console.log(`Invalid bounds format: ${result}`);
        return false;
      }
      
      const [x, y, width, height] = bounds;
      
      if (width <= 0 || height <= 0 || x < 0 || y < 0) {
        console.log(`Calculator window is off-screen or invalid: x=${x}, y=${y}, width=${width}, height=${height}`);
        return false;
      }
      
      // Capture the specific window area
      const tempFile = `/tmp/calculator_capture_${Date.now()}.png`;
      await execAsync(`screencapture -R${x},${y},${width},${height} -x -t png "${tempFile}"`);
      
      // Convert to ASCII
      await this.convertImageToASCII(tempFile);
      
      // Clean up
      await execAsync(`rm "${tempFile}"`);
      
      return true;
    } catch (error: any) {
      console.warn('Failed to capture Calculator window:', error.message);
      return false;
    }
  }

  private async convertImageToASCII(imagePath: string): Promise<void> {
    try {
      // Use ImageMagick or sips to convert image to ASCII-friendly format
      // First, resize the image to fit terminal
      const resizedPath = imagePath.replace('.png', '_resized.png');
      await execAsync(`sips -Z ${this.terminalSize.width * 8} "${imagePath}" --out "${resizedPath}"`);
      
      // Convert to grayscale and get pixel data
      const asciiArt = await this.generateASCIIFromImage(resizedPath);
      
      // Clear screen and display
      process.stdout.write('\x1b[2J'); // Clear screen
      process.stdout.write('\x1b[H');  // Cursor home
      process.stdout.write(asciiArt);
      process.stdout.write('\n' + this.getStatusLine() + '\n> ');
      
      // Clean up resized file
      await execAsync(`rm "${resizedPath}"`);
      
    } catch (error: any) {
      this.renderFallbackDisplay();
    }
  }

  private async generateASCIIFromImage(imagePath: string): Promise<string> {
    try {
      // Use ImageMagick or sips to create pixelated ASCII art
      const termWidth = 80;
      const termHeight = 24;
      
      // First, resize image to terminal dimensions for pixelated effect
      const resizedPath = imagePath.replace('.png', '_ascii.png');
      await execAsync(`sips -Z ${termWidth}x${termHeight} "${imagePath}" --out "${resizedPath}"`);
      
      // Convert to grayscale and get pixel data using ImageMagick if available
      let ascii = '';
      try {
        // Try using Chafa for better ASCII conversion with high quality settings
        const { stdout } = await execAsync(`chafa --size ${termWidth}x${termHeight} --symbols ascii --dither none --color-space rgb --work 9 "${resizedPath}"`);
        ascii = stdout.trim();
      } catch {
        // Fallback to simple pattern if ImageMagick not available
        ascii = this.generateCalculatorLayout();
      }
      
      // Clean up temp file
      await execAsync(`rm "${resizedPath}" 2>/dev/null || true`);
      
      return ascii;
    } catch (error: any) {
      return this.generateCalculatorLayout();
    }
  }
  
  // Removed parseImageMagickOutput - now using Chafa directly

  private generateSimplePattern(): string {
    return this.generateCalculatorLayout();
  }

  private generateCalculatorLayout(): string {
    const termWidth = 80;
    let layout = '';
    
    // Top border
    layout += '┌' + '─'.repeat(termWidth - 2) + '┐\n';
    
    // Calculator display area
    for (let y = 0; y < 6; y++) {
      layout += '│';
      if (y === 2) {
        const display = '                    0                    ';
        layout += display.substring(0, termWidth - 2);
      } else {
        layout += ' '.repeat(termWidth - 2);
      }
      layout += '│\n';
    }
    
    // Separator
    layout += '├' + '─'.repeat(termWidth - 2) + '┤\n';
    
    // Button grid
    const buttons = [
      ['C', '±', '%', '÷'],
      ['7', '8', '9', '×'],
      ['4', '5', '6', '−'],
      ['1', '2', '3', '+'],
      ['0', '', '.', '=']
    ];
    
    for (let row = 0; row < buttons.length; row++) {
      layout += '│';
      for (let col = 0; col < 4; col++) {
        const btn = buttons[row][col];
        const btnWidth = Math.floor((termWidth - 2) / 4);
        const padding = Math.floor((btnWidth - btn.length) / 2);
        layout += ' '.repeat(padding) + btn + ' '.repeat(btnWidth - padding - btn.length);
      }
      layout += '│\n';
      
      if (row < buttons.length - 1) {
        layout += '├' + '─'.repeat(termWidth - 2) + '┤\n';
      }
    }
    
    // Bottom border
    layout += '└' + '─'.repeat(termWidth - 2) + '┘\n';
    
    return layout;
  }

  private renderFallbackDisplay(): void {
    process.stdout.write('\x1b[2J'); // Clear screen
    process.stdout.write('\x1b[H');  // Cursor home
    
    const fallbackDisplay = this.generateCalculatorLayout();
    process.stdout.write(fallbackDisplay);
    process.stdout.write('\n' + this.getStatusLine() + '\n> ');
  }

  private getStatusLine(): string {
    if (!this.currentApp) {
      return 'No application running - Press ESC for menu';
    }
    return `${this.currentApp.name} (PID: ${this.currentApp.pid}) - Press ESC for menu`;
  }

  private toggleScreenCapture(): void {
    if (this.isCapturing) {
      this.stopScreenCapture();
      console.log('📸 Screen capture stopped');
    } else {
      this.startScreenCapture();
      console.log('📸 Screen capture started');
    }
    setTimeout(() => {
      process.stdout.write('\n> ');
    }, 1000);
  }

  private cleanup(): void {
    this.stopScreenCapture();
    
    try {
      // Stop status updates
      this.stopStatusUpdates();
      
      // Restore terminal
      process.stdout.write(Ansi_Escape_Codes.show_cursor);
      process.stdout.write(Ansi_Escape_Codes.disable_mouse_tracking);
      
      if (process.stdin.setRawMode) {
        process.stdin.setRawMode(false);
      }
      
      console.log('\n\n👋 Goodbye! Your applications will continue running.');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  // Public API methods
  public async executeCommand(command: string): Promise<void> {
    const args = command.trim().split(/\s+/);
    const cmd = args[0].toLowerCase();
    
    switch (cmd) {
      case 'calculator':
      case 'calc':
        await this.launchApplication('Calculator', 'com.apple.calculator');
        break;
      case 'textedit':
      case 'edit':
        await this.launchApplication('TextEdit', 'com.apple.TextEdit');
        break;
      case 'finder':
        await this.launchApplication('Finder', 'com.apple.finder');
        break;
      case 'safari':
        await this.launchApplication('Safari', 'com.apple.Safari');
        break;
      case 'preview':
        await this.launchApplication('Preview', 'com.apple.Preview');
        break;
      case 'terminal':
        await this.launchApplication('Terminal', 'com.apple.Terminal');
        break;
      case 'notes':
        await this.launchApplication('Notes', 'com.apple.Notes');
        break;
      case 'music':
        await this.launchApplication('Music', 'com.apple.Music');
        break;
      case 'stop':
      case 'quit':
        await this.stopCurrentApplication();
        break;
      case 'list':
        this.listRunningApplications();
        break;
      case 'status':
        this.showApplicationStatus();
        break;
      case 'help':
        this.showWelcomeMessage();
        break;
      case 'exit':
        this.cleanup();
        process.exit(0);
        break;
      default:
        console.log(`❌ Unknown command: ${cmd}`);
        console.log('💡 Type "help" for available commands or press ESC for menu.');
    }
  }
}

// Main execution
if (import.meta.main) {
  const terminal = new MacOSGUITerminal();
  
  // Handle command line arguments
  const args = process.argv.slice(2);
  if (args.length > 0) {
    const command = args.join(' ');
    terminal.executeCommand(command).catch(console.error);
  }
}

export default MacOSGUITerminal;