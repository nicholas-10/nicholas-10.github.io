    const siteAssetBase = new URL('.', document.currentScript.src);
    const menuButton = document.querySelector('.menu-toggle');
    const navigation = document.querySelector('.nav-links');
    menuButton.addEventListener('click', () => {
      const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
      menuButton.setAttribute('aria-expanded', String(!isOpen));
      navigation.classList.toggle('is-open', !isOpen);
    });
    navigation.addEventListener('click', (event) => {
      if (event.target.closest('a')) {
        menuButton.setAttribute('aria-expanded', 'false');
        navigation.classList.remove('is-open');
      }
    });
    document.querySelector('#year').textContent = new Date().getFullYear();
    const sections = document.querySelectorAll('main section[id]');
    const links = document.querySelectorAll('.nav-links a[href^="#"]');
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          links.forEach((link) => {
            if (link.getAttribute('href') === `#${entry.target.id}`) link.setAttribute('aria-current', 'location');
            else link.removeAttribute('aria-current');
          });
        });
      }, { rootMargin: '-30% 0px -60% 0px' });
      sections.forEach((section) => observer.observe(section));
    }

    const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);

    async function fetchData(path, format = 'json') {
      if (window.location.protocol === 'file:') {
        throw new Error('Data files cannot be fetched from file://. Start the local preview server instead.');
      }
      const response = await fetch(new URL(path, siteAssetBase));
      if (!response.ok) throw new Error(`Could not load ${path} (${response.status})`);
      return format === 'text' ? response.text() : response.json();
    }

    function renderBio(bio) {
      document.querySelectorAll('[data-site-name]').forEach((node) => { node.textContent = bio.name; });
      document.querySelector('.brand').setAttribute('aria-label', `${bio.name}, home`);
      document.title = `${bio.name} — ${bio.headline}`;
      document.querySelector('[data-bio-headline]').textContent = bio.headline;
      const introduction = Array.isArray(bio.introduction) ? bio.introduction : [bio.introduction];
      const paragraphs = introduction
        .flatMap((paragraph) => String(paragraph ?? '').split(/\n\s*\n/))
        .map((paragraph) => paragraph.replaceAll('{{name}}', bio.name).trim())
        .filter(Boolean);
      document.querySelector('meta[name="description"]').content = paragraphs.join(' ');
      document.querySelector('[data-bio-introduction]').innerHTML = paragraphs.map((paragraph) => `<p>${escapeHTML(paragraph)}</p>`).join('');
      const portrait = document.querySelector('[data-bio-portrait]');
      const portraitImage = portrait.querySelector('img');
      const portraitUrl = safeImageUrl(bio.portrait);
      const introRow = portrait.parentElement;
      portrait.hidden = true;
      introRow.classList.remove('has-portrait');
      if (portraitUrl) {
        portraitImage.alt = `${bio.name} portrait`;
        portraitImage.onload = () => {
          portrait.hidden = false;
          introRow.classList.add('has-portrait');
        };
        portraitImage.onerror = () => {
          portrait.hidden = true;
          introRow.classList.remove('has-portrait');
        };
        portraitImage.src = portraitUrl;
      } else {
        portraitImage.removeAttribute('src');
      }
      const emailLink = document.querySelector('[data-bio-email]');
      const email = String(bio.email || '').trim();
      if (emailLink) {
        emailLink.href = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? `mailto:${email}` : '#contact';
        emailLink.innerHTML = `${escapeHTML(email)} <span aria-hidden="true">↗</span>`;
      }
      const contactNote = document.querySelector('[data-bio-contact-note]');
      if (contactNote) {
        contactNote.textContent = String(bio.contactNote || '').trim();
        contactNote.hidden = !contactNote.textContent;
      }
      document.querySelectorAll('[data-social-link]').forEach((link) => {
        const host = link.dataset.socialLink === 'linkedin' ? 'linkedin.com' : 'scholar.google.com';
        const profileUrl = safeProfileUrl(bio[`${link.dataset.socialLink}Url`], host);
        if (profileUrl) link.href = profileUrl;
        else link.remove();
      });
    }

    function safeProfileUrl(value, allowedDomain) {
      try {
        const url = new URL(value);
        return url.protocol === 'https:' && (url.hostname === allowedDomain || url.hostname.endsWith(`.${allowedDomain}`)) ? url.href : '';
      } catch { return ''; }
    }

    function safeImageUrl(value) {
      if (!String(value || '').trim()) return '';
      try {
        const url = new URL(value, siteAssetBase);
        return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
      } catch { return ''; }
    }

    function renderExperience(groups) {
      const target = document.querySelector('#experience-list');
      const sections = [
        ['work', 'Work']
      ];
      target.innerHTML = sections.map(([key, label]) => {
        const entries = Array.isArray(groups?.[key]) ? groups[key] : [];
        const content = entries.length ? entries.map((entry) => `
          <article class="timeline-item">
            <div class="date">${escapeHTML(entry.period)}</div>
            <div><h4 class="role-title">${escapeHTML(entry.title)}</h4><p class="role-place">${escapeHTML(entry.organization)}${entry.location ? ` · ${escapeHTML(entry.location)}` : ''}</p></div>
          </article>`).join('') : `<p class="data-status">${label} experience will be added soon.</p>`;
        return `
          <section class="experience-group" aria-label="${label}">
            <h3 class="experience-subheading">${label}</h3>
            <div class="timeline">${content}</div>
          </section>`;
      }).join('');
    }

    function renderProjects(projects) {
      const target = document.querySelector('#project-list');
      target.innerHTML = projects.length ? projects.map((project) => `
        <article class="project-card">
          <div class="project-meta"><span>${escapeHTML(project.type)}</span></div>
          <h3>${escapeHTML(project.title)}</h3>
          <p>${escapeHTML(project.description)}</p>
          <div class="tags">${project.tags.map((tag) => `<span class="tag">${escapeHTML(tag)}</span>`).join('')}</div>
        </article>`).join('') : '<p class="data-status">Projects will be added soon.</p>';
    }

    function readBibValue(source, start) {
      const opening = source[start];
      if (opening === '"') {
        let value = '';
        for (let i = start + 1; i < source.length; i += 1) {
          if (source[i] === '\\' && i + 1 < source.length) { value += source.slice(i, i + 2); i += 1; }
          else if (source[i] === '"') return { value, end: i + 1 };
          else value += source[i];
        }
        return { value, end: source.length };
      }
      if (opening === '{') {
        let depth = 1;
        let value = '';
        for (let i = start + 1; i < source.length; i += 1) {
          if (source[i] === '\\' && i + 1 < source.length) { value += source.slice(i, i + 2); i += 1; }
          else if (source[i] === '{') { depth += 1; value += source[i]; }
          else if (source[i] === '}' && --depth === 0) return { value, end: i + 1 };
          else value += source[i];
        }
        return { value, end: source.length };
      }
      let end = start;
      while (end < source.length && source[end] !== ',' && source[end] !== '#' && source[end] !== '}') end += 1;
      return { value: source.slice(start, end).trim(), end };
    }

    function parseBibFields(source) {
      const fields = {};
      let cursor = 0;
      while (cursor < source.length) {
        while (/[\s,]/.test(source[cursor] || '')) cursor += 1;
        const name = source.slice(cursor).match(/^([\w-]+)\s*=/);
        if (!name) { cursor += 1; continue; }
        const field = name[1].toLowerCase();
        cursor += name[0].length;
        let value = '';
        let more = true;
        while (more) {
          while (/\s/.test(source[cursor] || '')) cursor += 1;
          const part = readBibValue(source, cursor);
          value += part.value;
          cursor = part.end;
          while (/\s/.test(source[cursor] || '')) cursor += 1;
          if (source[cursor] === '#') { cursor += 1; }
          else more = false;
        }
        fields[field] = value.trim();
        while (cursor < source.length && source[cursor] !== ',') cursor += 1;
        cursor += 1;
      }
      return fields;
    }

    function parseBibTeX(source) {
      const entries = [];
      const strings = {};
      const entryStart = /@([\w-]+)\s*([({])/g;
      let match;
      while ((match = entryStart.exec(source))) {
        const open = match[2];
        const close = open === '{' ? '}' : ')';
        let depth = 1;
        let inQuotes = false;
        let end = entryStart.lastIndex;
        for (; end < source.length; end += 1) {
          const character = source[end];
          if (character === '\\') { end += 1; continue; }
          if (character === '"') { inQuotes = !inQuotes; continue; }
          if (inQuotes) continue;
          if (character === open) depth += 1;
          if (character === close && --depth === 0) break;
        }
        if (depth !== 0) continue;
        const body = source.slice(entryStart.lastIndex, end);
        const type = match[1].toLowerCase();
        if (type === 'string') {
          const definitions = parseBibFields(body);
          const [name, value] = Object.entries(definitions)[0] || [];
          if (name) strings[name.toLowerCase()] = cleanBibText(value);
          entryStart.lastIndex = end + 1;
          continue;
        }
        const comma = body.indexOf(',');
        if (comma < 0) { entryStart.lastIndex = end + 1; continue; }
        entries.push({ type, fields: parseBibFields(body.slice(comma + 1)) });
        entryStart.lastIndex = end + 1;
      }
      return { entries, strings };
    }

    function cleanBibText(value) {
      return String(value || '').replace(/\\([&%_$#{}])/g, '$1').replace(/[{}]/g, '').replace(/~/g, ' ').replace(/\s+/g, ' ').trim();
    }

    function renderInlineLatex(value) {
      const source = String(value || '')
        .replace(/\\([&%_$#{}])/g, '$1')
        .replace(/\\\((.*?)\\\)|\$([^$]+)\$/g, (_, parenthesized, dollars) => parenthesized || dollars)
        .replace(/~/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const script = /([\^_])\{([^{}]+)\}|([\^_])([A-Za-z0-9])/g;
      let html = '';
      let cursor = 0;
      let match;
      while ((match = script.exec(source))) {
        html += escapeHTML(source.slice(cursor, match.index).replace(/[{}]/g, ''));
        const tag = (match[1] || match[3]) === '^' ? 'sup' : 'sub';
        const content = (match[2] || match[4]).replace(/[{}]/g, '');
        html += `<${tag}>${escapeHTML(content)}</${tag}>`;
        cursor = script.lastIndex;
      }
      html += escapeHTML(source.slice(cursor).replace(/[{}]/g, ''));
      return html;
    }

    function splitBibAuthors(value) {
      const authors = [];
      let depth = 0;
      let start = 0;
      for (let i = 0; i < value.length; i += 1) {
        if (value[i] === '\\') { i += 1; continue; }
        if (value[i] === '{') { depth += 1; continue; }
        if (value[i] === '}') { depth = Math.max(0, depth - 1); continue; }
        if (depth !== 0) continue;
        const separator = value.slice(i).match(/^\s+and\s+/i);
        if (separator && i > start) {
          authors.push(value.slice(start, i).trim());
          i += separator[0].length - 1;
          start = i + 1;
        }
      }
      authors.push(value.slice(start).trim());
      return authors.filter(Boolean);
    }

    function formatBibAuthor(value) {
      const name = cleanBibText(value);
      const parts = name.split(',').map((part) => part.trim()).filter(Boolean);
      if (parts.length === 2) return `${parts[1]} ${parts[0]}`;
      if (parts.length === 3) return `${parts[2]} ${parts[0]} ${parts[1]}`;
      return name;
    }

    function renderBibAuthor(name) {
      const formatted = formatBibAuthor(name);
      const safeName = escapeHTML(formatted);
      return formatted.toLocaleLowerCase() === 'nicholas axel tanujaya'
        ? `<strong>${safeName}</strong>`
        : safeName;
    }

    function safeHttpUrl(candidate) {
      if (!candidate) return '';
      try {
        const parsed = new URL(candidate);
        return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '';
      } catch { return ''; }
    }

    function publicationUrl(fields) {
      const candidate = fields.doi ? `https://doi.org/${fields.doi}` : fields.url;
      return safeHttpUrl(candidate);
    }

    function fullPaperUrl(fields) {
      const explicitUrl = fields.arxivurl || fields.arxiv;
      if (explicitUrl) return safeHttpUrl(explicitUrl);

      const archive = fields.archiveprefix || fields.eprinttype || '';
      const eprint = String(fields.eprint || '').trim();
      if (/^https?:\/\//i.test(eprint)) return safeHttpUrl(eprint);
      if (eprint && (archive.toLowerCase() === 'arxiv' || /^arxiv:/i.test(eprint))) {
        const identifier = eprint.replace(/^arxiv:\s*/i, '');
        const path = identifier.split('/').map(encodeURIComponent).join('/');
        return `https://arxiv.org/abs/${path}`;
      }
      return '';
    }

    function renderPublications(source) {
      const target = document.querySelector('#publication-list');
      const bib = parseBibTeX(source);
      const entries = bib.entries.map(({ fields }) => {
        const conferenceKey = cleanBibText(fields.conference).toLowerCase();
        const conferenceName = bib.strings[conferenceKey];
        return {
          title: cleanBibText(fields.title),
          year: cleanBibText(fields.year),
          order: /^\d+$/.test(cleanBibText(fields.order)) ? Number(cleanBibText(fields.order)) : null,
          authors: splitBibAuthors(fields.author || ''),
          alphabeticalAuthors: cleanBibText(fields.authororder).toLowerCase() === 'alphabetical',
          workingPaper: /^(true|yes|1)$/i.test(cleanBibText(fields.working)),
          conference: conferenceName ? {
            label: `${conferenceKey.toUpperCase()} ${cleanBibText(fields.year)}`,
            name: `${cleanBibText(fields.conferenceedition)} ${conferenceName}`.trim()
          } : null,
          venue: cleanBibText(fields.journal || fields.booktitle || fields.publisher),
          abstract: renderInlineLatex(fields.abstractnote || fields.abstract),
          url: publicationUrl(fields),
          fullPaperUrl: fullPaperUrl(fields)
        };
      }).filter((entry) => entry.title).sort((a, b) => {
        if (a.order !== null && b.order !== null) return b.order - a.order || b.year.localeCompare(a.year);
        if (a.order !== null) return -1;
        if (b.order !== null) return 1;
        return b.year.localeCompare(a.year);
      });
      target.innerHTML = entries.length ? entries.map((entry) => `
        <article class="publication">
          <div class="pub-year">${escapeHTML(entry.year)}</div>
          <div>
            ${entry.workingPaper ? '<span class="pub-type">Working paper</span>' : ''}
            <h3 class="pub-title">${entry.url ? `<a href="${escapeHTML(entry.url)}" target="_blank" rel="noreferrer">${escapeHTML(entry.title)}</a>` : escapeHTML(entry.title)}</h3>
            <p class="pub-details">${entry.alphabeticalAuthors ? '<strong class="author-order-mark" aria-label="alphabetical author ordering">(α)</strong> ' : ''}${entry.authors.map(renderBibAuthor).join(', ')}</p>
            ${entry.conference ? `<p class="pub-venue"><strong>${escapeHTML(entry.conference.label)}</strong>: ${escapeHTML(entry.conference.name)}</p>` : entry.venue ? `<p class="pub-venue">${escapeHTML(entry.venue)}</p>` : ''}
            ${entry.abstract ? `<details class="pub-abstract"><summary>Abstract</summary><p>${entry.abstract}</p></details>` : ''}
          </div>
          ${entry.url || entry.fullPaperUrl ? `<div class="pub-links">${entry.url ? `<a class="pub-link" href="${escapeHTML(entry.url)}" target="_blank" rel="noreferrer">Read paper ↗</a>` : ''}${entry.fullPaperUrl ? `<a class="pub-link" href="${escapeHTML(entry.fullPaperUrl)}" target="_blank" rel="noreferrer">Full Paper: arXiv ↗</a>` : ''}</div>` : ''}
        </article>`).join('') : '<p class="data-status">Publications will be added soon.</p>';
    }

    function showLoadError(selector, path) {
      const target = document.querySelector(selector);
      if (!target) return;
      const message = window.location.protocol === 'file:'
        ? 'Browsers block loading separate data files from file:// pages. Run sh serve.sh in the website folder, then open http://localhost:8000/.'
        : `Could not load ${path}. Check that the file exists and the site is being served from the webpage folder.`;
      target.innerHTML = `<p class="data-status">${escapeHTML(message)}</p>`;
    }

    function showBioLoadError(error) {
      console.error(error);
      const message = window.location.protocol === 'file:'
        ? 'Run sh serve.sh in the website folder and open http://localhost:8000/ to load the profile.'
        : `Could not load data/bio.json beside script.js (${new URL('data/bio.json', siteAssetBase).href}). Make sure the data folder is included in the deployed site. ${error?.message || ''}`;
      document.querySelector('[data-bio-introduction]').innerHTML = `<p>${escapeHTML(message)}</p>`;
    }

    fetchData('data/bio.json').then(renderBio).catch(showBioLoadError);
    fetchData('data/experience.json').then(renderExperience).catch((error) => { console.error(error); showLoadError('#experience-list', 'data/experience.json'); });
    fetchData('data/projects.json').then(renderProjects).catch((error) => { console.error(error); showLoadError('#project-list', 'data/projects.json'); });
    fetchData('data/publications.bib', 'text').then(renderPublications).catch((error) => { console.error(error); showLoadError('#publication-list', 'data/publications.bib'); });
