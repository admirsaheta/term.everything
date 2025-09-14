#pragma once

#include <string>
#include <vector>
#include <cstdint>

#ifdef __APPLE__
// Forward declaration to avoid Boolean naming conflict
typedef struct CGImage* CGImageRef;
#endif

namespace ChafaInfo {

/**
 * Convert RGBA buffer to terminal output using Chafa
 * @param rgba_data Raw RGBA pixel data
 * @param width Image width in pixels
 * @param height Image height in pixels
 * @param term_width Terminal width in characters
 * @param term_height Terminal height in characters
 * @return Terminal-formatted string with ANSI escape codes
 */
std::string convert_rgba_to_terminal(const uint8_t* rgba_data, int width, int height, int term_width, int term_height);

#ifdef __APPLE__
/**
 * Convert CGImage to RGBA buffer
 * @param image CoreGraphics image
 * @param width Output width
 * @param height Output height
 * @return RGBA buffer
 */
std::vector<uint8_t> cgimage_to_rgba_buffer(CGImageRef image, int& width, int& height);
#endif

/**
 * Convert desktop buffer to terminal output (main function)
 * @param desktop_data Raw desktop pixel data
 * @param desktop_width Desktop width in pixels
 * @param desktop_height Desktop height in pixels
 * @param term_width Terminal width in characters
 * @param term_height Terminal height in characters
 * @return Terminal-formatted string
 */
std::string convert_desktop_to_terminal(const uint8_t* desktop_data, int desktop_width, int desktop_height, 
                                      int term_width, int term_height);

} // namespace ChafaInfo