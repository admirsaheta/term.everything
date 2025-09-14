import { auto_release } from "../auto_release.ts";
import {
  wl_touch_delegate as d,
} from "../protocols/wayland.xml.ts";

export class wl_touch implements d {
  wl_touch_release: d["wl_touch_release"] = auto_release;
  wl_touch_on_bind: d["wl_touch_on_bind"] = (
    _s,
    _name,
    _interface_,
    _new_id,
    _version_number
  ) => {
    /** @TODO: Implement wl_touch_on_bind */
  };
}

export function make_wl_touch() {
  const { wl_touch: WlTouchProtocol } = require("../protocols/wayland.xml.ts");
  return new WlTouchProtocol(new wl_touch());
}
