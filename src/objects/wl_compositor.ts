import {
  wl_compositor_delegate as d,
} from "../protocols/wayland.xml.ts";

import { wl_region } from "./wl_region.ts";
import { wl_surface as wl_surface_class } from "./wl_surface.ts";

export class wl_compositor implements d {
  wl_compositor_create_surface: d["wl_compositor_create_surface"] = (
    s,
    _object_id,
    id
  ) => {
    const surface = wl_surface_class.make();
    s.add_object(id, surface);

    // s.bound_compositor_info?.surfaces.set(id, new Surface_Info(surface, 1));
    // console.log("create surface", id);
    /**
     * @TODO check this code to see if it is needed
     */
    // s.get_global_binds(Global_Ids.wl_output)?.forEach((output_id) => {
    //   console.log("Output enter", output_id, id);
    //   wl_surface.enter(s, id, output_id);
    // });

    // s.get_global_binds(Global_Ids.wl_keyboard)?.forEach((keyboard_id) => {
    //   console.log("Keyboard enter", keyboard_id, id);
    //   wl_keyboard.enter(s, keyboard_id, 0, id, []);
    // });

    // s.get_global_binds(Global_Ids.wl_pointer)?.forEach((pointer_id) => {
    //   console.log("Pointer enter", pointer_id, id);
    //   wl_pointer.enter(
    //     s,
    //     pointer_id,
    //     Math.round(Math.random() * 10_000),
    //     id,
    //     0,
    //     0
    //   );
    //   wl_pointer.frame(s, pointer_id);
    // });
  };
  wl_compositor_create_region: d["wl_compositor_create_region"] = (
    s,
    _object_id,
    id
  ) => {
    s.add_object(id, wl_region.make());
  };

  wl_compositor_on_bind: d["wl_compositor_on_bind"] = (
    s,
    _name,
    _interface_,
    _new_id,
    version
  ) => {
    s.compositor_version = version;

    return;
  };

}

export function make_wl_compositor() {
  const { wl_compositor: WlCompositorProtocol } = require("../protocols/wayland.xml.ts");
  return new WlCompositorProtocol(new wl_compositor());
}
