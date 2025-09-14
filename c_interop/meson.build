project('libinterop', ['cpp', 'objcpp'], version: '1.2', default_options: [
    'cpp_std=c++20', 
    'buildtype=release', 
    'optimization=3', 
    ])

# Platform detection
host_system = host_machine.system()
is_darwin = host_system == 'darwin'
is_linux = host_system == 'linux'

include = include_directories('include')

# Platform-specific dependencies
if is_linux
  chafa = dependency('chafa', version: '>=1.8.0')
  chafa_libdir = chafa.get_variable(pkgconfig: 'libdir')
  platform_deps = [chafa]
  platform_rpath = chafa_libdir + ':$ORIGIN'
elif is_darwin
  # macOS uses system frameworks and bundled chafa
  coregraphics = dependency('appleframeworks', modules: ['CoreGraphics', 'ApplicationServices', 'ScreenCaptureKit', 'AVFoundation', 'Foundation'])
  # Use bundled Chafa for macOS
  chafa_inc = include_directories('../third_party/chafa_source')
  
  # Manually specify glib paths to avoid SDK path issues
  glib_lib = meson.get_compiler('cpp').find_library('glib-2.0', dirs: ['/opt/homebrew/Cellar/glib/2.84.4/lib'])
  gettext_lib = meson.get_compiler('cpp').find_library('intl', dirs: ['/opt/homebrew/opt/gettext/lib'])
  
  platform_deps = [coregraphics, glib_lib, gettext_lib]
  platform_rpath = '$ORIGIN'
  
  # Add GLib include directories for macOS
  glib_includes = include_directories(
    '/opt/homebrew/include/glib-2.0',
    '/opt/homebrew/lib/glib-2.0/include'
  )
else
  platform_deps = []
  platform_rpath = '$ORIGIN'
endif

# Platform-specific source files
common_sources = [
  'src/NODE_API_MODULE.cpp',
  'src/TermSize.cpp',
  'src/ansi_escape_codes.cpp',
  'src/memcopy_buffer_to_uint8array.cpp',
  'src/remove_file_if_it_exists.cpp',
  # {new_file} replaced with `task make-source`
]

linux_sources = [
  'src/listen_to_wayland.cpp',
  'src/Send_Message_And_File_Descriptors.cpp',
  'src/Listen_for_New_Client.cpp',
  'src/Get_Message_and_File_Descriptors.cpp',
  'src/mmap_fd.cpp',
  'src/get_fd.cpp',
  'src/Client_State.cpp',
  'src/SHM_Pool_Memory.cpp',
  'src/detect_terminal.cpp',
  'src/ChafaInfo.cpp',
  'src/Draw_State.cpp',
  'src/init_draw_state.cpp',
  'src/draw_desktop.cpp',
  'src/close_wayland_socket.cpp',
  'src/get_socket_path_from_name.cpp',
]

macos_sources = [
  'src/macos_display.cpp',
  'src/macos_terminal_detect.cpp',
  'src/macos_draw_desktop.mm',
  'src/macos_display_wrappers.cpp',
  'src/ChafaInfo_macos.cpp',
  'src/SHM_Pool_Memory.cpp',
  'src/Client_State.cpp',
  'src/init_draw_state_macos.cpp',
]

# Select sources based on platform
if is_linux
  sources = common_sources + linux_sources
elif is_darwin
  sources = common_sources + macos_sources
else
  error('Unsupported platform: ' + host_system)
endif

# Platform-specific include directories
platform_includes = []
if is_darwin
  platform_includes += [chafa_inc, glib_includes]
endif

libinterop = shared_library('interop', sources,
        include_directories: [include,
        
            include_directories('../third_party/node-v22.14.0-linux-x64/include/node'),
            include_directories('../third_party/node-addon-api-8.3.1')
         ] + platform_includes,
        install: true,
        name_suffix: 'node',
        name_prefix: '',
        # Don't complain about undefined linkage that will
        # be supplied by the node(actually bun) runtime
        # https://mesonbuild.com/Builtin-options.html#base-options
        override_options: 'b_lundef=false',
        dependencies: platform_deps,
        # Platform-specific runtime path configuration
        install_rpath: platform_rpath,
        build_rpath: platform_rpath,
        # install_rpath: [ chafa_libdir, '$ORIGIN' ],
        # Make it runnable from the build dir too
        # link_args: [
        #     '-Wl,-rpath,' + chafa_libdir,
        #     '-Wl,-rpath,$ORIGIN'
        # ]
            
            
            )

 
 
