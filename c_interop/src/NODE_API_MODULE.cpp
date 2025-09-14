#include "NODE_API_MODULE.h"

// Platform detection
#ifdef __APPLE__
    #define PLATFORM_MACOS 1
#elif __linux__
    #define PLATFORM_LINUX 1
#endif

// Common includes
#include "memcopy_buffer_to_uint8array.h"

// Platform-specific includes
#ifdef PLATFORM_LINUX
    #include "Send_Message_And_File_Descriptors.h"
    #include "Listen_for_New_Client.h"
    #include "Get_Message_and_File_Descriptors.h"
    #include "listen_to_wayland.h"
    #include "mmap_fd.h"
    #include "get_fd.h"
    #include "init_draw_state.h"
    #include "draw_desktop.h"
    #include "close_wayland_socket.h"
    #include "get_socket_path_from_name.h"
#endif

#ifdef PLATFORM_MACOS
    #include "macos_display.h"
    #include "macos_draw_desktop.h"
    #include "macos_display_wrappers.h"
    #include "init_draw_state.h"
#endif

//{NEW_INCLUDE} will be added here

Napi::Object Init(Napi::Env env, Napi::Object exports)
{
    // Common functions available on all platforms
    exports["memcopy_buffer_to_uint8array"] = Napi::Function::New(env, memcopy_buffer_to_uint8array_js);
    
#ifdef PLATFORM_LINUX
    // Linux/Wayland-specific functions
    exports["send_message_and_file_descriptors"] = Napi::Function::New(env, send_message_and_file_descriptors_js);
    exports["get_message_and_file_descriptors"] = Napi::Function::New(env, get_message_and_file_descriptors_js);
    exports["listen_for_client"] = Napi::Function::New(env, listen_for_client);
    exports["listen_to_wayland_socket"] = Napi::Function::New(env, listen_to_wayland_socket_js);
    exports["mmap_shm_pool"] = Napi::Function::New(env, mmap_shm_pool_js);
    exports["remap_shm_pool"] = Napi::Function::New(env, remap_shm_pool_js);
    exports["unmmap_shm_pool"] = Napi::Function::New(env, unmmap_shm_pool_js);
    exports["get_fd"] = Napi::Function::New(env, get_fd_js);
    exports["init_draw_state"] = Napi::Function::New(env, init_draw_state_js);
    exports["draw_desktop"] = Napi::Function::New(env, draw_desktop_js);
    exports["close_wayland_socket"] = Napi::Function::New(env, close_wayland_socket_js);
    exports["get_socket_path_from_name"] = Napi::Function::New(env, get_socket_path_from_name_js);
#endif

#ifdef PLATFORM_MACOS
    // macOS-specific functions
    exports["get_display_info"] = Napi::Function::New(env, get_display_info_js);
    exports["capture_display"] = Napi::Function::New(env, capture_desktop_js);
    exports["draw_desktop"] = Napi::Function::New(env, draw_desktop_js);
    exports["launch_application"] = Napi::Function::New(env, launch_application_js);
    exports["init_draw_state"] = Napi::Function::New(env, init_draw_state_js);
    
    // New streaming functions
    exports["start_desktop_stream"] = Napi::Function::New(env, start_desktop_stream_js);
    exports["stop_desktop_stream"] = Napi::Function::New(env, stop_desktop_stream_js);
    exports["is_desktop_streaming"] = Napi::Function::New(env, is_desktop_streaming_js);
    exports["set_stream_quality"] = Napi::Function::New(env, set_stream_quality_js);
#endif
    
    //{NEW_FUNC} will be added here

    return exports;
}

NODE_API_MODULE(addon, Init)