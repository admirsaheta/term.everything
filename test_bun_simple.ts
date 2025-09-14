#!/usr/bin/env bun

/**
 * Simple Bun compatibility test for macOS desktop streaming
 * Tests basic functionality without complex streaming
 */

import BunStreamingWrapper from './src/bun_streaming_wrapper.ts';

async function testBunBasics() {
  console.log('🚀 Testing Bun basic compatibility...');
  
  const streamer = new BunStreamingWrapper({
    width: 800,
    height: 600,
    quality: 50
  });
  
  console.log('📱 Streamer initialized successfully');
  
  // Test basic methods without actual streaming
  console.log('🔍 Testing isDesktopStreaming():', streamer.isDesktopStreaming());
  
  console.log('🎛️  Testing setStreamQuality(75)...');
  const qualityResult = await streamer.setStreamQuality(75);
  console.log('   Quality set result:', qualityResult);
  
  // Test event handling
  streamer.on('started', () => {
    console.log('✅ Started event received');
  });
  
  streamer.on('stopped', () => {
    console.log('🛑 Stopped event received');
  });
  
  console.log('\n🎯 Testing short streaming session...');
  
  let frameReceived = false;
  const testCallback = (frame: any) => {
    if (!frameReceived) {
      console.log('📊 First frame received:', {
        width: frame.width,
        height: frame.height,
        size: frame.size
      });
      frameReceived = true;
    }
  };
  
  try {
    const startResult = await streamer.startDesktopStream(testCallback);
    console.log('▶️  Start result:', startResult);
    
    if (startResult) {
      // Wait briefly for potential frames
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const stopResult = await streamer.stopDesktopStream();
      console.log('⏹️  Stop result:', stopResult);
    }
    
  } catch (error) {
    console.error('❌ Error during streaming test:', error);
  }
  
  console.log('\n✅ Bun basic compatibility test completed!');
}

// Run the test
if (import.meta.main) {
  testBunBasics().catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
}

export { testBunBasics };