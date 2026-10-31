// ============================================
// Personal Profile — Futuristic Editable
// Phase 3: Magnetic Buttons, Motion & Content
// ============================================

(function() {
  'use strict';

  // ---------- Default Content ----------
  const defaults = {
    logo: 'V',
    links: 'About, Work, Writing, Contact',
    hero1: 'VIN UIX',
    hero2: '',
    hero3: 'Portfolio',
    heroSub: "I'm Vinnyrz — a designer-developer hybrid who cares about the details most people never notice but everyone feels.",
    marquee: 'Product Design, Front-End Development, Design Systems, Prototyping, Creative Direction',
    aboutLead: "I've spent the last 8 years at the intersection of design and code — where most people see a handoff, I see a conversation.",
    aboutBody: 'My work lives in the space between what something looks like and how it actually works. I believe good design is invisible until it\'s missing, and great engineering is the same.',
    status: 'Available for freelance',
    location: 'Portland, OR',
    email: "Hello People's"
  };

  // ---------- Load from localStorage ----------
  function loadContent() {
    const saved = localStorage.getItem('profileContent');
    return saved ? JSON.parse(saved) : { ...defaults };
  }

  function saveContent(content) {
    localStorage.setItem('profileContent', JSON.stringify(content));
  }

  let content = loadContent();

  // ---------- Apply content to DOM ----------
  let navInitialized = false;

  function applyContent() {
    document.getElementById('navLogo').textContent = content.logo;
    document.getElementById('heroLine1').textContent = content.hero1;
    document.getElementById('heroLine3').textContent = content.hero3;
    document.getElementById('heroSub').textContent = content.heroSub;
    document.getElementById('aboutLead').textContent = content.aboutLead;
    document.getElementById('aboutBody').textContent = content.aboutBody;
    document.getElementById('statusText').textContent = content.status;
    document.getElementById('locationText').textContent = content.location;
    document.getElementById('contactEmail').textContent = content.email;

    const footerEmail = document.getElementById('footerEmail');
    footerEmail.textContent = content.email;
    footerEmail.href = `mailto:${content.email}`;
    document.getElementById('footerLocation').textContent = content.location;

    // Nav links
    const links = content.links.split(',').map(l => l.trim()).filter(l => l);
    const navLinks = document.getElementById('navLinks');
    const sectionIds = ['about', 'work', 'writing', 'contact'];
    navLinks.innerHTML = links.map((link, i) => {
      const href = sectionIds[i] ? `#${sectionIds[i]}` : '#';
      return `<a href="${href}" class="nav-link">${link}</a>`;
    }).join('');

    // Only let the links slide in on first paint; edits shouldn't replay it.
    if (navInitialized) {
      navLinks.querySelectorAll('.nav-link').forEach(link => link.classList.add('entered'));
    }
    navInitialized = true;

    // Marquee
    const marqueeItems = content.marquee.split(',').map(m => m.trim()).filter(m => m);
    const marqueeHTML = [];
    for (let i = 0; i < 2; i++) {
      marqueeItems.forEach(item => {
        marqueeHTML.push(`<span>${item}</span><span class="sep">✦</span>`);
      });
    }
    document.getElementById('marqueeTrack').innerHTML = marqueeHTML.join('');

    // Update edit panel inputs
    document.getElementById('editLogo').value = content.logo;
    document.getElementById('editLinks').value = content.links;
    document.getElementById('editHero1').value = content.hero1;
    document.getElementById('editHero3').value = content.hero3;
    document.getElementById('editHeroSub').value = content.heroSub;
    document.getElementById('editMarquee').value = content.marquee;
    document.getElementById('editAboutLead').value = content.aboutLead;
    document.getElementById('editAboutBody').value = content.aboutBody;
    document.getElementById('editStatus').value = content.status;
    document.getElementById('editLocation').value = content.location;
    document.getElementById('editEmail').value = content.email;
  }

  applyContent();

  // ---------- Footer Local Time ----------
  const footerTime = document.getElementById('footerTime');
  const footerTimeFormat = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Los_Angeles'
  });

  function updateFooterTime() {
    footerTime.textContent = footerTimeFormat.format(new Date());
  }

  updateFooterTime();
  window.setInterval(updateFooterTime, 30000);

  // ---------- Edit Panel ----------
  const editToggle = document.getElementById('editToggle');
  const editPanel = document.getElementById('editPanel');
  const editClose = document.getElementById('editClose');
  const editReset = document.getElementById('editReset');

  editToggle.addEventListener('click', () => {
    editPanel.classList.toggle('open');
  });

  editClose.addEventListener('click', () => {
    editPanel.classList.remove('open');
  });

  // Save on input change
  const editFields = [
    'editLogo', 'editLinks', 'editHero1', 'editHero3',
    'editHeroSub', 'editMarquee', 'editAboutLead', 'editAboutBody',
    'editStatus', 'editLocation', 'editEmail'
  ];

  editFields.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    field.addEventListener('input', () => {
      const key = fieldId.replace('edit', '').toLowerCase();
      const keyMap = {
        'logo': 'logo',
        'links': 'links',
        'hero1': 'hero1',
        'hero3': 'hero3',
        'herosub': 'heroSub',
        'marquee': 'marquee',
        'aboutlead': 'aboutLead',
        'aboutbody': 'aboutBody',
        'status': 'status',
        'location': 'location',
        'email': 'email'
      };
      const mappedKey = keyMap[key];
      if (mappedKey) {
        content[mappedKey] = field.value;
        saveContent(content);
        applyContent();
      }
    });
  });

  // Reset
  editReset.addEventListener('click', () => {
    content = { ...defaults };
    saveContent(content);
    applyContent();
  });

  // ---------- Custom Cursor ----------
  const cursorDot = document.getElementById('cursorDot');
  const cursorRing = document.getElementById('cursorRing');
  let mouseX = 0, mouseY = 0;
  let ringX = 0, ringY = 0;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursorDot.style.left = mouseX + 'px';
    cursorDot.style.top = mouseY + 'px';
  });

  // Smooth ring follow
  function updateCursor() {
    ringX += (mouseX - ringX) * 0.12;
    ringY += (mouseY - ringY) * 0.12;
    cursorRing.style.left = ringX + 'px';
    cursorRing.style.top = ringY + 'px';
    requestAnimationFrame(updateCursor);
  }
  updateCursor();

  // Hover effects for interactive elements (delegated: nav links get rebuilt)
  const hoverSelector = 'a, button, .skill-card, .work-item, .writing-card, .testimonial-card, .fact, input, textarea';

  document.addEventListener('mouseover', (e) => {
    const el = e.target.closest(hoverSelector);
    if (!el || el.contains(e.relatedTarget)) return;
    cursorRing.classList.add('hover');
    cursorDot.style.width = '12px';
    cursorDot.style.height = '12px';
  });

  document.addEventListener('mouseout', (e) => {
    const el = e.target.closest(hoverSelector);
    if (!el || el.contains(e.relatedTarget)) return;
    cursorRing.classList.remove('hover');
    cursorDot.style.width = '8px';
    cursorDot.style.height = '8px';
  });

  // ---------- Magnetic Buttons ----------
  const magneticElements = document.querySelectorAll('.magnetic');
  const magneticStrength = 0.3;

  magneticElements.forEach(el => {
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      el.style.transform = `translate(${x * magneticStrength}px, ${y * magneticStrength}px)`;
    });

    el.addEventListener('mouseleave', () => {
      el.style.transform = 'translate(0, 0)';
    });
  });

  // ---------- Scroll Progress ----------
  const scrollProgress = document.getElementById('scrollProgress');

  window.addEventListener('scroll', () => {
    const scrollTop = window.pageYOffset;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = (scrollTop / docHeight) * 100;
    scrollProgress.style.width = progress + '%';
  }, { passive: true });

  // ---------- Nav: hide on scroll down, only show at top ----------
  const nav = document.getElementById('nav');
  let lastScroll = 0;

  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    document.body.classList.toggle('page-scrolled', currentScroll > 160);

    // Only show nav when at the very top
    if (currentScroll <= 100) {
      nav.classList.remove('hidden');
      return;
    }

    // Hide when scrolling down
    if (currentScroll > lastScroll) {
      nav.classList.add('hidden');
    }

    lastScroll = currentScroll;
  }, { passive: true });

  document.body.classList.toggle('page-scrolled', window.pageYOffset > 160);

  // ---------- Scroll Reveal ----------
  const revealElements = document.querySelectorAll(
    '.about-text, .about-facts, .skill-card, .work-item, .testimonial-card, .writing-card, .contact-title, .contact-sub, .contact-email, .contact-socials'
  );

  revealElements.forEach(el => el.classList.add('reveal'));

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  revealElements.forEach(el => revealObserver.observe(el));

  // ---------- Smooth scroll for nav links + Jello hover ----------
  // Delegated: applyContent() rebuilds the links whenever the edit panel changes.
  const navLinksEl = document.getElementById('navLinks');

  navLinksEl.addEventListener('animationend', function(e) {
    const link = e.target.closest('.nav-link');
    if (!link) return;

    if (e.animationName === 'slide-in-left') {
      link.classList.add('entered');
    }

    if (e.animationName === 'jello-horizontal') {
      link.classList.remove('jello');
    }
  });

  navLinksEl.addEventListener('mouseover', function(e) {
    const link = e.target.closest('.nav-link');
    if (!link || link.contains(e.relatedTarget)) return;

    link.classList.add('entered');
    link.classList.remove('jello');
    void link.offsetWidth; // Force reflow
    link.classList.add('jello');
  });

  navLinksEl.addEventListener('click', function(e) {
    const link = e.target.closest('.nav-link');
    if (!link) return;

    const targetId = link.getAttribute('href');
    if (!targetId || targetId === '#') return;

    const target = document.querySelector(targetId);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  // ---------- Blur-out on hero when the About section approaches ----------
  const heroTitle = document.querySelector('.hero-title');
  const heroSub = document.querySelector('.hero-sub');
  const heroGecko = document.querySelector('.hero-gecko');
  let ticking = false;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const aboutSection = document.getElementById('about');
        const aboutTop = aboutSection
          ? aboutSection.getBoundingClientRect().top + window.pageYOffset
          : window.innerHeight;

        if (window.pageYOffset > aboutTop - window.innerHeight * 0.5) {
          heroTitle.classList.add('blur-out');
          heroSub.classList.add('blur-out');
          heroGecko.classList.add('blur-out');
        } else {
          heroTitle.classList.remove('blur-out');
          heroSub.classList.remove('blur-out');
          heroGecko.classList.remove('blur-out');
        }
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  // ---------- Work item stagger on scroll ----------
  const workItems = document.querySelectorAll('.work-item');
  const workObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, i * 80);
        workObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  workItems.forEach(item => workObserver.observe(item));

  // ---------- Contact Form ----------
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
      e.preventDefault();

      const submitBtn = this.querySelector('.form-submit');
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = '<span>Sending...</span>';
      submitBtn.disabled = true;

      // Simulate form submission (replace with actual endpoint)
      setTimeout(() => {
        submitBtn.innerHTML = '<span>Message Sent ✓</span>';
        submitBtn.style.background = '#00FF88';

        setTimeout(() => {
          contactForm.reset();
          submitBtn.innerHTML = originalText;
          submitBtn.style.background = '';
          submitBtn.disabled = false;
        }, 2000);
      }, 1500);
    });
  }

  // ---------- Dynamic year in footer ----------
  const footerYear = document.querySelector('.footer span');
  if (footerYear) {
    footerYear.textContent = `© ${new Date().getFullYear()} Vinnyrz`;
  }

  // ---------- Console easter egg ----------
  console.log(
    '%cHey there! 👋\n%cLike what you see? Let\'s work together.\nHello People\'s',
    'font-size: 1.2rem; font-weight: bold; color: #00F0FF;',
    'font-size: 0.9rem; color: #8A8782;'
  );

})();
