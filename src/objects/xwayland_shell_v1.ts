import { Global_Ids } from "../GlobalObjects.ts";
import {
  xwayland_shell_v1_delegate as d,
  xwayland_shell_v1_error,
} from "../protocols/wayland.xml.ts";

import { xwayland_surface_v1 } from "./xwayland_surface_v1.ts";

export class xwayland_shell_v1 implements d {
  xwayland_shell_v1_destroy: d["xwayland_shell_v1_destroy"] = (
    s,
    object_id
  ) => {
    s.remove_global_bind(Global_Ids.xwayland_shell_v1, object_id);
    return true;
  };
  xwayland_shell_v1_get_xwayland_surface: d["xwayland_shell_v1_get_xwayland_surface"] =
    (s, object_id, id, surface_id) => {
      const surface = s.get_object(surface_id)?.delegate;
      if (surface === undefined) {
        console.error(
          `xwayland_shell_v1_get_xwayland_surface: surface not found`
        );
        s.send_error(
          object_id,
          xwayland_shell_v1_error.role,
          "surface not found"
        );
        return;
      }
      if (!surface.role) {
        surface.role = {
          type: "xwayland_surface_v1",
          data: null,
        };
      }
      if (surface.role.type !== "xwayland_surface_v1") {
        s.send_error(
          object_id,
          xwayland_shell_v1_error.role,
          "surface already has a role"
        );
      }
      const xwayland_surface = surface.role.data;
      if (xwayland_surface !== null) {
        s.send_error(
          object_id,
          xwayland_shell_v1_error.role,
          "surface already has a role"
        );
        return;
      }
      s.add_object(id, xwayland_surface_v1.make());
    };
  xwayland_shell_v1_on_bind: d["xwayland_shell_v1_on_bind"] = (
    _s,
    _name,
    _interface_,
    _new_id,
    _version_number
  ) => {};
}

export function make_xwayland_shell_v1() {
  const { xwayland_shell_v1: XwaylandShellV1Protocol } = require("../protocols/wayland.xml.ts");
  return new XwaylandShellV1Protocol(new xwayland_shell_v1());
}
