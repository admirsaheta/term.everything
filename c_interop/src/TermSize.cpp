#include "TermSize.h"

#include <sys/ioctl.h> /* ioctl */
#include <unistd.h> /* STDOUT_FILENO, STDERR_FILENO, STDIN_FILENO */

TermSize::TermSize()
{

    width_cells = height_cells = width_pixels = height_pixels = -1;

    struct winsize w;

    if (ioctl(STDOUT_FILENO, TIOCGWINSZ, &w) >= 0 || ioctl(STDERR_FILENO, TIOCGWINSZ, &w) >= 0 || ioctl(STDIN_FILENO, TIOCGWINSZ, &w) >= 0)
    {
        width_cells = w.ws_col;
        height_cells = w.ws_row;
        width_pixels = w.ws_xpixel;
        height_pixels = w.ws_ypixel;
    }

    if (width_cells <= 0)
    {

        width_cells = -1;
    }
    if (height_cells <= 2)
    {

        height_cells = -1;
    }

    /* If .ws_xpixel and .ws_ypixel are filled out, we can calculate
     * aspect information for the font used. Sixel-capable terminals
     * like mlterm set these fields, but most others do not. */

    if (width_pixels <= 0 || height_pixels <= 0)
    {
        width_pixels = -1;
        height_pixels = -1;
    }

    if (width_cells > 0 && height_cells > 0 && width_pixels > 0 && height_pixels > 0)
    {
        width_of_a_cell_in_pixels = width_pixels / width_cells;
        height_of_a_cell_in_pixels = height_pixels / height_cells;
        font_ratio = (gdouble)width_of_a_cell_in_pixels / (gdouble)height_of_a_cell_in_pixels;
    } else{
        width_of_a_cell_in_pixels = -1;
        height_of_a_cell_in_pixels = -1;
        font_ratio = 0.5;
    }
}