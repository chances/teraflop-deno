all: ffi
	dub build

.PHONY: ffi
ffi:
	dub build -b ffi
	@rm -rf dox

.PHONY: lint
lint:
	dub lint --style-check

.PHONY: format
format:
# FIXME:
	false
# 	dub run dfmt -- --brace_style stroustrup -i -c ..
# 	dub run dfmt -- -i -c ..
