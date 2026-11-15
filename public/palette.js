/* Runs in the head, before the first paint: marks that scripts run and
 * applies the visitor's saved palette, so the page never flashes Gold
 * before switching to Sky. */
(function () {
  var root = document.documentElement;
  root.classList.add('js');
  try {
    var saved = localStorage.getItem('floti-palette');
    if (saved === 'gold' || saved === 'sky') root.setAttribute('data-palette', saved);
  } catch (e) {
    /* storage blocked: Gold */
  }
})();
