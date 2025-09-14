#include "init_draw_state.h"

// macOS-specific implementation that doesn't depend on Chafa
// since macOS uses native display capture instead of Wayland/X11

struct Draw_State_MacOS {
    bool session_type_is_x11;
    
    Draw_State_MacOS(bool session_type_is_x11) : session_type_is_x11(session_type_is_x11) {}
    ~Draw_State_MacOS() {}
};

Value init_draw_state_js(const CallbackInfo &info)
{
    auto env = info.Env();
    
    auto session_type_is_x11 = info[0].As<Boolean>().Value();
    
    auto draw_state = External<Draw_State_MacOS>::New(
        env, new Draw_State_MacOS(session_type_is_x11),
        [](Napi::Env env, Draw_State_MacOS *data)
        { delete data; });
    return draw_state;
}