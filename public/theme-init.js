(function() {
  try {
    var theme = localStorage.getItem('dubflow-theme');
    if (!theme) {
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      theme = prefersDark ? 'dark' : 'light';
    }
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.setAttribute('data-theme-ready', 'true');
  } catch (e) {}
})();
