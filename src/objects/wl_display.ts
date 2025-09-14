import { advertised_global_objects_names } from "../GlobalObjects.ts";
import {
  wl_display_delegate as d,
  wl_registry as wl_registry_funcs,
  wl_callback,
} from "../protocols/wayland.xml.ts";
import { wl_registry } from "./wl_registry.ts";

export class wl_display implements d {
  wl_display_sync: d["wl_display_sync"] = (s, _object_id, callback) => {
    wl_callback.done(s, callback, 0);
  };
  wl_display_get_registry: d["wl_display_get_registry"] = (
    s,
    _object_id,
    registry
  ) => {
    const registry_object = wl_registry.make();
    s.objects.set(registry, registry_object);

    for (const { name, id, version } of advertised_global_objects_names) {
      wl_registry_funcs.global(s, registry, id, name, version);
    }
  };
  wl_display_on_bind: d["wl_display_on_bind"] = (
    _s,
    _name,
    _interface_,
    _id,
    _version
  ) => {};
}

export function make_wl_display() {
  const { wl_display: WlDisplayProtocol } = require("../protocols/wayland.xml.ts");
  return new WlDisplayProtocol(new wl_display());
}
