import {
  wl_data_device_manager_delegate as d,
} from "../protocols/wayland.xml.ts";

import { wl_data_device } from "./wl_data_device.ts";
import { wl_data_source } from "./wl_data_source.ts";

export class wl_data_device_manager implements d {
  wl_data_device_manager_create_data_source: d["wl_data_device_manager_create_data_source"] =
    (s, _object_id, id) => {
      s.add_object(id, wl_data_source.make());
    };
  wl_data_device_manager_get_data_device: d["wl_data_device_manager_get_data_device"] =
    (s, _object_id, id, seat) => {
      s.add_object(id, wl_data_device.make(seat));
      /** @TODO: Implement wl_data_device_manager_get_data_device */
    };
  wl_data_device_manager_on_bind: d["wl_data_device_manager_on_bind"] = (
    _s,
    _name,
    _interface_,
    _new_id,
    _version_number
  ) => {
    /** @TODO: Implement wl_data_device_manager_on_bind */
  };
}

export function make_wl_data_device_manager() {
  const { wl_data_device_manager: WlDataDeviceManagerProtocol } = require("../protocols/wayland.xml.ts");
  return new WlDataDeviceManagerProtocol(new wl_data_device_manager());
}
