import { auto_release } from "../auto_release.ts";
import {
  wl_subcompositor_delegate,
  wl_subcompositor_error,
} from "../protocols/wayland.xml.ts";
import { wl_subsurface } from "./wl_subsurface.ts";

export class wl_subcompositor implements wl_subcompositor_delegate {
  /**
   * wl_subcompositor
   */

  wl_subcompositor_destroy: wl_subcompositor_delegate["wl_subcompositor_destroy"] =
    auto_release;
  wl_subcompositor_get_subsurface: wl_subcompositor_delegate["wl_subcompositor_get_subsurface"] =
    (s, object_id, id, surface_id, parent_surface_id) => {
      const surface = s.get_object(surface_id)?.delegate;
      if (!surface) {
        s.send_error(
          object_id,
          wl_subcompositor_error.bad_surface,
          "surface not found"
        );
        return;
      }
      if (surface.role === null) {
        surface.role = {
          type: "sub_surface",
          data: null,
        };
      }
      if (surface.role.type !== "sub_surface") {
        s.send_error(
          object_id,
          wl_subcompositor_error.bad_surface,
          `surface ${surface_id} has role ${surface.role.type} instead of sub_surface`
        );
        return;
      }
      if (surface.role.data !== null) {
        s.send_error(
          object_id,
          wl_subcompositor_error.bad_surface,
          `surface ${surface_id} already is a subsurface`
        );
        return;
      }

      if (surface_id == parent_surface_id) {
        s.send_error(
          object_id,
          wl_subcompositor_error.bad_parent,
          "parent == surface"
        );
        return;
      }
      if (s.find_descendant_surface(surface_id, parent_surface_id)) {
        s.send_error(
          object_id,
          wl_subcompositor_error.bad_parent,
          "parent is a descendant of surface"
        );
        return;
      }
      const parent_surface = s.get_object(parent_surface_id)?.delegate;

      if (!parent_surface) {
        s.send_error(
          object_id,
          wl_subcompositor_error.bad_parent,
          "parent not found"
        );
        return;
      }

      surface.role.data = id;

      parent_surface.pending_update.add_sub_surface ??= [];
      parent_surface.pending_update.add_sub_surface.push(surface_id);
      s.register_role_to_surface(id, surface_id);

      s.add_object(id, wl_subsurface.make(parent_surface_id));
    };

  wl_subcompositor_on_bind: wl_subcompositor_delegate["wl_subcompositor_on_bind"] =
    (_s, _name, _interface_, _new_id, _version) => {};

}

export function make_wl_subcompositor() {
  const { wl_subcompositor: WlSubcompositorProtocol } = require("../protocols/wayland.xml.ts");
  return new WlSubcompositorProtocol(new wl_subcompositor());
}
