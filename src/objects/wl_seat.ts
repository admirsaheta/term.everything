import { auto_release } from "../auto_release.ts";
import { Global_Ids, global_objects } from "../GlobalObjects.ts";
import {
  wl_seat_delegate as d,
  wl_seat_capability,
  wl_seat_error,
} from "../protocols/wayland.xml.ts";
import { version } from "../wayland_types.ts";

export class wl_seat implements d {
  version: version = 1;

  wl_seat_get_pointer: d["wl_seat_get_pointer"] = (s, _object_id, id) => {
    const pointer = global_objects.objects[Global_Ids.wl_pointer];

    s.add_global_bind(Global_Ids.wl_pointer, id, this.version);
    s.add_object(id, pointer);
  };
  wl_seat_get_keyboard: d["wl_seat_get_keyboard"] = (s, _object_id, id) => {
    const keyboard = global_objects.objects[Global_Ids.wl_keyboard];

    s.add_global_bind(Global_Ids.wl_keyboard, id, this.version);

    s.add_object(id, keyboard);

    keyboard.delegate.after_get_keyboard(s, id);
  };
  wl_seat_get_touch: d["wl_seat_get_touch"] = (s, object_id, _id) => {
    s.send_error(object_id, wl_seat_error.missing_capability, "no touch");
  };
  wl_seat_release: d["wl_seat_release"] = auto_release;
  wl_seat_on_bind: d["wl_seat_on_bind"] = (
    s,
    _name,
    _interface_,
    new_id,
    version
  ) => {
    this.version = version;
    const { wl_seat: WlSeatProtocol } = require("../protocols/wayland.xml.ts");
    WlSeatProtocol.capabilities(
      s,
      new_id,
      wl_seat_capability.pointer | wl_seat_capability.keyboard
    );
    WlSeatProtocol.name(s, version, new_id, "seat0");
  };
}

export const make_wl_seat = () => {
  const { wl_seat: WlSeatProtocol } = require("../protocols/wayland.xml.ts");
  return new WlSeatProtocol(new wl_seat());
};
