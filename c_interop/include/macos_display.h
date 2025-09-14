#pragma once

#include <cstdint>
#include <vector>

namespace macos_display {
    struct DisplayInfo {
        int id;
        int width;
        int height;
        int x;
        int y;
        bool is_main;
        double scale_factor;
    };
    
    /**
     * Get information about all available displays
     */
    std::vector<DisplayInfo> get_all_displays();
    
    /**
     * Get the main display information
     */
    DisplayInfo get_main_display();
    
    /**
     * Check if a display with the given ID exists
     */
    bool display_exists(int display_id);
    
    /**
     * Get display refresh rate
     */
    double get_display_refresh_rate(int display_id);
}