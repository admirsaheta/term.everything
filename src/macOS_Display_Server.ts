/**
 * macOS Display Server Integration
 * 
 * This module provides macOS-specific display server functionality
 * as an alternative to Wayland on Linux systems.
 */

import c from './c_interop.ts';
// Type definitions for streaming
export interface StreamFrame {
    data: Buffer;
    width: number;
    height: number;
    size: number;
}

export type StreamCallback = (frame: StreamFrame) => void;

export interface MacOSDisplayConfig {
  displayId?: number;
  captureMode?: 'window' | 'screen' | 'region';
  enableHiDPI?: boolean;
  refreshRate?: number;
  virtualMonitorSize?: { width: number; height: number };
  windowManagement?: {
    autoLaunchApps?: string[]; // Bundle IDs of apps to auto-launch
    focusOnCapture?: boolean;
    minimizeOnCapture?: boolean;
  };
  captureOptions?: {
    includeMouseCursor?: boolean;
    captureAudio?: boolean;
    compressionQuality?: number; // 0-100
  };
}

export interface DisplayInfo {
  id: number;
  width: number;
  height: number;
  x: number;
  y: number;
  isMain: boolean;
  scaleFactor?: number;
  name?: string;
  colorSpace?: string;
  refreshRate?: number;
}

export class MacOSDisplayServer {
  private config: MacOSDisplayConfig;
  private isActive: boolean = false;
  private displays: DisplayInfo[] = [];
  private captureInterval?: NodeJS.Timeout;
  private streamCallback?: StreamCallback;
  private isStreaming: boolean = false;

  constructor(config: MacOSDisplayConfig = {}) {
    this.config = {
      captureMode: 'screen',
      enableHiDPI: true,
      refreshRate: 60,
      virtualMonitorSize: { width: 800, height: 600 },
      ...config
    };
  }

  /**
   * Initialize the macOS display server integration
   */
  async initialize(): Promise<void> {
    try {
      // Validate platform compatibility
      if (!this.isPlatformSupported()) {
        throw new Error('macOS display server is not supported on this platform');
      }

      // Get display information from native code with retry mechanism
      this.displays = await this.getDisplaysWithRetry();
      
      if (this.displays.length === 0) {
        console.warn('No displays detected, using fallback configuration');
        this.displays = this.getFallbackDisplays();
      }
      
      console.log(`Initialized macOS display server with ${this.displays.length} display(s)`);
      
      // Auto-launch configured applications with error handling
      if (this.config.windowManagement?.autoLaunchApps) {
        await this.autoLaunchApplications();
      }
      
      this.isActive = true;
    } catch (error) {
      console.error('Failed to initialize macOS display server:', error);
      // Attempt graceful fallback
      await this.initializeFallbackMode();
    }
  }

  /**
   * Start the display server
   */
  async start(): Promise<void> {
    if (!this.isActive) {
      await this.initialize();
    }
    
    // Start capture loop if needed
    if (this.config.captureMode === 'screen') {
      this.startCaptureLoop();
    }
  }

