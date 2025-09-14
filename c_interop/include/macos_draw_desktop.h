#pragma once

#include <cstdint>
#include <vector>

// Forward declare CoreGraphics types to avoid naming conflicts
#ifdef __APPLE__
typedef struct CGImage* CGImageRef;
#endif

namespace macos_draw {
    struct DisplayInfo {
        int id;
        int width;
        int height;
        int x;
        int y;
        bool is_main;
    };
    
    /**
     * Initialize the macOS drawing context
     */
    bool initialize_drawing_context();
    
    /**
     * Draw the desktop buffer to the screen
     */
    bool draw_desktop_buffer(const uint8_t* buffer, int width, int height, int stride);
    
    /**
     * Capture the current desktop using modern ScreenCaptureKit
     */
    std::vector<uint8_t> capture_desktop(int& width, int& height);
    
    /**
     * Modern screen capture using ScreenCaptureKit (macOS 12.3+)
     */
    std::vector<uint8_t> capture_desktop_screencapturekit(int& width, int& height);
    
    /**
     * Fallback screen capture using CoreGraphics
     */
    std::vector<uint8_t> capture_desktop_fallback(int& width, int& height);
    
    /**
     * Convert CGImage to RGBA buffer
     */
#ifdef __APPLE__
    std::vector<uint8_t> cgimage_to_buffer(CGImageRef image, int& width, int& height);
#endif
    
    /**
     * Get display information
     */
    std::vector<DisplayInfo> get_display_info();
    
    /**
     * Cleanup drawing resources
     */
    void cleanup_drawing_context();
}