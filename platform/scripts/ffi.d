import std.process;
import std.stdio;

void main() {
  import std.algorithm : filter, map;
  import std.array : array;
  import std.conv : to;
  import std.file : copy, dirEntries, readText, SpanMode, write;
  import std.path : baseName, dirName, chainPath, stripExtension;
  import std.string : endsWith, replace, strip;

  auto gitRevCmd = execute(["git", "describe", "--tags", "--abbrev=0"]);
  const DUB_VERSION = gitRevCmd.status != 0 ? "v0.1.0" : gitRevCmd.output.strip;

  auto documents = dirEntries("docs", SpanMode.depth).filter!(
    entry => entry.isFile && entry.name.endsWith(".html")
  ).map!(entry => entry.name);

  foreach (string document; documents) {
    const rewrittenName = chainPath(document.dirName, document.baseName.stripExtension ~ ".json").array.to!string;
    write(rewrittenName, document.readText.replace("\\", "\\\\").replace("{{ DUB_VERSION }}", DUB_VERSION));
  }
}