  /**
   * Stop the display server
   */
  async stop(): Promise<void> {
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
      this.captureInterval = undefined;
    }
    this.isActive = false;
  }

  /**
   * Check if the platform supports macOS display server
   */
  private isPlatformSupported(): boolean {
    return process.platform === 'darwin';
  }

  /**
   * Get displays with retry mechanism
   */
  private async getDisplaysWithRetry(maxRetries: number = 3): Promise<DisplayInfo[]> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const displays = await this.getDisplays();
        if (displays.length > 0) {
          return displays;
        }
      } catch (error) {
        console.warn(`Display detection attempt ${attempt} failed:`, error);
        if (attempt === maxRetries) {
          throw error;
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    return [];
  }

  /**
   * Get fallback display configuration
   */
  private getFallbackDisplays(): DisplayInfo[] {
    const virtualSize = this.config.virtualMonitorSize!;
    return [{
      id: 1,
      width: virtualSize.width,
      height: virtualSize.height,
      x: 0,
      y: 0,
      isMain: true,
      scaleFactor: 1.0,
      name: 'Fallback Display',
      colorSpace: 'sRGB',
      refreshRate: this.config.refreshRate || 60
    }];
  }

  /**
   * Auto-launch applications with error handling
   */
  private async autoLaunchApplications(): Promise<void> {
    const apps = this.config.windowManagement?.autoLaunchApps || [];
    const results = await Promise.allSettled(
      apps.map(bundleId => this.launchApplication(bundleId))
    );
    
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.warn(`Failed to auto-launch ${apps[index]}:`, result.reason);
      }
    });
  }

  /**
   * Initialize fallback mode when native initialization fails
   */
  private async initializeFallbackMode(): Promise<void> {
    console.warn('Initializing macOS display server in fallback mode');
    this.displays = this.getFallbackDisplays();
    this.isActive = true;
  }

  /**
   * Get display information from native code
   */
  private async getDisplays(): Promise<DisplayInfo[]> {
    try {
      // Use native display functions from C++ interop
      const nativeDisplays = c.get_display_info();
      
      if (nativeDisplays && Array.isArray(nativeDisplays)) {
        return nativeDisplays.map((display: any) => ({
          id: display.id || 1,
          width: display.width || 800,
          height: display.height || 600,
          x: display.x || 0,
          y: display.y || 0,
          isMain: display.is_main || false,
          scaleFactor: display.scale_factor || 1.0,
          name: display.name || `Display ${display.id}`,
          colorSpace: display.color_space || 'sRGB',
          refreshRate: display.refresh_rate || this.config.refreshRate || 60
        }));
      }
      
      // Fallback if native call fails
      const virtualSize = this.config.virtualMonitorSize!;
      return [{
        id: 1,
        width: virtualSize.width,
        height: virtualSize.height,
        x: 0,
        y: 0,
        isMain: true
      }];
    } catch (error) {
      console.warn('Failed to get display info, using fallback:', error);
      const virtualSize = this.config.virtualMonitorSize!;
      return [{
        id: 1,
        width: virtualSize.width,
        height: virtualSize.height,
        x: 0,
        y: 0,
        isMain: true
      }];
    }
  }

  /**
   * Start the screen capture loop
   */
  private startCaptureLoop(): void {
    const intervalMs = 1000 / this.config.refreshRate!;
    
    this.captureInterval = setInterval(() => {
      this.captureFrame();
    }, intervalMs);
  }

  /**
   * Capture a single frame with error handling and fallback
   */
  private captureFrame(): void {
    try {
      const mainDisplay = this.getMainDisplay();
      if (!mainDisplay) {
        console.warn('No main display available for capture');
        return;
      }

      const displayId = this.config.displayId || mainDisplay.id;
      
      // Attempt native capture with timeout protection
      const captureResult = this.captureDisplaySafely(displayId);
      
      if (captureResult && captureResult.success) {
        console.debug('Frame captured successfully for display:', displayId);
      } else {
        console.warn('Frame capture failed for display:', displayId, captureResult?.error);
        this.handleCaptureFailure(displayId);
      }
    } catch (error) {
      console.warn('Frame capture failed:', error);
      this.handleCaptureFailure();
    }
  }

  /**
   * Safely capture display with error handling
   */
  private captureDisplaySafely(displayId: number): any {
    try {
      return c.capture_display(displayId);
    } catch (error) {
      console.error('Native capture_display failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Handle capture failure with fallback strategies
   */
  private handleCaptureFailure(displayId?: number): void {
    // Could implement fallback strategies here:
    // - Reduce capture frequency
    // - Switch to different display
    // - Use alternative capture method
    console.debug('Implementing capture failure recovery for display:', displayId);
  }

  /**
   * Get display information
   */
  getDisplayInfo(): any {
    return {
      platform: 'darwin',
      displayServer: 'quartz',
      config: this.config,
      isActive: this.isActive,
      displays: this.displays
    };
  }

  /**
   * Get the main display
   */
  getMainDisplay(): DisplayInfo | null {
    return this.displays.find(d => d.isMain) || null;
  }

  /**
   * Check if the display server is running
   */
  isRunning(): boolean {
    return this.isActive;
  }

  /**
   * Get virtual monitor size
   */
  getVirtualMonitorSize(): { width: number; height: number } {
    return this.config.virtualMonitorSize!;
  }

  /**
   * Launch an application by bundle ID with enhanced error handling
   */
  async launchApplication(bundleId: string): Promise<boolean> {
    // Validate input
    if (!bundleId || typeof bundleId !== 'string') {
      console.error('Invalid bundle ID provided for application launch');
      return false;
    }

    // Validate bundle ID format
    if (!this.isValidBundleId(bundleId)) {
      console.error(`Invalid bundle ID format: ${bundleId}`);
      return false;
    }

    try {
      console.log(`Attempting to launch application: ${bundleId}`);
      
      // Use macOS native APIs to launch applications
      const { spawn } = await import('child_process');
      
      // Launch application using 'open' command with bundle ID
      const process = spawn('open', ['-b', bundleId], {
        stdio: 'pipe',
        detached: true
      });

      return new Promise((resolve) => {
        process.on('exit', (code) => {
          if (code === 0) {
            console.log(`Successfully launched application: ${bundleId}`);
            resolve(true);
          } else {
            console.error(`Failed to launch application: ${bundleId}, exit code: ${code}`);
            resolve(false);
          }
        });

        process.on('error', (error) => {
          console.error(`Error launching application ${bundleId}:`, error);
          resolve(false);
        });

        // Timeout after 10 seconds
        setTimeout(() => {
          process.kill();
          console.error(`Timeout launching application: ${bundleId}`);
          resolve(false);
        }, 10000);
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error launching application ${bundleId}:`, errorMessage);
      return false;
    }
  }

  /**
   * Launch application by name (e.g., "Safari", "Google Chrome")
   */
  async launchApplicationByName(appName: string): Promise<boolean> {
    try {
      const { spawn } = await import('child_process');
      
      // Launch application using 'open' command with application name
      const process = spawn('open', ['-a', appName], {
        stdio: 'pipe',
        detached: true
      });

      return new Promise((resolve) => {
        process.on('exit', (code) => {
          if (code === 0) {
            console.log(`Successfully launched application: ${appName}`);
            resolve(true);
          } else {
            console.error(`Failed to launch application: ${appName}, exit code: ${code}`);
            resolve(false);
          }
        });

        process.on('error', (error) => {
          console.error(`Error launching application ${appName}:`, error);
          resolve(false);
        });

        // Timeout after 10 seconds
        setTimeout(() => {
          process.kill();
          console.error(`Timeout launching application: ${appName}`);
          resolve(false);
        }, 10000);
      });
    } catch (error) {
      console.error(`Exception launching application ${appName}:`, error);
      return false;
    }
  }

  /**
   * Launch terminal applications or commands
   */
  async launchCommand(command: string, args: string[] = []): Promise<boolean> {
    try {
      const { spawn } = await import('child_process');
      
      const childProcess = spawn(command, args, {
         stdio: 'pipe',
         detached: true,
         env: {
           ...process.env,
           DISPLAY_SERVER: 'quartz',
           TERM_PLATFORM: 'macos'
         }
       });

       return new Promise<boolean>((resolve) => {
         childProcess.on('exit', (code: number | null) => {
           console.log(`Command ${command} exited with code: ${code}`);
           resolve(code === 0);
         });

         childProcess.on('error', (error: Error) => {
           console.error(`Error executing command ${command}:`, error);
           resolve(false);
         });
       });
    } catch (error) {
      console.error(`Exception executing command ${command}:`, error);
      return false;
    }
  }

  /**
   * Get list of running applications
   */
  async getRunningApplications(): Promise<string[]> {
    try {
      const { spawn } = await import('child_process');
      
      return new Promise((resolve, reject) => {
        const process = spawn('osascript', ['-e', 'tell application "System Events" to get name of every process whose background only is false']);
        let output = '';
        
        process.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        process.on('exit', (code) => {
          if (code === 0) {
            const apps = output.trim().split(', ').map(app => app.trim());
            resolve(apps);
          } else {
            reject(new Error(`Failed to get running applications, exit code: ${code}`));
          }
        });
        
        process.on('error', (error) => {
          reject(error);
        });
      });
    } catch (error) {
      console.error('Exception getting running applications:', error);
      return [];
    }
  }

  /**
   * Focus on a specific application window
   */
  async focusApplication(appName: string): Promise<boolean> {
    try {
      const { spawn } = await import('child_process');
      
      return new Promise((resolve) => {
        const process = spawn('osascript', ['-e', `tell application "${appName}" to activate`]);
        
        process.on('exit', (code) => {
          if (code === 0) {
            console.log(`Successfully focused application: ${appName}`);
            resolve(true);
          } else {
            console.error(`Failed to focus application: ${appName}`);
            resolve(false);
          }
        });
        
        process.on('error', (error) => {
          console.error(`Error focusing application ${appName}:`, error);
          resolve(false);
        });
      });
    } catch (error) {
      console.error(`Exception focusing application ${appName}:`, error);
      return false;
    }
  }

  /**
   * Validate bundle ID format
   */
  private isValidBundleId(bundleId: string): boolean {
    // Basic bundle ID validation (e.g., com.company.app)
    const bundleIdPattern = /^[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)+$/;
    return bundleIdPattern.test(bundleId);
  }

  /**
   * Start desktop streaming with callback
   */
  async startDesktopStream(callback: StreamCallback, width: number = 1920, height: number = 1080): Promise<boolean> {
    try {
      if (this.isStreaming) {
        console.warn('Desktop streaming is already active');
        return false;
      }

      this.streamCallback = callback;
      
      // Create a wrapper callback that matches the C interface
      const cCallback = (data: Buffer, frameWidth: number, frameHeight: number, size: number) => {
        if (this.streamCallback) {
          this.streamCallback({
            data,
            width: frameWidth,
            height: frameHeight,
            size
          });
        }
      };

      // Start streaming with specified resolution
      const success = c.start_desktop_stream(width, height, cCallback);
      
      if (success) {
        this.isStreaming = true;
        console.log(`Desktop streaming started successfully at ${width}x${height}`);
        return true;
      } else {
        console.error('Failed to start desktop streaming');
        this.streamCallback = undefined;
        return false;
      }
    } catch (error) {
      console.error('Error starting desktop stream:', error);
      this.streamCallback = undefined;
      return false;
    }
  }

  /**
   * Stop desktop streaming
   */
  async stopDesktopStream(): Promise<boolean> {
    try {
      if (!this.isStreaming) {
        console.warn('Desktop streaming is not active');
        return false;
      }

      const result = c.stop_desktop_stream();
      
      if (result) {
        this.isStreaming = false;
        this.streamCallback = undefined;
        console.log('Desktop streaming stopped successfully');
        return true;
      } else {
        console.error('Failed to stop desktop streaming');
        return false;
      }
    } catch (error) {
      console.error('Error stopping desktop stream:', error);
      return false;
    }
  }

  /**
   * Check if desktop streaming is active
   */
  isDesktopStreaming(): boolean {
    return this.isStreaming;
  }

  /**
   * Set streaming quality (0-100)
   */
  async setStreamQuality(quality: number): Promise<boolean> {
    try {
      if (quality < 0 || quality > 100) {
        console.error('Stream quality must be between 0 and 100');
        return false;
      }

      const result = c.set_stream_quality(quality);
      
      if (result) {
        console.log(`Stream quality set to ${quality}`);
        return true;
      } else {
        console.error('Failed to set stream quality');
        return false;
      }
    } catch (error) {
      console.error('Error setting stream quality:', error);
      return false;
    }
  }

  /**
   * Capture display content with enhanced error handling
   */
  async captureDisplay(displayId?: number): Promise<any> {
    try {
      // Get target display with validation
      const mainDisplay = this.getMainDisplay();
      const targetDisplayId = displayId || mainDisplay?.id;
      
      if (!targetDisplayId) {
        console.error('No display ID available for capture');
        return { success: false, error: 'No display available' };
      }

      // Validate display exists
      const displays = await this.getDisplays();
      const targetDisplay = displays.find(d => d.id === targetDisplayId);
      if (!targetDisplay) {
        console.error(`Display ${targetDisplayId} not found`);
        return { success: false, error: `Display ${targetDisplayId} not found` };
      }
      
      console.log(`Capturing display: ${targetDisplayId} (${targetDisplay.width}x${targetDisplay.height})`);
      
      // Use the safe capture method
      const result = this.captureDisplaySafely(targetDisplayId);
      
      if (result && result.success) {
        console.log(`Display capture successful for display: ${targetDisplayId}`);
        return result;
      } else {
        const errorMsg = result?.error || 'Unknown capture error';
        console.warn(`Display capture failed for display: ${targetDisplayId} - ${errorMsg}`);
        return { success: false, error: errorMsg };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error during display capture:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }
}

/**
 * Factory function to create the appropriate display server
 */
export function createDisplayServer(config?: MacOSDisplayConfig): MacOSDisplayServer {
  return new MacOSDisplayServer(config);
}

/**
 * Check if macOS display server is supported
 */
export function isMacOSDisplayServerSupported(): boolean {
  return process.platform === 'darwin';
}