/**
 * Cross-platform display server detection
 * 
 * This module determines which display server implementation to use
 * based on the current platform and available display servers.
 */

import Bun from "bun";
import { Display_Server_Type } from "./get_display_server_type.ts";

export type DisplayServerPlatform = 'wayland' | 'x11' | 'macos' | 'unknown';

export interface DisplayServerInfo {
  platform: DisplayServerPlatform;
  serverType: string;
  isSupported: boolean;
  requiresXWayland?: boolean;
}

/**
 * Detect the current display server platform
 */
export function getDisplayServerPlatform(): DisplayServerInfo {
  // Check if we're on macOS (using Bun.env for platform detection)
  const platform = typeof Bun !== 'undefined' ? Bun.env.TERM_PROGRAM : undefined;
  if (platform === 'Apple_Terminal' || platform === 'iTerm.app') {
    return {
      platform: 'macos',
      serverType: 'quartz',
      isSupported: true,
      requiresXWayland: false
    };
  }

  // For Linux/Unix systems, use existing display server detection
  const displayServer = new Display_Server_Type();
  const displayServerType = displayServer.type;
  
  switch (displayServerType) {
    case 'wayland':
      return {
        platform: 'wayland',
        serverType: 'wayland',
        isSupported: true,
        requiresXWayland: false
      };
    
    case 'x11':
      return {
        platform: 'x11',
        serverType: 'x11',
        isSupported: true,
        requiresXWayland: true
      };
    
    default:
      return {
        platform: 'unknown',
        serverType: displayServerType,
        isSupported: false,
        requiresXWayland: false
      };
  }
}

/**
 * Check if the current platform supports the terminal application
 */
export function isPlatformSupported(): boolean {
  const info = getDisplayServerPlatform();
  return info.isSupported;
}

/**
 * Get a human-readable description of the current display server
 */
export function getDisplayServerDescription(): string {
  const info = getDisplayServerPlatform();
  
  switch (info.platform) {
    case 'macos':
      return 'macOS Quartz Compositor';
    case 'wayland':
      return 'Wayland Display Server';
    case 'x11':
      return 'X11 Display Server';
    default:
      return `Unknown Display Server (${info.serverType})`;
  }
}