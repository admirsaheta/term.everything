import { Global_Ids } from "../GlobalObjects.ts";
import {
  zwp_xwayland_keyboard_grab_manager_v1_delegate as d,
} from "../protocols/wayland.xml.ts";
import { zwp_xwayland_keyboard_grab_v1 } from "./zwp_xwayland_keyboard_grab_v1.ts";

export class zwp_xwayland_keyboard_grab_manager_v1 implements d {
  zwp_xwayland_keyboard_grab_manager_v1_destroy: d["zwp_xwayland_keyboard_grab_manager_v1_destroy"] =
    (s, object_id) => {
      s.remove_global_bind(
        Global_Ids.zwp_xwayland_keyboard_grab_manager_v1,
        object_id
      );
      return true;
    };
  zwp_xwayland_keyboard_grab_manager_v1_grab_keyboard: d["zwp_xwayland_keyboard_grab_manager_v1_grab_keyboard"] =
    (s, _object_id, id, _surface, _seat) => {
      s.add_object(id, zwp_xwayland_keyboard_grab_v1.make());
      /**
       * @TODO grab the keyboard
       */
    };
  zwp_xwayland_keyboard_grab_manager_v1_on_bind: d["zwp_xwayland_keyboard_grab_manager_v1_on_bind"] =
    (_s, _name, _interface_, _new_id, _version_number) => {};
}

export function make_zwp_xwayland_keyboard_grab_manager_v1() {
  const { zwp_xwayland_keyboard_grab_manager_v1: ZwpXwaylandKeyboardGrabManagerV1Protocol } = require("../protocols/wayland.xml.ts");
  return new ZwpXwaylandKeyboardGrabManagerV1Protocol(new zwp_xwayland_keyboard_grab_manager_v1());
}
