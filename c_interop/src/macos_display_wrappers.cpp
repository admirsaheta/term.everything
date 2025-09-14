#include "../include/NODE_API_MODULE.h"
#include <napi.h>
#include <iostream>
#include <cstdlib>
#include <string>
#include <vector>

// Include macOS headers after Node.js headers to avoid Boolean naming conflict
#include "macos_display.h"
#include "macos_draw_desktop.h"
#include "ChafaInfo_macos.h"

// Forward declarations for C streaming functions
extern "C" {
    bool start_desktop_stream_c(int width, int height, void(*callback)(uint8_t*, size_t, int, int));
    void stop_desktop_stream_c();
    bool is_desktop_streaming_c();
    void set_stream_quality_c(float quality);
}

#ifdef __APPLE__
#include <CoreFoundation/CoreFoundation.h>
#include <ApplicationServices/ApplicationServices.h>
#include "../include/MACOS_HEADERS_POST.h"
#endif

// Don't use 'using namespace Napi' to avoid Boolean conflicts with macOS

// Forward declaration of macOS-specific Draw_State
struct Draw_State_MacOS {
    bool session_type_is_x11;
    Draw_State_MacOS(bool session_type_is_x11) : session_type_is_x11(session_type_is_x11) {}
    ~Draw_State_MacOS() {}
};

Napi::Value get_display_info_js(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    
    try {
        std::vector<macos_display::DisplayInfo> displays = macos_display::get_all_displays();
        Napi::Array result = Napi::Array::New(env, displays.size());
        
        for (size_t i = 0; i < displays.size(); i++) {
            Napi::Object display_obj = Napi::Object::New(env);
            display_obj.Set("id", Napi::Number::New(env, displays[i].id));
            display_obj.Set("width", Napi::Number::New(env, displays[i].width));
            display_obj.Set("height", Napi::Number::New(env, displays[i].height));
            display_obj.Set("x", Napi::Number::New(env, displays[i].x));
            display_obj.Set("y", Napi::Number::New(env, displays[i].y));
            display_obj.Set("is_main", Napi::Boolean::New(env, displays[i].is_main));
            display_obj.Set("scale_factor", Napi::Number::New(env, displays[i].scale_factor));
            result.Set(i, display_obj);
        }
        
        return result;
    } catch (const std::exception& e) {
        Napi::Error::New(env, std::string("Failed to get display info: ") + e.what()).ThrowAsJavaScriptException();
        return env.Undefined();
    }
}

Napi::Value draw_desktop_js(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    
    try {
        auto s = info[0].As<Napi::External<Draw_State_MacOS>>().Data();
        auto desktop_buffer = info[1].As<Napi::Buffer<uint8_t>>();
        auto width = info[2].As<Napi::Number>().Uint32Value();
        auto height = info[3].As<Napi::Number>().Uint32Value();
        auto status_line = info[4].As<Napi::String>().Utf8Value();
        
        // Get terminal dimensions (assume 80x24 for now, should be passed from TypeScript)
        int term_width = 80;
        int term_height = 24;
        
        // Convert desktop buffer to terminal output using Chafa
        std::string terminal_output = ChafaInfo::convert_desktop_to_terminal(
            desktop_buffer.Data(),
            static_cast<int>(width),
            static_cast<int>(height),
            term_width,
            term_height
        );
        
        // Add status line if provided
        if (!status_line.empty()) {
            terminal_output += "\n" + status_line;
        }
        
        Napi::Object result = Napi::Object::New(env);
        result.Set("width", Napi::Number::New(env, width));
        result.Set("height", Napi::Number::New(env, height));
        result.Set("terminal_output", Napi::String::New(env, terminal_output));
        result.Set("term_width", Napi::Number::New(env, term_width));
        result.Set("term_height", Napi::Number::New(env, term_height));
        
        return result;
    } catch (const std::exception& e) {
        Napi::Error::New(env, std::string("Failed to draw desktop: ") + e.what()).ThrowAsJavaScriptException();
        return env.Undefined();
    }
}

Napi::Value capture_desktop_js(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    
    try {
        int width, height;
        auto buffer = macos_draw::capture_desktop(width, height);
        
        Napi::Object result = Napi::Object::New(env);
        result.Set("width", Napi::Number::New(env, width));
        result.Set("height", Napi::Number::New(env, height));
        
        // Convert buffer to Uint8Array
        auto js_buffer = Napi::Uint8Array::New(env, buffer.size());
        std::memcpy(js_buffer.Data(), buffer.data(), buffer.size());
        result.Set("data", js_buffer);
        
        return result;
    } catch (const std::exception& e) {
        Napi::Error::New(env, std::string("Failed to capture desktop: ") + e.what()).ThrowAsJavaScriptException();
        return env.Undefined();
    }
}

