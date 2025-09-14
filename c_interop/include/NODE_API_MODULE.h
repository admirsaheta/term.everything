#pragma once

#ifdef __APPLE__
// Include macOS headers first to establish Boolean type
#include <MacTypes.h>
#endif

#include <napi.h>

// Don't use 'using namespace Napi' to avoid Boolean conflicts
// Instead, use explicit Napi:: prefixes where needed

// Function declarations
Napi::Value memcopy_buffer_to_uint8array_js(const Napi::CallbackInfo &info);

#ifdef __APPLE__
// macOS-specific function declarations
Napi::Value get_display_info_js(const Napi::CallbackInfo &info);
Napi::Value capture_desktop_js(const Napi::CallbackInfo &info);
Napi::Value draw_desktop_js(const Napi::CallbackInfo &info);
Napi::Value launch_application_js(const Napi::CallbackInfo &info);
Napi::Value init_draw_state_js(const Napi::CallbackInfo &info);

// New streaming function declarations
Napi::Value start_desktop_stream_js(const Napi::CallbackInfo &info);
Napi::Value stop_desktop_stream_js(const Napi::CallbackInfo &info);
Napi::Value is_desktop_streaming_js(const Napi::CallbackInfo &info);
Napi::Value set_stream_quality_js(const Napi::CallbackInfo &info);
#endif

#ifdef __linux__
// Linux-specific function declarations
Napi::Value send_message_and_file_descriptors_js(const Napi::CallbackInfo &info);
Napi::Value get_message_and_file_descriptors_js(const Napi::CallbackInfo &info);
Napi::Value listen_for_client(const Napi::CallbackInfo &info);
Napi::Value listen_to_wayland_socket_js(const Napi::CallbackInfo &info);
Napi::Value mmap_shm_pool_js(const Napi::CallbackInfo &info);
Napi::Value remap_shm_pool_js(const Napi::CallbackInfo &info);
Napi::Value unmmap_shm_pool_js(const Napi::CallbackInfo &info);
Napi::Value get_fd_js(const Napi::CallbackInfo &info);
Napi::Value init_draw_state_js(const Napi::CallbackInfo &info);
Napi::Value draw_desktop_js(const Napi::CallbackInfo &info);
Napi::Value close_wayland_socket_js(const Napi::CallbackInfo &info);
Napi::Value get_socket_path_from_name_js(const Napi::CallbackInfo &info);
#endif