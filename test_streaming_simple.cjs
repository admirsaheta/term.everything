#!/usr/bin/env node

/**
 * Simple test for macOS desktop streaming functionality
 */

process.env.DEV = '1';

const c = require('./src/c_interop.cjs');

console.log('🚀 Testing macOS Desktop Streaming (Simple)...');
console.log('Available streaming functions:', [
  'start_desktop_stream',
  'stop_desktop_stream', 
  'is_desktop_streaming',
  'set_stream_quality'
].filter(f => typeof c[f] === 'function'));

async function testBasicStreaming() {
  try {
    console.log('\n📊 Initial streaming status:', c.is_desktop_streaming());
    
    // Test frame callback
    const frameCallback = (data, width, height, size) => {
      console.log(`📺 Frame received: ${width}x${height}, ${size} bytes`);
      
      // Log first few bytes
      if (data && data.length > 0) {
        const preview = Array.from(data.slice(0, 8))
          .map(b => b.toString(16).padStart(2, '0'))
          .join(' ');
        console.log(`   Data preview: ${preview}...`);
      }
    };
    
    console.log('\n🎥 Starting desktop streaming...');
    // Function expects (width, height, callback)
    const startResult = c.start_desktop_stream(1920, 1080, frameCallback);
    console.log('Start result:', startResult);
    
    console.log('📊 Streaming status after start:', c.is_desktop_streaming());
    
    if (c.is_desktop_streaming()) {
      console.log('✅ Streaming started successfully!');
      
      // Let it run for 3 seconds
      console.log('⏱️  Streaming for 3 seconds...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Test quality adjustment
      console.log('\n🔧 Setting stream quality to 50...');
      const qualityResult = c.set_stream_quality(50);
      console.log('Quality result:', qualityResult);
      
      // Stream for 2 more seconds
      console.log('⏱️  Streaming for 2 more seconds...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Stop streaming
      console.log('\n⏹️  Stopping desktop streaming...');
      const stopResult = c.stop_desktop_stream();
      console.log('Stop result:', stopResult);
      
      console.log('📊 Final streaming status:', c.is_desktop_streaming());
      
      if (!c.is_desktop_streaming()) {
        console.log('✅ Streaming stopped successfully!');
      } else {
        console.log('⚠️  Streaming may still be active');
      }
      
    } else {
      console.log('❌ Failed to start streaming');
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error);
    
    // Cleanup attempt
    try {
      c.stop_desktop_stream();
    } catch (cleanupError) {
      console.error('🧹 Cleanup failed:', cleanupError);
    }
  }
}

// Test display info
function testDisplayInfo() {
  console.log('\n📋 Testing display information...');
  
  try {
    const displayInfo = c.get_display_info();
    console.log('🖥️  Display info:', displayInfo);
  } catch (error) {
    console.error('❌ Display info failed:', error);
  }
}

// Run tests
async function runTests() {
  console.log('🧪 Running Simple Streaming Tests\n');
  
  testDisplayInfo();
  await testBasicStreaming();
  
  console.log('\n🏁 Tests completed!');
}

runTests().catch(console.error);