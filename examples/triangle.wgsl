struct Fragment {
  @builtin(position) pos: vec4f,
  color: vec4f
}

@vertex
fn vs(@location(0) pos: vec3f, @location(1) color: vec4f) -> Fragment {
  return Fragment(pos, color);
}

@fragment
fn fs(frag: Fragment) -> @location(0) vec4f {
  return frag.color;
}
