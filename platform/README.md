# Teraflop Platform Integration Support

A small, cross-platform library exposing a C API for platform and desktop integrations.

## Development

1. Initialize and update subprojects: `git submodule update --init --recursive`
2. Ensure clang is installed:
  - mac OS: No action needed. (mac OS comes bundled with clang)
  - Windows: `choco install vscode-cpptools` (In an administrative terminal.)

      Add directory of the LLVM binaries to your `PATH`, e.g. `%USERHOME%\.vscode\extensions\ms-vscode.cpptools-1.20.5-win32-x64\LLVM\bin`

  - Linux: `brew install llvm`
3. `cmake -B subprojects/c2ffi/build subprojects/c2ffi`
