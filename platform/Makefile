all:
	dub build

###############
# Subprojects #
###############

.PHONY: c2ffi
c2ffi: subprojects/c2ffi/build/c2ffi.exe

subprojects/c2ffi/build/c2ffi.exe: subprojects/c2ffi/CMakeLists.txt
	cmake -B subprojects/c2ffi/build subprojects/c2ffi

subprojects/c2ffi/CMakeLists.txt:
	git submodule update --init --recursive

###############
# Phony tasks #
###############

.PHONY: lint
lint:
	dub lint --style-check

.PHONY: format
format:
# FIXME:
	false
# 	dub run dfmt -- --brace_style stroustrup -i -c ..
# 	dub run dfmt -- -i -c ..
