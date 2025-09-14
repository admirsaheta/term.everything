import { wl_shm_pool } from "./protocols/wayland.xml.ts";
import { File_Descriptor, Object_ID } from "./wayland_types.ts";

export type Client_State = object & {
  __brand: "Client_State";
};

export type Draw_State = object & {
  __brand: "Draw_State";
};

export interface C_Interop {
  set_raw_mode(): void;
  reset_mode(): void;

  listen_to_wayland_socket(socket_name: string): number | null;

  get_socket_path_from_name(socket_name: string): string;
  close_wayland_socket(
    socket_name: string,
    socket_file_descriptor: number
  ): undefined;
  listen_for_client(
    socket_file_descriptor: number,
    /**
     * error: null
     * client_socket: number, -1 on error
     * client_state all the cpp state for
     * this client. It will be garbage collected
     * so keep a reference to it until you
     * are done with the client. (just
     * put it in the client object)
     */
    on_client_connect: (
      error: null,
      client_socket: number,
      client_state: Client_State
    ) => undefined
  ): undefined;

  /**
   * Will close the socket if should_continue is false.
   *
   * If bytes read = 0 and should_continue = true,
   * then the client has timed out.
   * @param client_socket
   * @param buffer
   * @param fd_buffer
   * @param on_message_or_timeout
   */
  get_message_and_file_descriptors(
    client_socket: number,
    buffer: Uint8Array,
    fd_buffer: Uint32Array,
    on_message_or_timeout: on_get_message_and_file_descriptors
  ): undefined;

  send_message_and_file_descriptors(
    client_socket: number,
    buffer: Uint8Array,
    fd_buffer: Uint32Array,
    on_send_message: on_send_message
  ): undefined;
  /**
   * MMaps the file_descriptor into memory
   * @param client_state
   * @param fd
   * @param size
   * @param shm_pool_id
   * @returns true if successful, false if not
   */
  mmap_shm_pool(
    client_state: Client_State,
    fd: File_Descriptor,
    size: number,
    shm_pool_id: Object_ID<wl_shm_pool>
  ): boolean;

  /**
   *
   * @param client_state
   * @param shm_pool_id
   * @param new_size
   * @returns true if successful, false if not
   */
  remap_shm_pool(
    client_state: Client_State,
    shm_pool_id: Object_ID<wl_shm_pool>,
    new_size: number
  ): boolean;

  /**
   * Unmaps the shared memory pool
   * and closes the file descriptor.
   *
   * Client_state will close all of
   * these things on destruction,
   * (ie garbage collection) so
   * don't worry about cleanup while
   * at destruction time. (just worry
   * about cleanup while the clients
   * are living)
   * @param client_state
   * @param shm_pool_id
   */
  unmmap_shm_pool(
    client_state: Client_State,
    shm_pool_id: Object_ID<wl_shm_pool>
  ): undefined;

  /**
   * @returns true if successful, false if not
   */
  get_fd(
    path: string,
    flags: number
  ): { fd: File_Descriptor; size: number } | null;

  /**
   *
   * @returns true on success, false on failure
   */
  memcopy_buffer_to_uint8array(
    client_state: Client_State,
    pool_id: Object_ID<wl_shm_pool>,
    pool_offset: number,
    destination: Uint8ClampedArray,
    flip_colors: boolean
  ): boolean;

  draw_desktop(
    draw_state: Draw_State,
    desktop: Buffer,
    width: Pixels,
    height: Pixels,
    status_line: string
  ): {
    width_cells: Cells;
    height_cells: Cells;
  };

  init_draw_state(session_type_is_x11: boolean): Draw_State;
  
  // macOS-specific functions
  get_display_info(): any;
  capture_display(display_id?: number): any;
  launch_application(bundle_id: string): any;
  
  // Desktop streaming functions
  start_desktop_stream(width: number, height: number, callback: (data: Buffer, width: number, height: number, size: number) => void): boolean;
  stop_desktop_stream(): boolean;
  is_desktop_streaming(): boolean;
  set_stream_quality(quality: number): boolean;
}

export enum Get_FD_Flags {
  /**
   * Access mode flags
   */
  O_RDONLY = 0x0000 /* Open for reading only */,
  O_WRONLY = 0x0001 /* Open for writing only */,
  O_RDWR = 0x0002 /* Open for reading and writing */,

  /* File creation flags  */
  O_CREAT = 0x0040 /* Create file if it doesn't exist */,
  O_EXCL = 0x0080 /* Error if O_CREAT and file exists */,
  O_NOCTTY = 0x0100 /* Don't make terminal device controlling terminal */,
  O_TRUNC = 0x0200 /* Truncate file to length 0 if opened for writing */,

  /* File status flags */
  O_APPEND = 0x0400 /* Append on each write */,
  O_NONBLOCK = 0x0800 /* Non-blocking mode */,
  O_DSYNC = 0x1000 /* Synchronized I/O data integrity */,
  O_SYNC = 0x101000 /* Synchronized I/O file integrity */,
  O_DIRECT = 0x4000 /* Direct disk access  */,
  O_LARGEFILE = 0x8000 /* Large file access */,
  O_DIRECTORY = 0x10000 /* Must be a directory */,
  O_NOFOLLOW = 0x20000 /* Don't follow symlinks */,
  O_NOATIME = 0x40000 /* Don't update access time */,
  O_CLOEXEC = 0x80000 /* Close on exec */,
  O_PATH = 0x200000 /* Path only - do not open file */,
  O_TMPFILE = 0x410000 /* Create unnamed temporary file */,
}

export type mmaped_buffer_pointer = object & {
  __brand: "mmaped_buffer_pointer";
};

export type on_send_message = (
  error: null,
  should_continue: boolean,
  bytes_written: number
) => undefined;

export type on_get_message_and_file_descriptors = (
  error: null,
  should_continue: boolean,
  bytes_read: number,
  number_of_file_descriptors: number
) => undefined;
//@ts-ignore
import c_interop_ from "./c_interop.cjs";
import { Cells, Pixels } from "./Terminal_Window.ts";

export default c_interop_ as C_Interop;
