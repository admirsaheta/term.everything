#pragma once

#include <napi.h>

using namespace Napi;

/**
 * JavaScript wrapper for getting display information
 */
Value get_display_info_js(const CallbackInfo &info);

/**
 * JavaScript wrapper for drawing desktop
 */
Value draw_desktop_js(const CallbackInfo &info);

/**
 * JavaScript wrapper for capturing desktop
 */
Value capture_desktop_js(const CallbackInfo &info);

/**
 * JavaScript wrapper for launching applications
 */
Value launch_application_js(const CallbackInfo &info);