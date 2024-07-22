import * as ffi from "@gnome/ffi";

const buf = new Uint8Array([0x0])

const ptr = ffi.createPointer(buf);
console.log(ptr);
// See https://github.com/gnomejs/sdk/tree/main/ffi
