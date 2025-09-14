import { wl_display, make_wl_display } from "./objects/wl_display.ts";
import { wl_output, make_wl_output } from "./objects/wl_output.ts";
import { wl_seat, make_wl_seat } from "./objects/wl_seat.ts";
import { wl_shm, make_wl_shm } from "./objects/wl_shm.ts";
import { wl_keyboard, make_wl_keyboard } from "./objects/wl_keyboard.ts";
import { wl_compositor, make_wl_compositor } from "./objects/wl_compositor.ts";
import { zxdg_decoration_manager_v1, make_zxdg_decoration_manager_v1 } from "./objects/zxdg_decoration_manager_v1.ts";
import { wl_pointer } from "./protocols/wayland.xml.ts";
import { wl_subcompositor, make_wl_subcompositor } from "./objects/wl_subcompositor.ts";
import { xdg_wm_base, make_xdg_wm_base } from "./objects/xdg_wm_base.ts";
import { wl_data_device_manager, make_wl_data_device_manager } from "./objects/wl_data_device_manager.ts";
import { pointer } from "./objects/wl_pointer.ts";
import { zwp_xwayland_keyboard_grab_manager_v1, make_zwp_xwayland_keyboard_grab_manager_v1 } from "./objects/zwp_xwayland_keyboard_grab_manager_v1.ts";
import { xwayland_shell_v1, make_xwayland_shell_v1 } from "./objects/xwayland_shell_v1.ts";
import { wl_touch, make_wl_touch } from "./objects/wl_touch.ts";
export enum Global_Ids {
  wl_display = 1,
  wl_compositor = 0xff00_000,
  wl_subcompositor,
  wl_output,
  wl_seat,
  wl_shm,
  xdg_wm_base,
  wl_data_device_manager,
  wl_keyboard,
  wl_pointer,
  zwp_xwayland_keyboard_grab_manager_v1,
  xwayland_shell_v1,
  wl_data_device,
  wl_touch,
  zxdg_decoration_manager_v1,
}
let seat: any;
let display: any;
let output: any;
let shm: any;
let compositor: any;
let subcompositor: any;
let xdgWmBase: any;
let dataDeviceManager: any;
let keyboard: any;
let wlPointer: any;
let zwpXwaylandKeyboardGrabManager: any;
let xwaylandShell: any;
let wlTouch: any;
let zxdgDecorationManager: any;
const globals = {
  get [1]() {
    if (!display) {
      display = make_wl_display();
    }
    return display;
  },
  get [Global_Ids.wl_output]() {
    if (!output) {
      output = make_wl_output();
    }
    return output;
  },
  get [Global_Ids.wl_seat]() {
    if (!seat) {
      seat = make_wl_seat();
    }
    return seat;
  },
  get [Global_Ids.wl_shm]() {
    if (!shm) {
      shm = make_wl_shm();
    }
    return shm;
  },
  get [Global_Ids.wl_compositor]() {
    if (!compositor) {
      compositor = make_wl_compositor();
    }
    return compositor;
  },
  get [Global_Ids.wl_subcompositor]() {
    if (!subcompositor) {
      subcompositor = make_wl_subcompositor();
    }
    return subcompositor;
  },
  get [Global_Ids.xdg_wm_base]() {
    if (!xdgWmBase) {
      xdgWmBase = make_xdg_wm_base();
    }
    return xdgWmBase;
  },
  get [Global_Ids.wl_data_device_manager]() {
    if (!dataDeviceManager) {
      dataDeviceManager = make_wl_data_device_manager();
    }
    return dataDeviceManager;
  },
  get [Global_Ids.wl_keyboard]() {
    if (!keyboard) {
      keyboard = make_wl_keyboard();
    }
    return keyboard;
  },
  get [Global_Ids.wl_pointer]() {
    if (!wlPointer) {
      const { wl_pointer: WlPointerProtocol } = require("./protocols/wayland.xml.ts");
      const { pointer } = require("./objects/wl_pointer.ts");
      wlPointer = new WlPointerProtocol(pointer);
    }
    return wlPointer;
  },
  get [Global_Ids.zwp_xwayland_keyboard_grab_manager_v1]() {
    if (!zwpXwaylandKeyboardGrabManager) {
      zwpXwaylandKeyboardGrabManager = make_zwp_xwayland_keyboard_grab_manager_v1();
    }
    return zwpXwaylandKeyboardGrabManager;
  },
  get [Global_Ids.xwayland_shell_v1]() {
    if (!xwaylandShell) {
      xwaylandShell = make_xwayland_shell_v1();
    }
    return xwaylandShell;
  },
  get [Global_Ids.wl_data_device]() {
    return globals[Global_Ids.wl_seat];
  },
  get [Global_Ids.wl_touch]() {
    if (!wlTouch) {
      wlTouch = make_wl_touch();
    }
    return wlTouch;
  },
  get [Global_Ids.zxdg_decoration_manager_v1]() {
    if (!zxdgDecorationManager) {
      zxdgDecorationManager = make_zxdg_decoration_manager_v1();
    }
    return zxdgDecorationManager;
  },
};

export class GlobalObjects {
  objects: typeof globals & {
    [key: number]: (typeof globals)[keyof typeof globals] | undefined;
  } = globals;

  constructor() {}
}

export const advertised_global_objects_names = [
  {
    name: "wl_compositor",
    id: Global_Ids.wl_compositor,
    version: 6,
  },
  /**
   * Turning off the wl_subcompositor will turn off
   * decorations. Any other side effects??? Looks like
   * GameScope has it turned off, so maybe we could do that
   * too.
   *
   * some programs will crash if wl_subcompositor is not
   * advertised.
   */
  { name: "wl_subcompositor", id: Global_Ids.wl_subcompositor, version: 1 },
  { name: "wl_output", id: Global_Ids.wl_output, version: 5 },

  { name: "wl_seat", id: Global_Ids.wl_seat, version: 10 },
  { name: "wl_shm", id: Global_Ids.wl_shm, version: 2 },
  { name: "xdg_wm_base", id: Global_Ids.xdg_wm_base, version: 6 },
  {
    name: "wl_data_device_manager",
    id: Global_Ids.wl_data_device_manager,
    version: 3,
  },

  {
    name: "zxdg_decoration_manager_v1",
    id: Global_Ids.zxdg_decoration_manager_v1,
    version: 1,
  },
  /**
   * @TODO only advertise these to Xwayland clients
   */
  {
    name: "zwp_xwayland_keyboard_grab_manager_v1",
    id: Global_Ids.zwp_xwayland_keyboard_grab_manager_v1,
    version: 1,
  },
  {
    name: "xwayland_shell_v1",
    id: Global_Ids.xwayland_shell_v1,
    version: 1,
  },
];

export const global_objects = new GlobalObjects();
