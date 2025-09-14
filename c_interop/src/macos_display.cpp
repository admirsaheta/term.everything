#include "../include/NODE_API_MODULE.h"
#include "../include/macos_display.h"
#include <iostream>
#include <vector>
#include <memory>
#include <cmath>

// macOS-specific includes - include after Node.js headers to avoid Boolean naming conflict
#ifdef __APPLE__
#include <CoreGraphics/CoreGraphics.h>
#include <ApplicationServices/ApplicationServices.h>
#include <CoreFoundation/CoreFoundation.h>
#include <IOKit/graphics/IOGraphicsLib.h>
#include "../include/MACOS_HEADERS_POST.h"
#endif

namespace macos_display {

#ifdef __APPLE__
/**
 * Get the scale factor for a display
 */
static double get_display_scale_factor(CGDirectDisplayID display_id) {
    // Get the display mode
    CGDisplayModeRef mode = CGDisplayCopyDisplayMode(display_id);
    if (!mode) {
        return 1.0;
    }
    
    // Get pixel dimensions and point dimensions
    size_t pixel_width = CGDisplayModeGetPixelWidth(mode);
    size_t pixel_height = CGDisplayModeGetPixelHeight(mode);
    size_t point_width = CGDisplayModeGetWidth(mode);
    size_t point_height = CGDisplayModeGetHeight(mode);
    
    CGDisplayModeRelease(mode);
    
    // Calculate scale factor
    double scale_x = static_cast<double>(pixel_width) / static_cast<double>(point_width);
    double scale_y = static_cast<double>(pixel_height) / static_cast<double>(point_height);
    
    // Return the average scale factor
    return (scale_x + scale_y) / 2.0;
}
#endif

/**
 * Get information about all available displays
 */
std::vector<DisplayInfo> get_all_displays() {
    std::vector<DisplayInfo> displays;
    
#ifdef __APPLE__
    try {
        // Get list of active displays
        uint32_t max_displays = 32;
        CGDirectDisplayID display_list[max_displays];
        uint32_t display_count;
        
        CGError error = CGGetActiveDisplayList(max_displays, display_list, &display_count);
        if (error != kCGErrorSuccess) {
            std::cerr << "Failed to get active display list: " << error << std::endl;
            return displays;
        }
        
        CGDirectDisplayID main_display_id = CGMainDisplayID();
        
        for (uint32_t i = 0; i < display_count; i++) {
            CGDirectDisplayID display_id = display_list[i];
            CGRect bounds = CGDisplayBounds(display_id);
            
            DisplayInfo info;
            info.id = static_cast<int>(display_id);
            info.width = static_cast<int>(bounds.size.width);
            info.height = static_cast<int>(bounds.size.height);
            info.x = static_cast<int>(bounds.origin.x);
            info.y = static_cast<int>(bounds.origin.y);
            info.is_main = (display_id == main_display_id);
            info.scale_factor = get_display_scale_factor(display_id);
            
            displays.push_back(info);
            
            std::cout << "Display " << info.id << ": " << info.width << "x" << info.height 
                      << " at (" << info.x << ", " << info.y << ")" 
                      << " scale: " << info.scale_factor
                      << (info.is_main ? " [MAIN]" : "") << std::endl;
        }
        
        std::cout << "Retrieved " << displays.size() << " display(s)" << std::endl;
    } catch (const std::exception& e) {
        std::cerr << "Error getting display list: " << e.what() << std::endl;
    }
#else
    // Fallback for non-macOS platforms
    DisplayInfo main_display;
    main_display.id = 1;
    main_display.width = 1920;
    main_display.height = 1080;
    main_display.x = 0;
    main_display.y = 0;
    main_display.is_main = true;
    main_display.scale_factor = 1.0;
    
    displays.push_back(main_display);
    std::cout << "Using fallback display info on non-macOS platform" << std::endl;
#endif
    
    return displays;
}

/**
 * Get the main display information
 */
DisplayInfo get_main_display() {
#ifdef __APPLE__
    try {
        CGDirectDisplayID main_display_id = CGMainDisplayID();
        CGRect bounds = CGDisplayBounds(main_display_id);
        
        DisplayInfo info;
        info.id = static_cast<int>(main_display_id);
        info.width = static_cast<int>(bounds.size.width);
        info.height = static_cast<int>(bounds.size.height);
        info.x = static_cast<int>(bounds.origin.x);
        info.y = static_cast<int>(bounds.origin.y);
        info.is_main = true;
        info.scale_factor = get_display_scale_factor(main_display_id);
        
        std::cout << "Retrieved main display: " << info.width << "x" << info.height 
                  << " scale: " << info.scale_factor << std::endl;
        return info;
    } catch (const std::exception& e) {
        std::cerr << "Error getting main display: " << e.what() << std::endl;
    }
#endif
    
    // Fallback implementation
    DisplayInfo main_display;
    main_display.id = 1;
    main_display.width = 1920;
    main_display.height = 1080;
    main_display.x = 0;
    main_display.y = 0;
    main_display.is_main = true;
    main_display.scale_factor = 1.0;
    
    std::cout << "Using fallback main display info" << std::endl;
    return main_display;
}

/**
 * Check if a display with the given ID exists
 */
bool display_exists(int display_id) {
#ifdef __APPLE__
    try {
        // Get list of active displays
        uint32_t max_displays = 32;
        CGDirectDisplayID display_list[max_displays];
        uint32_t display_count;
        
        CGError error = CGGetActiveDisplayList(max_displays, display_list, &display_count);
        if (error != kCGErrorSuccess) {
            return false;
        }
        
        // Check if the display ID exists in the list
        for (uint32_t i = 0; i < display_count; i++) {
            if (static_cast<int>(display_list[i]) == display_id) {
                return true;
            }
        }
        
        return false;
    } catch (const std::exception& e) {
        std::cerr << "Error checking display existence: " << e.what() << std::endl;
        return false;
    }
#else
    // Fallback for non-macOS platforms
    return display_id == 1;
#endif
}

/**
 * Get display refresh rate
 */
double get_display_refresh_rate(int display_id) {
#ifdef __APPLE__
    try {
        CGDirectDisplayID cg_display_id = static_cast<CGDirectDisplayID>(display_id);
        CGDisplayModeRef mode = CGDisplayCopyDisplayMode(cg_display_id);
        
        if (!mode) {
            return 60.0; // Default fallback
        }
        
        double refresh_rate = CGDisplayModeGetRefreshRate(mode);
        CGDisplayModeRelease(mode);
        
        // If refresh rate is 0, it's likely a built-in display with variable refresh
        if (refresh_rate == 0.0) {
            refresh_rate = 60.0; // Assume 60Hz for built-in displays
        }
        
        return refresh_rate;
    } catch (const std::exception& e) {
        std::cerr << "Error getting display refresh rate: " << e.what() << std::endl;
        return 60.0;
    }
#else
    return 60.0; // Default fallback
#endif
}

} // namespace macos_display