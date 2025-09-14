import {
  wl_keyboard_delegate as d,
  wl_keyboard_keymap_format,
} from "../protocols/wayland.xml.ts";
import { Wayland_Client } from "../Wayland_Client.ts";
import c, { Get_FD_Flags } from "../c_interop.ts";
import { File_Descriptor, Object_ID } from "../wayland_types.ts";
//@ts-ignore
import server_file from "../../resources/server-1.xkb" with { type: "file" };
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { auto_release } from "../auto_release.ts";

export class wl_keyboard implements d {
  key_map_fd: Promise<{ fd: File_Descriptor; size: number } | null>;
  constructor() {
    const temp_dir = mkdtempSync(tmpdir() + "/");
    const temp_file_name = temp_dir + "/server-1.xkb";
    this.key_map_fd = Bun.file(temp_file_name)
      .write(Bun.file(server_file))
      .then(() => {
        return c.get_fd(temp_file_name, Get_FD_Flags.O_RDONLY);
      });
  }

  wl_keyboard_release: d["wl_keyboard_release"] = auto_release;
  wl_keyboard_on_bind: d["wl_keyboard_on_bind"] = (
    _s,
    _name,
    _interface_,
    _new_id,
    _version
  ) => {};

  after_get_keyboard = async (s: Wayland_Client, object_id: Object_ID<any>) => {
    const fd_info = await this.key_map_fd;
    if (fd_info === null) {
      console.error("key_map_fd is null");
      return;
    }
    const { wl_keyboard: WlKeyboardProtocol } = require("../protocols/wayland.xml.ts");
    WlKeyboardProtocol.keymap(
      s,
      object_id,
      wl_keyboard_keymap_format.xkb_v1,
      fd_info.fd,
      fd_info.size
    );
  };

}

export function make_wl_keyboard() {
  const { wl_keyboard: WlKeyboardProtocol } = require("../protocols/wayland.xml.ts");
  return new WlKeyboardProtocol(new wl_keyboard());
}
