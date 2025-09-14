import { auto_release } from "../auto_release.ts";
import {
  xdg_wm_base_delegate,
  xdg_wm_base_error,
} from "../protocols/wayland.xml.ts";
import { version } from "../wayland_types.ts";
import { xdg_positioner } from "./xdg_positioner.ts";
import { xdg_surface } from "./xdg_surface.ts";

export class xdg_wm_base implements xdg_wm_base_delegate {
  version: version = 1;

  /**
   * xdg_wm_base methods
   */
  xdg_wm_base_destroy: xdg_wm_base_delegate["xdg_wm_base_destroy"] =
    auto_release;
  xdg_wm_base_create_positioner: xdg_wm_base_delegate["xdg_wm_base_create_positioner"] =
    (s, _object_id, id) => {
      s.add_object(id, xdg_positioner.make());
    };
  xdg_wm_base_get_xdg_surface: xdg_wm_base_delegate["xdg_wm_base_get_xdg_surface"] =
    (s, object_id, xdg_surface_id, surface_id) => {
      const surface = s.get_object(surface_id)?.delegate;
      if (!surface) {
        s.send_error(object_id, xdg_wm_base_error.role, "surface not found");
        return;
      }
      if (surface.role) {
        /**
         * It is illegal to create an xdg_surface for a wl_surface which already has
         * a assigned role
         */
        console.error(
          `xdg_surface@${xdg_surface_id} Assigning xdg_surface to surface with role`,
          surface.role
        );
        s.send_error(
          object_id,
          xdg_wm_base_error.role,
          "surface already has a role"
        );
        return;
      }
      surface.xdg_surface_state = xdg_surface_id;

      // surface.xdg_surface_state = {
      //   on_configure: new Map(),
      //   latest_configure_serial: 0,
      //   xdg_surface_id: xdg_surface_id,
      //   window_geometry: { x: 0, y: 0, width: 0, height: 0 },
      // };

      s.register_role_to_surface(xdg_surface_id, surface_id);

      s.add_object(
        xdg_surface_id,
        xdg_surface.make(this.version, xdg_surface_id)
      );
    };
  xdg_wm_base_pong: xdg_wm_base_delegate["xdg_wm_base_pong"] = (
    _s,
    _object_id,
    _serial
  ) => {};
  xdg_wm_base_on_bind: xdg_wm_base_delegate["xdg_wm_base_on_bind"] = (
    _s,
    _name,
    _interface_,
    _new_id,
    version
  ) => {
    this.version = version;
  };
}

export function make_xdg_wm_base() {
  const { xdg_wm_base: XdgWmBaseProtocol } = require("../protocols/wayland.xml.ts");
  return new XdgWmBaseProtocol(new xdg_wm_base());
}
