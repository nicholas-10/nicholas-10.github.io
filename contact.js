(() => {
  const siteAssetBase = new URL('.', document.currentScript.src);
  const menuButton = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('.nav-links');
  menuButton.addEventListener('click', () => {
    const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!isOpen));
    navigation.classList.toggle('is-open', !isOpen);
  });
  navigation.addEventListener('click', (event) => {
    if (!event.target.closest('a')) return;
    menuButton.setAttribute('aria-expanded', 'false');
    navigation.classList.remove('is-open');
  });

  const safeProfileUrl = (value, allowedDomain) => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && (url.hostname === allowedDomain || url.hostname.endsWith(`.${allowedDomain}`)) ? url.href : '';
    } catch { return ''; }
  };

  fetch(new URL('data/bio.json', siteAssetBase))
    .then((response) => {
      if (!response.ok) throw new Error(`Could not load data/bio.json (${response.status})`);
      return response.json();
    })
    .then((bio) => {
      document.querySelectorAll('[data-site-name]').forEach((node) => { node.textContent = bio.name; });
      document.querySelector('.brand').setAttribute('aria-label', `${bio.name}, home`);
      document.title = `${bio.name} — Get in touch`;

      const note = document.querySelector('[data-bio-contact-note]');
      note.textContent = String(bio.contactNote || '').trim();
      note.hidden = !note.textContent;

      const email = String(bio.email || '').trim();
      const emailLink = document.querySelector('[data-bio-email]');
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        emailLink.href = `mailto:${email}`;
        emailLink.querySelector('[data-email-text]').textContent = email;
      } else {
        emailLink.remove();
      }

      document.querySelectorAll('[data-social-link]').forEach((link) => {
        const key = link.dataset.socialLink;
        const domain = key === 'linkedin' ? 'linkedin.com' : 'scholar.google.com';
        const url = safeProfileUrl(bio[`${key}Url`], domain);
        if (url) link.href = url;
        else {
          link.removeAttribute('href');
          link.removeAttribute('target');
          link.setAttribute('role', 'img');
        }
      });
    })
    .catch((error) => {
      console.error(error);
      document.querySelector('[data-bio-contact-note]').textContent = 'Contact details could not be loaded.';
      document.querySelector('[data-bio-email]').remove();
      document.querySelectorAll('[data-social-link]').forEach((link) => {
        link.removeAttribute('href');
        link.removeAttribute('target');
        link.setAttribute('role', 'img');
      });
    });
})();
