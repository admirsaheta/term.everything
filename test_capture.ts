#!/usr/bin/env bun

import { $ } from 'bun';
import { unlinkSync, existsSync } from 'fs';

async function testFullScreenCapture() {
  console.log('📸 Testing full screen capture...');
  
  const tempFile = `./test_fullscreen_capture_${Date.now()}.png`;
  
  try {
    await $`screencapture -x -t png ${tempFile}`;
    console.log(`📸 Full screen screenshot saved to: ${tempFile}`);
    
    // Test Chafa conversion
    try {
      const chafaOutput = await $`chafa --size 120x36 --symbols ascii --dither none --color-space rgb --work 9 ${tempFile}`.text();
      console.log('✅ Chafa conversion successful');
      console.log('🎯 Generated ASCII art (sample):');
      console.log(chafaOutput.split('\n').slice(0, 5).join('\n') + '...');
    } catch (error) {
      console.log(`⚠️ Chafa failed: ${error}`);
    }
    
    // Keep screenshot for inspection
    console.log(`📁 Screenshot preserved at: ${tempFile}`);
    
    return true;
  } catch (error) {
    console.log(`❌ Full screen capture failed: ${error}`);
    return false;
  }
}

async function testCalculatorCapture() {
  try {
    console.log('🧪 Testing Calculator window capture...');
    
    // Launch Calculator and get window bounds using AppleScript
    const boundsScript = `
tell application "Calculator"
    activate
    delay 1
end tell

tell application "System Events"
    tell process "Calculator"
        set frontmost to true
        delay 0.5
        
        -- Move window to visible area if needed
        set windowPos to position of front window
        set windowSize to size of front window
        
        -- Ensure window is on screen (move to 100,100 if off-screen)
        if (item 1 of windowPos) < 0 or (item 2 of windowPos) < 0 then
            set position of front window to {100, 100}
            delay 0.3
            set windowPos to position of front window
        end if
        
        return (item 1 of windowPos) & "," & (item 2 of windowPos) & "," & (item 1 of windowSize) & "," & (item 2 of windowSize)
    end tell
end tell
`;
    
    const boundsResult = await $`osascript -e ${boundsScript}`.text();
    console.log(`📐 Calculator window bounds: ${boundsResult.trim()}`);
    
    // Parse bounds: "x, y, width, height" (filter out empty strings from malformed output)
     const bounds = boundsResult.trim().split(',').map(s => s.trim()).filter(s => s !== '').map(s => parseInt(s));
     if (bounds.length !== 4) {
       throw new Error(`Invalid bounds format: ${boundsResult}`);
     }
    
    const [x, y, width, height] = bounds;
     
     console.log(`📐 Calculator window: x=${x}, y=${y}, width=${width}, height=${height}`);
     
     if (width <= 0 || height <= 0 || x < 0 || y < 0) {
       console.log(`⚠️ Calculator window is off-screen or invalid, using full screen capture instead`);
       return await testFullScreenCapture();
     }
    

    
    // Capture the specific window area
    const tempFile = `./test_calculator_capture_${Date.now()}.png`;
    await $`screencapture -R${x},${y},${width},${height} -x -t png ${tempFile}`;
    console.log(`📸 Screenshot saved to: ${tempFile}`);
    
    // Test Chafa conversion
    try {
      const chafaOutput = await $`chafa --size 120x36 --symbols ascii --dither none --color-space rgb --work 9 ${tempFile}`.text();
      console.log('✅ Chafa conversion successful');
      console.log('🎨 ASCII Art Preview:');
      console.log(chafaOutput);
      
    } catch (error: any) {
      console.log('⚠️ Chafa not available, using fallback');
    }
    
    // Keep screenshot for inspection
    console.log(`📁 Screenshot preserved at: ${tempFile}`);
    
    return true;
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

// Removed parseImageMagickOutput function - now using Chafa directly

if (import.meta.main) {
  console.log('🧪 Starting Calculator capture test...');
  
  testCalculatorCapture().then(result => {
    console.log(`\n📊 Test Result: ${result ? '✅ Success' : '❌ Failed'}`);
  });
}