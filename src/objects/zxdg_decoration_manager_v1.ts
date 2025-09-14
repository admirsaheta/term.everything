import { Global_Ids } from "../GlobalObjects.ts";
import {
  zxdg_decoration_manager_v1_delegate as d,
  zxdg_toplevel_decoration_v1 as zxdg_toplevel_decoration_v1_t,
  zxdg_toplevel_decoration_v1_mode,
} from "../protocols/wayland.xml.ts";
import { zxdg_toplevel_decoration_v1 } from "./zxdg_toplevel_decoration_v1.ts";

export class zxdg_decoration_manager_v1 implements d {
  zxdg_decoration_manager_v1_destroy: d["zxdg_decoration_manager_v1_destroy"] =
    (s, object_id) => {
      s.remove_global_bind(Global_Ids.zxdg_decoration_manager_v1, object_id);
      return true;
    };
  zxdg_decoration_manager_v1_get_toplevel_decoration: d["zxdg_decoration_manager_v1_get_toplevel_decoration"] =
    (s, _object_id, decoration_id, toplevel) => {
      s.add_object(decoration_id, zxdg_toplevel_decoration_v1.make(toplevel));
      zxdg_toplevel_decoration_v1_t.configure(
        s,
        decoration_id,
        zxdg_toplevel_decoration_v1_mode.server_side
      );
    };
  zxdg_decoration_manager_v1_on_bind: d["zxdg_decoration_manager_v1_on_bind"] =
    (_s, _name, _interface_, _new_id, _version_number) => {};
}

export function make_zxdg_decoration_manager_v1() {
  const { zxdg_decoration_manager_v1: ZxdgDecorationManagerV1Protocol } = require("../protocols/wayland.xml.ts");
  return new ZxdgDecorationManagerV1Protocol(new zxdg_decoration_manager_v1());
}
