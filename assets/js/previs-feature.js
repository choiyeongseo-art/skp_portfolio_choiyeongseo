(() => {
  const dialog = document.querySelector('[data-previs-dialog]');
  if (!dialog || !dialog.showModal) return;
  const frame = dialog.querySelector('[data-previs-frame]');
  const closeButton = dialog.querySelector('[data-previs-close]');
  let trigger;
  let previousOverflow;
  // Links still open a standalone tab without JavaScript or with modifier keys.
  document.querySelectorAll('[data-previs-popup]').forEach(link => {
    link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      trigger = link;
      previousOverflow = document.body.style.overflow;
      frame.src = link.href;
      dialog.showModal();
      document.body.style.overflow = 'hidden';
      closeButton.focus();
    });
  });
  closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right ||
        event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    // Release the renderer and uploaded scene when the editor is dismissed.
    frame.removeAttribute('src');
    document.body.style.overflow = previousOverflow;
    trigger?.focus();
  });
})();
