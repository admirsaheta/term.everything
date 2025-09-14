const { constants } = require("node:os");

// Since this is a .cjs file, we need to use require instead of import
// For now, let's hardcode the path for DEV mode on macOS
const path = require('path');
const c_interop_node_path = () => {
  if (process.env['DEV'] !== undefined) {
    if (process.platform === "darwin") {
      return path.resolve(__dirname, '../lib/interop.node');
    } else {
      return "../deps/libinterop/lib/x86_64-linux-gnu/interop.node";
    }
  }
  return "$ORIGIN/../lib/interop.node";
};

/**
 * Have to use dlopen instead of require, so
 * that bun won't try to include the native module
 * in the executable. This way we can grab the
 * correct .so file from the app image
 */
if (process.env['DEV'] !== undefined) {
  // In DEV mode, use require for better compatibility
  const nativeModule = require(c_interop_node_path());
  Object.assign(module.exports, nativeModule);
} else {
  process.dlopen(module, c_interop_node_path(), constants.dlopen.RTLD_NOW);
}
