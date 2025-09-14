#!/usr/bin/env tsx

/**
 * Test script for macOS desktop streaming functionality
 * 
 * This script demonstrates how to use the new streaming capabilities
 * of the macOS Display Server integration.
 */

import { MacOSDisplayServer, StreamFrame } from './src/macOS_Display_Server.ts';

async function testDesktopStreaming() {
  console.log('🚀 Testing macOS Desktop Streaming...');
  
  // Create display server instance
  const displayServer = new MacOSDisplayServer({
    captureMode: 'screen',
    enableHiDPI: true,
    refreshRate: 30,
    captureOptions: {
      includeMouseCursor: true,
      compressionQuality: 75
    }
  });

  try {
    // Initialize the display server
    console.log('📱 Initializing display server...');
    await displayServer.initialize();
    
    // Start the display server
    console.log('▶️  Starting display server...');
    await displayServer.start();
    
    // Set up streaming callback
    const streamCallback = (frame: StreamFrame) => {
      console.log(`📺 Received frame: ${frame.width}x${frame.height}, size: ${frame.size} bytes`);
      
      // Here you could process the frame data
      // For example, save to file, send over network, etc.
      
      // Log first few bytes for debugging
      const preview = Array.from(frame.data.slice(0, 8))
        .map((b: number) => b.toString(16).padStart(2, '0'))
        .join(' ');
      console.log(`   Data preview: ${preview}...`);
    };
    
    // Start desktop streaming
     console.log('🎥 Starting desktop streaming...');
     const streamStarted = await displayServer.startDesktopStream(streamCallback, 1920, 1080);
    
    if (streamStarted) {
      console.log('✅ Desktop streaming started successfully!');
      
      // Check streaming status
      console.log(`📊 Streaming active: ${displayServer.isDesktopStreaming()}`);
      
      // Let it stream for 5 seconds
      console.log('⏱️  Streaming for 5 seconds...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Test quality adjustment
      console.log('🔧 Adjusting stream quality to 50...');
      await displayServer.setStreamQuality(50);
      
      // Stream for another 3 seconds
      console.log('⏱️  Streaming for 3 more seconds...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Stop streaming
      console.log('⏹️  Stopping desktop streaming...');
      const streamStopped = await displayServer.stopDesktopStream();
      
      if (streamStopped) {
        console.log('✅ Desktop streaming stopped successfully!');
      } else {
        console.error('❌ Failed to stop desktop streaming');
      }
      
      // Check streaming status again
      console.log(`📊 Streaming active: ${displayServer.isDesktopStreaming()}`);
      
    } else {
      console.error('❌ Failed to start desktop streaming');
    }
    
    // Stop the display server
    console.log('🛑 Stopping display server...');
    await displayServer.stop();
    
    console.log('🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('💥 Test failed:', error);
    
    // Cleanup
    try {
      await displayServer.stopDesktopStream();
      await displayServer.stop();
    } catch (cleanupError) {
      console.error('🧹 Cleanup failed:', cleanupError);
    }
  }
}

// Additional test functions
async function testDisplayInfo() {
  console.log('\n📋 Testing display information...');
  
  const displayServer = new MacOSDisplayServer();
  
  try {
    await displayServer.initialize();
    
    const displays = displayServer.getDisplayInfo();
    console.log('🖥️  Available displays:', displays);
    
    const mainDisplay = displayServer.getMainDisplay();
    console.log('🎯 Main display:', mainDisplay);
    
    const virtualSize = displayServer.getVirtualMonitorSize();
    console.log('📐 Virtual monitor size:', virtualSize);
    
  } catch (error) {
    console.error('❌ Display info test failed:', error);
  }
}

async function testApplicationLaunching() {
  console.log('\n🚀 Testing application launching...');
  
  const displayServer = new MacOSDisplayServer({
    windowManagement: {
      autoLaunchApps: ['com.apple.TextEdit'],
      focusOnCapture: true
    }
  });
  
  try {
    await displayServer.initialize();
    
    // Test launching TextEdit
    console.log('📝 Launching TextEdit...');
    const launched = await displayServer.launchApplication('com.apple.TextEdit');
    
    if (launched) {
      console.log('✅ TextEdit launched successfully!');
      
      // Wait a bit then focus it
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('🎯 Focusing TextEdit...');
      await displayServer.focusApplication('TextEdit');
      
    } else {
      console.error('❌ Failed to launch TextEdit');
    }
    
  } catch (error) {
    console.error('❌ Application launching test failed:', error);
  }
}

// Run all tests
async function runAllTests() {
  console.log('🧪 Running macOS Display Server Tests\n');
  
  await testDisplayInfo();
  await testApplicationLaunching();
  await testDesktopStreaming();
  
  console.log('\n🏁 All tests completed!');
}

// Execute if run directly
if (import.meta.main) {
  runAllTests().catch(console.error);
}

export {
  testDesktopStreaming,
  testDisplayInfo,
  testApplicationLaunching,
  runAllTests
};