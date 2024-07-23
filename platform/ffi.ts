import * as ffi from "@gnome/ffi";
import { assert } from "@std/assert";
import * as path from "@std/path";
import * as fs from "@std/fs";

/** Determine library prefix based on the OS. */
function libPrefix() {
  switch (Deno.build.os) {
    case "windows":
      return "";
    default:
      return "lib";
  }
}

/** Determine library extension based on the OS. */
function libSuffix() {
  switch (Deno.build.os) {
    case "windows":
      return "dll";
    case "darwin":
      return "dylib";
    default:
      return "so";
  }
}

// Open library and define exported symbols
const self = import.meta.url;
const libName = `${libPrefix()}teraflop-platform.${libSuffix()}`;
const libPath = path.normalize(
  path.join(path.dirname(self), `./lib/${libName}`)
);
console.log(`Loading Teraflop native platform support extensions...`);
assert(fs.exists(libPath), `File not found: ${libName}`);
console.debug(`Reading '${libPath}'`);
// FIXME: Could not open library: dlopen(./lib/libteraflop-platform.dylib, 0x0005)
const dylib = Deno.dlopen(libPath,
  // setIcon(char* filePath)
  { "setIcon": { parameters: ["pointer"], result: "bool" }} as const,
);
console.log(`Loaded.`);

export interface Icon {
  width: number;
  height: number;
  ptr: ffi.IntPtr;
}

// See https://github.com/gnomejs/sdk/tree/main/ffi#readme
export function setIcon(filePath: string) {
  const path = ffi.fromPwstr(filePath);
  assert(dylib.setIcon(ffi.createPointer(path)), `Could not set icon: ${filePath}`);
}
