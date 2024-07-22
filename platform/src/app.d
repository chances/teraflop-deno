import std.stdio;

version (Library) enum isApp = false;
else enum isApp = true;

static if (isApp) void main() {
	writeln("Edit source/app.d to start your project.");
}
