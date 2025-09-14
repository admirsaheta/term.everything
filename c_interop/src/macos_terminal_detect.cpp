#include <node_api.h>
#include <string>
#include <cstdlib>

// macOS terminal detection implementation
namespace MacOSTerminal {

    napi_value DetectTerminal(napi_env env, napi_callback_info info) {
        napi_value result;
        
        // Check common macOS terminal environment variables
        const char* term_program = std::getenv("TERM_PROGRAM");
        const char* term = std::getenv("TERM");
        
        std::string terminal_name = "unknown";
        
        if (term_program) {
            std::string program(term_program);
            if (program == "Apple_Terminal") {
                terminal_name = "Terminal.app";
            } else if (program == "iTerm.app") {
                terminal_name = "iTerm2";
            } else if (program == "WezTerm") {
                terminal_name = "WezTerm";
            } else if (program == "Alacritty") {
                terminal_name = "Alacritty";
            } else if (program == "Hyper") {
                terminal_name = "Hyper";
            } else {
                terminal_name = program;
            }
        } else if (term) {
            terminal_name = std::string(term);
        }
        
        napi_create_string_utf8(env, terminal_name.c_str(), terminal_name.length(), &result);
        return result;
    }

    napi_value GetTerminalCapabilities(napi_env env, napi_callback_info info) {
        napi_value result;
        napi_create_object(env, &result);
        
        // Check for color support
        napi_value supports_color;
        const char* colorterm = std::getenv("COLORTERM");
        const char* term = std::getenv("TERM");
        
        bool has_color = false;
        if (colorterm || (term && (strstr(term, "color") || strstr(term, "256") || strstr(term, "xterm")))) {
            has_color = true;
        }
        
        napi_get_boolean(env, has_color, &supports_color);
        napi_set_named_property(env, result, "supportsColor", supports_color);
        
        // Check for true color support
        napi_value supports_truecolor;
        bool has_truecolor = colorterm && (strcmp(colorterm, "truecolor") == 0 || strcmp(colorterm, "24bit") == 0);
        napi_get_boolean(env, has_truecolor, &supports_truecolor);
        napi_set_named_property(env, result, "supportsTrueColor", supports_truecolor);
        
        return result;
    }

}