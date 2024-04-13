struct Fragment {
  @builtin(position) position: vec4f,
  @location(1) color: vec4f
}

@vertex
fn vs(@location(0) pos: vec3f, @location(1) color: vec4f) -> Fragment {
  var fragment: Fragment;
  fragment.color = color;
  return fragment;
}

@fragment
fn fs(fragment: Fragment) -> @location(0) vec4f {
  return fragment.color;
}
