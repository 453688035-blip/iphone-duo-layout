(() => {
  const poses = {{poses}};
  const aliases = { outer: 'duo-outer-portrait', inner: 'duo-inner-landscape' };
  const body = document.body;
  const $ = id => document.getElementById(id);
  const root = document.querySelector('.app-shell');
  const [stage, viewport, fitBox, device, screen, frame, caption, bar, overlays, sheet, scrim, list, done] =
    ['dpStage','dpViewport','dpFit','dpDevice','dpScreen','dpFrame','dpCaption','dpBar','dpOverlays','tocSheet','tocScrim','tocList','tocClose'].map($);
  const brandButtons = [...bar.querySelectorAll('[data-dp-brand]')];
  const deviceGroups = [...bar.querySelectorAll('[data-dp-family]')];
  const lastPose = { apple: 'duo-outer-portrait', huawei: 'huawei-mate-x6-open' };
  function showBrand(brand) {
    for (const button of brandButtons) button.setAttribute('aria-pressed', String(button.dataset.dpBrand === brand));
    for (const group of deviceGroups) group.hidden = group.dataset.dpFamily !== brand;
  }
  const triggers = [$('tocBtn'), $('tocBtn2')];
  const navLinks = [...root.querySelectorAll('nav a[href^="#"]')];
  const anchorFor = link => {
    try { return $(decodeURIComponent(link.hash.slice(1))); }
    catch { return null; }
  };
  const anchors = navLinks.map(anchorFor).filter(Boolean);
  const mark = document.createComment('app-shell');
  root.before(mark);
  const overlayMarks = [scrim, sheet].map(node => {
    const spot = document.createComment(node.id);
    node.before(spot);
    return [node, spot];
  });
  let current = 'web';
  let opener = null;
  let opened = false;

  function metrics() {
    const host = current === 'web' ? document.scrollingElement : screen;
    const bounds = host === screen ? screen.getBoundingClientRect() : { top: bar.getBoundingClientRect().bottom + 8, width: 1 };
    const scale = host === screen ? bounds.width / screen.clientWidth : 1;
    const sticky = root.querySelector('.duo-topbar')?.offsetHeight || 0;
    return { host, scale, top: bounds.top + sticky * scale };
  }

  function readingAnchor() {
    const { host, scale, top } = metrics();
    if (host.scrollTop < 1) return {};
    const offset = node => (node.getBoundingClientRect().top - top) / scale;
    let node = anchors[0];
    for (const anchor of anchors) if (offset(anchor) <= 1) node = anchor;
    return { node, distance: node ? Math.max(0, -offset(node)) : 0 };
  }

  function scrollToAnchor(node, distance = 0, focus = false) {
    const { host, scale, top } = metrics();
    const index = anchors.indexOf(node);
    const next = index < 0 ? null : anchors[index + 1];
    if (next && distance > 0) {
      const span = (next.getBoundingClientRect().top - node.getBoundingClientRect().top) / scale;
      distance = Math.min(distance, Math.max(0, span - 2));
    }
    const desired = node ? host.scrollTop + (node.getBoundingClientRect().top - top) / scale + distance : 0;
    host.scrollTo({ top: desired, behavior: 'instant' });
    if (focus && node) {
      const hadTabindex = node.hasAttribute('tabindex');
      if (!hadTabindex) node.tabIndex = -1;
      node.focus({ preventScroll: true });
      if (!hadTabindex) node.addEventListener('blur', () => node.removeAttribute('tabindex'), { once: true });
    }
    updateCurrent();
  }

  function updateCurrent() {
    const { node } = readingAnchor();
    const active = node || anchors[0];
    for (const [index, link] of navLinks.entries()) {
      const selected = anchorFor(link) === active;
      link.classList.toggle('on', selected);
      list.children[index].classList.toggle('is-on', selected);
      for (const item of [link, list.children[index]]) {
        if (selected) item.setAttribute('aria-current', 'location');
        else item.removeAttribute('aria-current');
      }
    }
  }

  function open(trigger) {
    if (opened) return;
    opener = trigger;
    opened = true;
    body.classList.add('toc-open');
    sheet.hidden = scrim.hidden = false;
    list.scrollTop = 0;
    trigger.setAttribute('aria-expanded', 'true');
    done.focus({ preventScroll: true });
    root.inert = screen.inert = bar.inert = true;
    if (current !== 'web') triggers[1].inert = true;
  }

  function close(restoreFocus = true) {
    if (!opened) return;
    opened = false;
    root.inert = screen.inert = bar.inert = triggers[1].inert = false;
    sheet.hidden = scrim.hidden = true;
    body.classList.remove('toc-open');
    opener.setAttribute('aria-expanded', 'false');
    if (restoreFocus) opener.focus({ preventScroll: true });
    opener = null;
  }

  function follow(event) {
    if (event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const node = anchorFor(event.currentTarget);
    if (!node) return;
    event.preventDefault();
    close(false);
    // Replace the fragment without asking the browser to scroll ancestor containers.
    history.replaceState(history.state, '', event.currentTarget.hash);
    scrollToAnchor(node, 0, true);
  }

  for (const link of navLinks) {
    const copy = link.cloneNode(true);
    copy.removeAttribute('id');
    copy.classList.remove('on');
    copy.addEventListener('click', follow);
    link.addEventListener('click', follow);
    list.append(copy);
  }
  for (const trigger of triggers) trigger.addEventListener('click', () => open(trigger));
  done.addEventListener('click', () => close());
  scrim.addEventListener('click', () => close());
  document.addEventListener('keydown', event => {
    if (!opened) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'Tab') {
      const items = [...sheet.querySelectorAll('button, a[href]')];
      const from = event.shiftKey ? items[0] : items.at(-1);
      if (document.activeElement !== from) return;
      event.preventDefault();
      const to = event.shiftKey ? items.at(-1) : items[0];
      to.focus({ preventScroll: true });
      if (list.contains(to)) list.scrollTop = list.scrollHeight;
      else list.scrollTop = 0;
    }
  });

  // Cancel wheel/touch scrolling over the modal backdrop without moving focus
  // or changing the underlying device scroll container's size.
  for (const event of ['wheel', 'touchmove']) {
    scrim.addEventListener(event, e => e.preventDefault(), { passive: false });
  }

  function fit() {
    body.style.setProperty('--dp-bar-h', bar.offsetHeight + 'px');
    if (current === 'web') return;
    const scale = Math.max(.001, Math.min((viewport.clientWidth - 16) / device.offsetWidth,
      (viewport.clientHeight - 16) / device.offsetHeight));
    device.style.transform = `scale(${scale})`;
    fitBox.style.width = device.offsetWidth * scale + 'px';
    fitBox.style.height = device.offsetHeight * scale + 'px';
  }

  function applyPose(id) {
    id = aliases[id] ?? id;
    if (id === current || (id !== 'web' && !Object.hasOwn(poses,id))) return;
    const anchor = readingAnchor();
    const focused = document.activeElement;
    close(false);
    current = id;
    if (poses[id]) {
      const { family } = poses[id];
      lastPose[family] = id;
      showBrand(family);
    }
    body.dataset.dp = id;
    const active = [...bar.querySelectorAll('[data-dp-pose]')];
    for (const button of active) button.setAttribute('aria-pressed', String(button.dataset.dpPose === id));
    if (id === 'web') {
      mark.after(root);
      for (const [node, spot] of overlayMarks) spot.after(node);
      stage.hidden = true;
      body.classList.remove('dp-on');
    } else {
      const p = poses[id];
      if (root.parentNode !== screen) screen.append(root);
      for (const [node] of overlayMarks) if (node.parentNode !== overlays) overlays.append(node);
      device.dataset.pose = id;
      device.dataset.edge = p.edge;
      device.dataset.status = p.status;
      device.dataset.fold = p.fold;
      device.dataset.orientation = p.orientation;
      device.dataset.family = p.family;
      Object.assign(device.style, { width: p.art[0] + 'px', height: p.art[1] + 'px' });
      for (const [key, value] of Object.entries(p.vars)) device.style.setProperty('--dp-' + key, value);
      frame.src = p.image;
      frame.style.width = p.art[0] + 'px';
      frame.style.height = p.art[1] + 'px';
      frame.style.transform = p.rotation ? `rotate(${p.rotation}deg)` : '';
      const captionDetails = p.family === 'huawei'
        ? `${p.width} × ${p.height} CSS px · 模拟窗口`
        : `${p.width} × ${p.height} pt · ${p.fold === 'none' ? 'Apple 设计套件' : 'Apple 折叠布局导引'}`;
      caption.replaceChildren(Object.assign(document.createElement('b'), { textContent: p.label }), captionDetails);
      body.classList.add('dp-on');
      stage.hidden = false;
    }
    fit();
    scrollToAnchor(anchor.node, anchor.distance);
    if (root.contains(focused) && focused.getClientRects().length) focused.focus({ preventScroll: true });
    else if (stage.contains(focused)) active.find(b => b.dataset.dpPose === id)?.focus({ preventScroll: true });
  }

  bar.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (button?.dataset.dpBrand) applyPose(lastPose[button.dataset.dpBrand]);
    else if (button?.dataset.dpPose) applyPose(button.dataset.dpPose);
  });
  window.addEventListener('scroll', () => { if (current === 'web') updateCurrent(); }, { passive: true });
  screen.addEventListener('scroll', updateCurrent, { passive: true });
  window.addEventListener('resize', fit, { passive: true });
  if (window.ResizeObserver) new ResizeObserver(fit).observe(bar);
  bar.querySelector('[data-dp-pose=web]').setAttribute('aria-pressed', 'true');
  const initial = new URLSearchParams(location.search).get('pose');
  if (initial) applyPose(initial);
  fit();
  if (location.hash) {
    const link = navLinks.find(item => item.hash === location.hash);
    if (link) window.addEventListener('load', () => scrollToAnchor(anchorFor(link)), { once: true });
  }
  updateCurrent();
  window.__dpSetPose = applyPose;
})();
