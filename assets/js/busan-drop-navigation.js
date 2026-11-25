window.addEventListener('pagereveal', (event) => {
  const transition = event.viewTransition;
  if (!transition) return;

  const source = window.navigation?.activation?.from?.url;
  const links = [...document.querySelectorAll('.case-views .case-view')];
  const previous = source ? new URL(source) : null;
  const from = links.findIndex((link) => link.origin === previous?.origin && link.pathname === previous.pathname);
  const to = links.findIndex((link) => link.hasAttribute('aria-current'));

  if (from < 0 || to < 0 || from === to || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    transition.skipTransition();
    return;
  }

  const root = document.documentElement;
  root.dataset.caseDirection = from < to ? 'forward' : 'backward';
  const clearDirection = () => delete root.dataset.caseDirection;
  transition.finished.then(clearDirection, clearDirection);
});