Napi::Value launch_application_js(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "Expected string argument for bundle ID").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    
    std::string bundle_id = info[0].As<Napi::String>().Utf8Value();
    
    try {
        // Use system command to launch application for now
        std::string command = "open -b \"" + bundle_id + "\"";
        int result = std::system(command.c_str());
        bool success = (result == 0);
        return Napi::Boolean::New(env, success);
    } catch (const std::exception& e) {
        Napi::Error::New(env, std::string("Failed to launch application: ") + e.what()).ThrowAsJavaScriptException();
        return env.Undefined();
    }
}

// Global callback storage for streaming
static Napi::ThreadSafeFunction stream_callback_tsfn;
static bool stream_callback_active = false;

// C callback function that will be called from native code
void stream_frame_callback(uint8_t* data, size_t size, int width, int height) {
    if (stream_callback_active && stream_callback_tsfn) {
        // Create a copy of the data for the callback
        uint8_t* data_copy = new uint8_t[size];
        std::memcpy(data_copy, data, size);
        
        // Capture size, width, height in the lambda
        auto callback = [size, width, height](Napi::Env env, Napi::Function jsCallback, uint8_t* data) {
            if (data) {
                // Create buffer from the data
                Napi::Buffer<uint8_t> buffer = Napi::Buffer<uint8_t>::New(env, data, size,
                    [](Napi::Env env, uint8_t* finalizeData) {
                        delete[] finalizeData;
                    });
                
                Napi::Object frame_info = Napi::Object::New(env);
                frame_info.Set("data", buffer);
                frame_info.Set("width", Napi::Number::New(env, width));
                frame_info.Set("height", Napi::Number::New(env, height));
                frame_info.Set("size", Napi::Number::New(env, static_cast<uint32_t>(size)));
                
                jsCallback.Call({frame_info});
            }
        };
        
        stream_callback_tsfn.BlockingCall(data_copy, callback);
    }
}

Napi::Value start_desktop_stream_js(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    
    if (info.Length() < 3 || !info[0].IsNumber() || !info[1].IsNumber() || !info[2].IsFunction()) {
        Napi::TypeError::New(env, "Expected (width: number, height: number, callback: function)").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    
    int width = info[0].As<Napi::Number>().Int32Value();
    int height = info[1].As<Napi::Number>().Int32Value();
    Napi::Function callback = info[2].As<Napi::Function>();
    
    try {
        // Create thread-safe function for the callback
        stream_callback_tsfn = Napi::ThreadSafeFunction::New(
            env,
            callback,
            "DesktopStreamCallback",
            0,
            1
        );
        
        stream_callback_active = true;
        
        // Start the native streaming
        bool success = start_desktop_stream_c(width, height, stream_frame_callback);
        
        if (!success) {
            stream_callback_active = false;
            stream_callback_tsfn.Release();
        }
        
        return Napi::Boolean::New(env, success);
    } catch (const std::exception& e) {
        stream_callback_active = false;
        if (stream_callback_tsfn) {
            stream_callback_tsfn.Release();
        }
        Napi::Error::New(env, std::string("Failed to start desktop stream: ") + e.what()).ThrowAsJavaScriptException();
        return env.Undefined();
    }
}

Napi::Value stop_desktop_stream_js(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    
    try {
        stop_desktop_stream_c();
        
        stream_callback_active = false;
        if (stream_callback_tsfn) {
            stream_callback_tsfn.Release();
        }
        
        return Napi::Boolean::New(env, true);
    } catch (const std::exception& e) {
        Napi::Error::New(env, std::string("Failed to stop desktop stream: ") + e.what()).ThrowAsJavaScriptException();
        return env.Undefined();
    }
}

Napi::Value is_desktop_streaming_js(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    
    try {
        bool streaming = is_desktop_streaming_c();
        return Napi::Boolean::New(env, streaming);
    } catch (const std::exception& e) {
        Napi::Error::New(env, std::string("Failed to check streaming status: ") + e.what()).ThrowAsJavaScriptException();
        return env.Undefined();
    }
}

Napi::Value set_stream_quality_js(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsNumber()) {
        Napi::TypeError::New(env, "Expected number argument for quality (0.1-1.0)").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    
    float quality = info[0].As<Napi::Number>().FloatValue();
    
    try {
        set_stream_quality_c(quality);
        return Napi::Boolean::New(env, true);
    } catch (const std::exception& e) {
        Napi::Error::New(env, std::string("Failed to set stream quality: ") + e.what()).ThrowAsJavaScriptException();
        return env.Undefined();
    }
}