(function () {
  const placeholder = document.getElementById('nav-placeholder');
  if (!placeholder) return;

  const base = document.currentScript
    ? document.currentScript.src.replace(/nav-loader\.js$/, '')
    : 'component/';

  fetch(base + 'nav.html')
    .then(function (r) { return r.text(); })
    .then(function (html) {
      placeholder.innerHTML = html;
      // innerHTML doesn't execute <script> tags — clone and re-insert each one
      placeholder.querySelectorAll('script').forEach(function (old) {
        var fresh = document.createElement('script');
        Array.from(old.attributes).forEach(function (a) {
          fresh.setAttribute(a.name, a.value);
        });
        fresh.textContent = old.textContent;
        old.parentNode.replaceChild(fresh, old);
      });
    });
})();
