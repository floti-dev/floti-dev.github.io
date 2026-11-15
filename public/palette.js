/* Runs in the head, before the first paint: marks that scripts run and
 * applies the visitor's saved palette, so the page never flashes one palette
 * before switching to the other. Without a saved choice the page keeps the
 * palette its html element names (Gold on the home page, Sky on the install
 * guide). The tab's icon follows the palette too: of the
 * head's two icon links, only the matching one is left on. */
(function () {
  var root = document.documentElement;
  root.classList.add('js');
  var palette = root.getAttribute('data-palette') === 'sky' ? 'sky' : 'gold';
  try {
    var saved = localStorage.getItem('floti-palette');
    if (saved === 'gold' || saved === 'sky') palette = saved;
  } catch (e) {
    /* storage blocked: the page's own palette */
  }
  root.setAttribute('data-palette', palette);
  var icons = document.querySelectorAll('link[data-palette-icon]');
  for (var i = 0; i < icons.length; i++) {
    icons[i].media = icons[i].getAttribute('data-palette-icon') === palette ? 'all' : 'not all';
  }
})();
