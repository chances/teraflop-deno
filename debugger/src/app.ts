document.addEventListener('DOMContentLoaded', () => {
  const { width, height, colorDepth } = screen;
  // FIXME: window.moveTo(12, 12);

  const info = document.createElement('div');
  info.classList.add('info');
  info.innerText = navigator.vendor;
  document.body.append(info);
});
