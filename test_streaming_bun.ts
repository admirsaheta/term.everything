#!/usr/bin/env bun

/**
 * Bun-compatible test for macOS desktop streaming
 * 
 * This test uses a Node.js subprocess wrapper to avoid Bun's native module compatibility issues.
 */

import BunStreamingWrapper from './src/bun_streaming_wrapper.ts';
import type { StreamFrame } from './src/macOS_Display_Server.ts';

// Test configuration
const TEST_CONFIG = {
  width: 1920,
  height: 1080,
  quality: 75,
  duration: 5000 // 5 seconds
};

async function testBunStreaming() {
  console.log('🚀 Testing Bun-compatible macOS Desktop Streaming...');
  console.log('📱 Initializing streaming wrapper...');
  
  const streamer = new BunStreamingWrapper({
    width: TEST_CONFIG.width,
    height: TEST_CONFIG.height,
    quality: TEST_CONFIG.quality
  });
  
  let frameCount = 0;
  let totalDataSize = 0;
  const startTime = Date.now();
  
  // Stream callback to handle incoming frames
  const streamCallback = (frame: StreamFrame) => {
    frameCount++;
    totalDataSize += frame.size;
    
    if (frameCount % 10 === 0) {
      const elapsed = Date.now() - startTime;
      const fps = (frameCount / elapsed) * 1000;
      const mbps = (totalDataSize / elapsed) * 8 / 1000; // Mbps
      
      console.log(`📊 Frame ${frameCount}: ${frame.width}x${frame.height}, ${frame.size} bytes`);
      console.log(`📈 Performance: ${fps.toFixed(1)} FPS, ${mbps.toFixed(2)} Mbps`);
    }
  };
  
  // Event handlers
  streamer.on('started', () => {
    console.log('✅ Streaming started successfully!');
  });
  
  streamer.on('stopped', () => {
    console.log('🛑 Streaming stopped');
  });
  
  try {
    console.log('▶️  Starting desktop streaming...');
    const success = await streamer.startDesktopStream(streamCallback);
    
    if (!success) {
      console.error('❌ Failed to start desktop streaming');
      return;
    }
    
    console.log(`⏱️  Streaming for ${TEST_CONFIG.duration / 1000} seconds...`);
    
    // Test quality adjustment after 2 seconds
    setTimeout(async () => {
      console.log('🎛️  Adjusting stream quality to 50%...');
      await streamer.setStreamQuality(50);
    }, 2000);
    
    // Stop streaming after test duration
    setTimeout(async () => {
      console.log('⏹️  Stopping desktop streaming...');
      const stopSuccess = await streamer.stopDesktopStream();
      
      if (stopSuccess) {
        const elapsed = Date.now() - startTime;
        const avgFps = (frameCount / elapsed) * 1000;
        const avgMbps = (totalDataSize / elapsed) * 8 / 1000;
        
        console.log('\n📊 Final Statistics:');
        console.log(`   Total frames: ${frameCount}`);
        console.log(`   Total data: ${(totalDataSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   Average FPS: ${avgFps.toFixed(2)}`);
        console.log(`   Average bitrate: ${avgMbps.toFixed(2)} Mbps`);
        console.log(`   Test duration: ${elapsed / 1000} seconds`);
        console.log('\n✅ Bun streaming test completed successfully!');
      } else {
        console.error('❌ Failed to stop desktop streaming');
      }
      
      process.exit(0);
    }, TEST_CONFIG.duration);
    
  } catch (error) {
    console.error('❌ Error during streaming test:', error);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Test terminated');
  process.exit(0);
});

// Run the test
if (import.meta.main) {
  testBunStreaming().catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
}

export { testBunStreaming };