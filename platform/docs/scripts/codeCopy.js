const codeBlocks = Array.from(document.querySelectorAll('pre > div.bug span.copy'));
codeBlocks.forEach(block => {
  const code = block.parentElement.parentElement.querySelector('code').innerText;
  const copyButton = document.createElement('button');
  copyButton.classList.add('copy');
  copyButton.title = 'Copy to clipboard';

  const copyIcon = document.createElement('img');
  copyIcon.classList.add('icon');
  copyIcon.src = '/images/content-copy.png';
  copyIcon.width = 16;
  copyIcon.alt = 'Copy';
  copyButton.append(copyIcon);

  const timeout = null;
  copyButton.addEventListener('click', () => {
    navigator.clipboard.writeText(code);
    copyButton.title = 'Copied!';
    copyButton.querySelector('img').src = '/images/check-bold-green.png';
    if (timeout !== null) clearTimeout(timeout);
    timeout = setTimeout(() => {
      copyButton.title = 'Copy to clipboard';
      copyIcon.src = '/images/content-copy.png';
    }, 3000);
  });
  block.append(copyButton);
});
