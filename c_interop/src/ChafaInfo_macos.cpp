#include "../include/NODE_API_MODULE.h"
#include "../include/ChafaInfo_macos.h"
#include <iostream>
#include <vector>
#include <memory>
#include <cstring>

#ifdef __APPLE__
#include <glib.h>
#include <chafa/chafa.h>
// Include CoreGraphics after Node.js headers to avoid Boolean naming conflict
#include <CoreGraphics/CoreGraphics.h>
#include "../include/MACOS_HEADERS_POST.h"
#endif

namespace ChafaInfo {

#ifdef __APPLE__
/**
 * Convert RGBA buffer to terminal output using Chafa
 */
std::string convert_rgba_to_terminal(const uint8_t* rgba_data, int width, int height, int term_width, int term_height) {
    if (!rgba_data || width <= 0 || height <= 0) {
        return "";
    }

    try {
        // Create Chafa canvas configuration
        ChafaCanvasConfig* config = chafa_canvas_config_new();
        if (!config) {
            std::cerr << "Failed to create Chafa canvas config" << std::endl;
            return "";
        }

        // Configure canvas for terminal output
        chafa_canvas_config_set_geometry(config, term_width, term_height);
        chafa_canvas_config_set_canvas_mode(config, CHAFA_CANVAS_MODE_TRUECOLOR);
        chafa_canvas_config_set_pixel_mode(config, CHAFA_PIXEL_MODE_SYMBOLS);
        chafa_canvas_config_set_dither_mode(config, CHAFA_DITHER_MODE_DIFFUSION);
        chafa_canvas_config_set_color_extractor(config, CHAFA_COLOR_EXTRACTOR_AVERAGE);
        chafa_canvas_config_set_color_space(config, CHAFA_COLOR_SPACE_RGB);
        
        // Set symbol map for better character art
        ChafaSymbolMap* symbol_map = chafa_symbol_map_new();
        chafa_symbol_map_add_by_tags(symbol_map, CHAFA_SYMBOL_TAG_BLOCK);
        chafa_symbol_map_add_by_tags(symbol_map, CHAFA_SYMBOL_TAG_BORDER);
        chafa_symbol_map_add_by_tags(symbol_map, CHAFA_SYMBOL_TAG_SPACE);
        chafa_canvas_config_set_symbol_map(config, symbol_map);

        // Create canvas
        ChafaCanvas* canvas = chafa_canvas_new(config);
        if (!canvas) {
            std::cerr << "Failed to create Chafa canvas" << std::endl;
            chafa_canvas_config_unref(config);
            chafa_symbol_map_unref(symbol_map);
            return "";
        }

        // Draw the image data to canvas
        chafa_canvas_draw_all_pixels(canvas, 
                                   CHAFA_PIXEL_RGBA8_UNASSOCIATED,
                                   rgba_data,
                                   width, height,
                                   width * 4); // row stride

        // Generate terminal output
        GString* output = chafa_canvas_print(canvas, nullptr);
        std::string result;
        if (output && output->str) {
            result = std::string(output->str, output->len);
        }

        // Cleanup
        if (output) {
            g_string_free(output, TRUE);
        }
        chafa_canvas_unref(canvas);
        chafa_canvas_config_unref(config);
        chafa_symbol_map_unref(symbol_map);

        return result;
    } catch (const std::exception& e) {
        std::cerr << "Error in Chafa conversion: " << e.what() << std::endl;
        return "";
    }
}

/**
 * Convert CGImage to RGBA buffer
 */
std::vector<uint8_t> cgimage_to_rgba_buffer(CGImageRef image, int& width, int& height) {
    if (!image) {
        width = height = 0;
        return {};
    }

    width = static_cast<int>(CGImageGetWidth(image));
    height = static_cast<int>(CGImageGetHeight(image));
    
    std::vector<uint8_t> buffer(width * height * 4);
    
    // Create color space
    CGColorSpaceRef colorSpace = CGColorSpaceCreateDeviceRGB();
    if (!colorSpace) {
        width = height = 0;
        return {};
    }
    
    // Create bitmap context
    CGContextRef context = CGBitmapContextCreate(
        buffer.data(),
        width, height,
        8, // bits per component
        width * 4, // bytes per row
        colorSpace,
        kCGImageAlphaPremultipliedLast | kCGBitmapByteOrder32Big
    );
    
    if (!context) {
        CGColorSpaceRelease(colorSpace);
        width = height = 0;
        return {};
    }
    
    // Draw image to context
    CGRect rect = CGRectMake(0, 0, width, height);
    CGContextDrawImage(context, rect, image);
    
    // Cleanup
    CGContextRelease(context);
    CGColorSpaceRelease(colorSpace);
    
    return buffer;
}

/**
 * Convert desktop buffer to terminal output (main function)
 */
std::string convert_desktop_to_terminal(const uint8_t* desktop_data, int desktop_width, int desktop_height, 
                                      int term_width, int term_height) {
    if (!desktop_data || desktop_width <= 0 || desktop_height <= 0 || term_width <= 0 || term_height <= 0) {
        return "Error: Invalid input parameters";
    }

    // Assume desktop_data is already in RGBA format
    return convert_rgba_to_terminal(desktop_data, desktop_width, desktop_height, term_width, term_height);
}

#else
// Fallback for non-macOS platforms
std::string convert_desktop_to_terminal(const uint8_t* desktop_data, int desktop_width, int desktop_height, 
                                      int term_width, int term_height) {
    return "Chafa not available on this platform";
}
#endif

} // namespace ChafaInfo