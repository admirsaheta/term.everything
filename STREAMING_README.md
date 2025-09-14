# macOS Desktop Streaming Integration

This document describes the new desktop streaming functionality added to the macOS Display Server integration.

## Overview

The macOS Display Server now supports real-time desktop streaming capabilities, allowing you to capture and process desktop content programmatically. This feature is built on top of macOS's native ScreenCaptureKit framework for optimal performance and system integration.

## Features

- **Real-time desktop streaming** with configurable quality settings
- **Type-safe TypeScript API** with comprehensive error handling
- **Callback-based frame delivery** for flexible processing
- **Quality adjustment** during streaming (0-100 scale)
- **Thread-safe implementation** using native C++ backend
- **Memory efficient** with direct buffer access

## API Reference

### StreamFrame Interface

```typescript
export interface StreamFrame {
    data: Buffer;      // Raw frame data
    width: number;     // Frame width in pixels
    height: number;    // Frame height in pixels
    size: number;      // Total data size in bytes
}
```

### StreamCallback Type

```typescript
export type StreamCallback = (frame: StreamFrame) => void;
```

### MacOSDisplayServer Methods

#### `startDesktopStream(callback: StreamCallback, quality?: number): Promise<boolean>`

Starts desktop streaming with the specified callback function.

**Parameters:**
- `callback`: Function to handle incoming frames
- `quality`: Stream quality (0-100, default: 75)

**Returns:** Promise resolving to `true` if streaming started successfully

**Example:**
```typescript
const streamCallback = (frame: StreamFrame) => {
    console.log(`Frame: ${frame.width}x${frame.height}, ${frame.size} bytes`);
    // Process frame data...
};

const success = await displayServer.startDesktopStream(streamCallback, 80);
```

#### `stopDesktopStream(): Promise<boolean>`

Stops the current desktop streaming session.

**Returns:** Promise resolving to `true` if streaming stopped successfully

#### `isDesktopStreaming(): boolean`

Checks if desktop streaming is currently active.

**Returns:** `true` if streaming is active, `false` otherwise

#### `setStreamQuality(quality: number): Promise<boolean>`

Adjusts the streaming quality during an active session.

**Parameters:**
- `quality`: New quality level (0-100)

**Returns:** Promise resolving to `true` if quality was set successfully

## Usage Examples

### Basic Streaming

```typescript
import { MacOSDisplayServer, StreamFrame } from './src/macOS_Display_Server.ts';

async function basicStreaming() {
    const displayServer = new MacOSDisplayServer({
        captureMode: 'screen',
        enableHiDPI: true,
        captureOptions: {
            includeMouseCursor: true,
            compressionQuality: 75
        }
    });

    await displayServer.initialize();
    await displayServer.start();

    // Set up frame handler
    const frameHandler = (frame: StreamFrame) => {
        console.log(`Received ${frame.width}x${frame.height} frame`);
        // Process frame data here
    };

    // Start streaming
    await displayServer.startDesktopStream(frameHandler, 75);

    // Stream for 10 seconds
    setTimeout(async () => {
        await displayServer.stopDesktopStream();
        await displayServer.stop();
    }, 10000);
}
```

### Advanced Usage with Quality Control

```typescript
async function advancedStreaming() {
    const displayServer = new MacOSDisplayServer();
    await displayServer.initialize();
    await displayServer.start();

    let frameCount = 0;
    const frameHandler = (frame: StreamFrame) => {
        frameCount++;
        
        // Adjust quality based on performance
        if (frameCount % 100 === 0) {
            const newQuality = frameCount > 500 ? 50 : 80;
            displayServer.setStreamQuality(newQuality);
        }
        
        // Process frame...
    };

    await displayServer.startDesktopStream(frameHandler, 80);
    
    // Monitor streaming status
    const statusCheck = setInterval(() => {
        if (!displayServer.isDesktopStreaming()) {
            console.log('Streaming stopped');
            clearInterval(statusCheck);
        }
    }, 1000);
}
```

### Frame Processing Example

```typescript
function processFrame(frame: StreamFrame) {
    // Convert to different formats
    const imageData = new ImageData(
        new Uint8ClampedArray(frame.data),
        frame.width,
        frame.height
    );
    
    // Save to file (pseudo-code)
    // saveFrameToFile(frame.data, frame.width, frame.height);
    
    // Send over network (pseudo-code)
    // sendFrameOverWebSocket(frame);
    
    // Apply real-time processing
    // applyFilters(imageData);
}
```

## Configuration Options

The streaming functionality can be configured through the `MacOSDisplayConfig` interface:

```typescript
const config: MacOSDisplayConfig = {
    captureMode: 'screen',           // 'window' | 'screen' | 'region'
    enableHiDPI: true,               // Enable high-DPI capture
    refreshRate: 30,                 // Target refresh rate
    captureOptions: {
        includeMouseCursor: true,     // Include cursor in capture
        captureAudio: false,          // Audio capture (future feature)
        compressionQuality: 75        // Initial compression quality
    }
};
```

## Performance Considerations

### Quality vs Performance

- **High quality (80-100)**: Better image quality, higher CPU/memory usage
- **Medium quality (50-79)**: Balanced performance and quality
- **Low quality (0-49)**: Lower CPU usage, reduced image quality

### Frame Rate Optimization

```typescript
// Throttle frame processing for better performance
let lastProcessTime = 0;
const frameHandler = (frame: StreamFrame) => {
    const now = Date.now();
    if (now - lastProcessTime < 33) return; // ~30 FPS limit
    
    lastProcessTime = now;
    processFrame(frame);
};
```

### Memory Management

- Frame data is automatically managed by the native backend
- Avoid storing frame data beyond the callback scope
- Use streaming processing rather than buffering multiple frames

## Error Handling

```typescript
try {
    const success = await displayServer.startDesktopStream(frameHandler);
    if (!success) {
        console.error('Failed to start streaming');
        return;
    }
} catch (error) {
    console.error('Streaming error:', error);
    
    // Cleanup
    await displayServer.stopDesktopStream();
}
```

## Testing

Run the comprehensive test suite:

```bash
# Run streaming tests
npx tsx test_streaming.ts

# Build and test
npm run build
npx tsx test_streaming.ts
```

## System Requirements

- macOS 10.15+ (Catalina or later)
- Screen recording permissions enabled
- Node.js 18+ with TypeScript support

## Troubleshooting

### Permission Issues

If streaming fails to start, ensure your application has screen recording permissions:

1. Open System Preferences → Security & Privacy → Privacy
2. Select "Screen Recording" from the left sidebar
3. Add your terminal/Node.js application to the allowed list

### Performance Issues

- Reduce stream quality if experiencing high CPU usage
- Lower the refresh rate in the configuration
- Implement frame throttling in your callback

### Memory Issues

- Avoid storing frame data beyond the callback scope
- Process frames immediately rather than queuing them
- Monitor memory usage and implement backpressure if needed

## Future Enhancements

- Audio capture integration
- Hardware-accelerated encoding
- Multi-display streaming
- Region-specific capture
- WebRTC integration for remote streaming

## Contributing

When contributing to the streaming functionality:

1. Ensure all changes maintain thread safety
2. Add comprehensive error handling
3. Update TypeScript definitions
4. Add tests for new features
5. Update this documentation

## License

This streaming functionality is part of the term.everything project and follows the same licensing terms.