// export const c_interop_node_path = () => {
//   const libraryPath =
//     process.platform === "darwin"
//       // ? "../deps/libinterop/lib/interop.node"
//       ? "../deps/libinterop/lib/interop.node"
//       // : "../Appdir/usr/lib/interop.node";
//       : "../deps/libinterop/lib/x86_64-linux-gnu/interop.node";
//   return libraryPath;
// };

export const c_interop_node_path = () => {
  const libraryPath =
    process.env['DEV'] !== undefined
      ? process.platform === "darwin"
        ? "./c_interop/build/interop.node"
        : "../deps/libinterop/lib/x86_64-linux-gnu/interop.node"
      : "$ORIGIN/../lib/interop.node";
  return libraryPath;
};
