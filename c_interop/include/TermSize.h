#pragma once

#ifdef __linux__
#include <glib.h>
#else
// Use standard types for non-Linux platforms
typedef int gint;
typedef float gfloat;
typedef double gdouble;
#endif

/**
 * @brief Gets the termsize from
 * STDOUT and STDERR and STDIN
 * in the order
 *
 */
class TermSize
{
public:
    /**
     * @brief size of the terminal
     * in cells
     *
     */
    gint width_cells, height_cells;
    /**
     * @brief size of the terminal
     * in pixels
     *
     */
    gint width_pixels, height_pixels;

    gfloat font_ratio;

    gint width_of_a_cell_in_pixels, height_of_a_cell_in_pixels; /* Size of each character cell, in pixels */

    TermSize();
};