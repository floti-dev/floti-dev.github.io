/* Runs in the head, before the first paint: marks that scripts run, so the
 * controls that need a script (the copy button, the demos' controls) show
 * only when they will work, without a flash. */
document.documentElement.classList.add('js');
