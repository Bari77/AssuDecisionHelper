/* ---------------------------------------------------------------------------
   Interface de l'assistant : parcours de questions, restitution du résultat,
   fiches de référence. Toute la connaissance métier vit dans rules.js.
   --------------------------------------------------------------------------- */

(function () {
  'use strict';

  const { CONVENTIONS, QUESTIONS, flow } = window.RULES;

  /* Couleurs par famille de résultat, injectées en variables CSS. */
  const TONES = {
    irsi: { c: '#17607d', bg: '#eaf3f7', line: '#bcd8e3' },
    cidecop: { c: '#1d6b52', bg: '#e9f4ef', line: '#b7dbcb' },
    cidepiec: { c: '#8a5314', bg: '#fbf1e3', line: '#e6cfa8' },
    neutre: { c: '#5a6472', bg: '#f2f4f7', line: '#d6dbe2' },
  };

  /* Libellés courts pour le récapitulatif latéral. */
  const TRAIL_LABELS = {
    immeuble: 'Bien sinistré',
    evenement: 'Événement',
    perilAutre: 'Péril listé',
    causeExclue: 'Cause exclue IRSI',
    montant: 'Montant par local',
    localisation: 'Situation du local',
    natureDommages: 'Nature des dommages',
    seuilCidepiec: 'Seuil CIDEPIEC',
    adhesion: 'Adhésion des assureurs',
  };

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  const stage = document.getElementById('stage');
  const trail = document.getElementById('trail');
  const trailEmpty = document.getElementById('trail-empty');
  const resetBtn = document.getElementById('reset');

  /* Machine à états du parcours (assets/parcours.js) : sans DOM, donc testable. */
  const parcours = window.PARCOURS.creerParcours({
    questions: QUESTIONS,
    flow: flow,
    onChange: render,
  });

  let courant = null; // id de la question affichée, null si résultat

  /* Le parcours est reflété dans le fragment d'URL : un cas d'espèce se partage
     alors par simple copie du lien. Silencieux si le navigateur refuse
     l'écriture de l'historique (ouverture directe en file:// selon les cas). */
  function syncHash() {
    const q = parcours
      .etapes()
      .map((e) => e.id + '=' + encodeURIComponent(e.valeur))
      .join('&');
    try {
      history.replaceState(null, '', location.pathname + location.search + (q ? '#' + q : '#'));
    } catch (e) {
      /* fragment non synchronisable : sans incidence sur le raisonnement */
    }
  }

  /* Rejoue les réponses présentes dans l'URL. La validation des valeurs et de
     leur ordre est faite par le module de parcours. */
  function initDepuisHash() {
    const candidat = {};
    new URLSearchParams(location.hash.replace(/^#/, '')).forEach((v, k) => (candidat[k] = v));
    parcours.rejouer(candidat);
  }

  /* ---------------------- Rendu ---------------------- */

  function render() {
    const issue = parcours.issue();

    if (issue.question) {
      courant = issue.question;
      parcours.noter(courant);
      renderQuestion(courant);
    } else {
      courant = null;
      renderResultat(issue.resultat);
    }

    renderTrail();
    syncHash();
  }

  function renderQuestion(id) {
    const def = QUESTIONS[id];
    const card = el('div', 'card');

    const rang = parcours.nbPosees();
    card.appendChild(el('p', 'step', `Critère ${rang} sur ${rang + parcours.resteEstime()}`));
    card.appendChild(el('h1', 'question', def.intitule));
    if (def.aide) card.appendChild(el('p', 'hint', def.aide));

    const opts = el('div', 'options');
    def.options.forEach((o, i) => {
      const b = el('button', 'option');
      b.type = 'button';
      b.appendChild(el('span', 'option__key', String(i + 1)));
      const body = el('div', 'option__body');
      body.appendChild(el('div', 'option__label', o.l));
      if (o.h) body.appendChild(el('div', 'option__hint', o.h));
      b.appendChild(body);
      b.addEventListener('click', () => parcours.repondre(id, o.v));
      opts.appendChild(b);
    });
    card.appendChild(opts);

    const foot = el('div', 'cardfoot');
    const tip = el('span', 'small muted');
    tip.append('Touches ');
    tip.appendChild(el('span', 'kbd', '1'));
    tip.append('–');
    tip.appendChild(el('span', 'kbd', String(def.options.length)));
    tip.append(' pour répondre, ');
    tip.appendChild(el('span', 'kbd', '←'));
    tip.append(' pour revenir.');
    foot.appendChild(tip);

    if (parcours.nbRepondues() > 0) {
      const back = el('button', 'linkbtn', 'Question précédente');
      back.type = 'button';
      back.addEventListener('click', parcours.reculer);
      foot.appendChild(back);
    }
    card.appendChild(foot);

    stage.replaceChildren(card);
    const first = card.querySelector('.option');
    if (first) first.focus({ preventScroll: true });
  }

  function renderResultat(res) {
    const f = res.fiche;
    const tone = TONES[f.tone] || TONES.neutre;

    const box = el('div', 'result');
    box.style.setProperty('--tone', tone.c);
    box.style.setProperty('--tone-bg', tone.bg);
    box.style.setProperty('--tone-line', tone.line);

    /* En-tête */
    const head = el('div', 'result__head');
    const eyebrow = el('div', 'result__eyebrow');
    eyebrow.appendChild(el('span', 'result__code', f.code));
    if (f.badge) eyebrow.appendChild(el('span', 'badge', f.badge));
    head.appendChild(eyebrow);
    head.appendChild(el('h1', 'result__title', f.titre));
    head.appendChild(el('p', 'result__sub', f.nomComplet));
    head.appendChild(el('p', 'result__lead', f.accroche));
    box.appendChild(head);

    /* Corps */
    const body = el('div', 'result__body');

    if (res.gestionnaire) {
      const spot = el('div', 'block');
      const sl = el('div', 'spotlight');
      sl.appendChild(el('span', 'spotlight__label', 'Assureur gestionnaire'));
      sl.appendChild(el('span', 'spotlight__value', res.gestionnaire));
      spot.appendChild(sl);
      body.appendChild(spot);
    }

    /* Les sections propres au cas d'espèce passent avant celles de la fiche.
       Un titre déjà rendu n'est pas repris : sans ce garde-fou, une fiche dont
       un bloc porte le même intitulé qu'une section calculée s'afficherait deux fois. */
    const titresRendus = new Set();
    const ajouter = (titre, contenu, listClass) => {
      const cle = titre.toLowerCase();
      if (titresRendus.has(cle)) return;
      titresRendus.add(cle);
      body.appendChild(bloc(titre, contenu, listClass));
    };

    if (res.motif) ajouter('Motif de la qualification', [res.motif]);
    if (res.repartition) ajouter('Répartition retenue pour ce sinistre', res.repartition, 'list');
    if (res.actions) ajouter('Conduite du dossier', res.actions, 'list--num');

    (f.blocs || []).forEach((b) => ajouter(b.t, b.p));

    if (res.vigilance && res.vigilance.length) {
      const c = bloc('Points de vigilance', res.vigilance, 'list');
      c.classList.add('callout');
      body.appendChild(c);
    }

    box.appendChild(body);

    /* Actions */
    const foot = el('div', 'result__foot');

    const again = el('button', 'btn btn--primary', 'Nouvelle analyse');
    again.type = 'button';
    again.addEventListener('click', parcours.reinitialiser);
    foot.appendChild(again);

    const back = el('button', 'btn', 'Modifier le dernier critère');
    back.type = 'button';
    back.addEventListener('click', parcours.reculer);
    foot.appendChild(back);

    const copy = el('button', 'btn', 'Copier la synthèse');
    copy.type = 'button';
    copy.addEventListener('click', () => {
      navigator.clipboard.writeText(synthese(res)).then(
        () => {
          copy.textContent = 'Synthèse copiée';
          setTimeout(() => (copy.textContent = 'Copier la synthèse'), 1800);
        },
        () => (copy.textContent = 'Copie impossible')
      );
    });
    foot.appendChild(copy);

    const print = el('button', 'btn', 'Imprimer');
    print.type = 'button';
    print.addEventListener('click', () => window.print());
    foot.appendChild(print);

    box.appendChild(foot);
    stage.replaceChildren(box);
    box.setAttribute('tabindex', '-1');
    box.focus({ preventScroll: true });
  }

  function bloc(titre, paragraphes, listClass) {
    const b = el('div', 'block');
    b.appendChild(el('h3', null, titre));
    if (listClass) {
      const ul = el('ul', 'list ' + (listClass === 'list' ? '' : listClass));
      paragraphes.forEach((p) => ul.appendChild(el('li', null, p)));
      b.appendChild(ul);
    } else {
      paragraphes.forEach((p) => b.appendChild(el('p', null, p)));
    }
    return b;
  }

  const libelle = (e) => TRAIL_LABELS[e.id] || QUESTIONS[e.id].intitule;

  function renderTrail() {
    const etapes = parcours.etapes();
    trail.replaceChildren();
    trailEmpty.hidden = etapes.length > 0;
    resetBtn.hidden = etapes.length === 0;

    etapes.forEach((e) => {
      const li = el('li');
      const b = el('button', 'trail__item');
      b.type = 'button';
      b.title = 'Revenir à ce critère';
      const dl = el('dl');
      dl.appendChild(el('dt', null, libelle(e)));
      dl.appendChild(el('dd', null, e.option ? e.option.l : e.valeur));
      b.appendChild(dl);
      b.addEventListener('click', () => parcours.revenirA(e.index));
      li.appendChild(b);
      trail.appendChild(li);
    });
  }

  function synthese(res) {
    const lignes = ['QUALIFICATION CONVENTIONNELLE', ''];
    parcours.etapes().forEach((e) => {
      lignes.push(`- ${libelle(e)} : ${e.option ? e.option.l : e.valeur}`);
    });
    lignes.push('', `Conclusion : ${res.fiche.titre}`, res.fiche.nomComplet, '');
    if (res.motif) lignes.push(`Motif : ${res.motif}`, '');
    if (res.gestionnaire) lignes.push(`Assureur gestionnaire : ${res.gestionnaire}`, '');
    if (res.repartition) {
      lignes.push('Répartition retenue :');
      res.repartition.forEach((x) => lignes.push(`  - ${x}`));
      lignes.push('');
    }
    if (res.actions) {
      lignes.push('Conduite du dossier :');
      res.actions.forEach((x, i) => lignes.push(`  ${i + 1}. ${x}`));
      lignes.push('');
    }
    if (res.vigilance && res.vigilance.length) {
      lignes.push('Points de vigilance :');
      res.vigilance.forEach((x) => lignes.push(`  - ${x}`));
      lignes.push('');
    }
    lignes.push('Analyse indicative, à confronter au texte conventionnel en vigueur et aux garanties souscrites.');
    return lignes.join('\n');
  }

  /* ---------------------- Fiches de référence ---------------------- */

  function renderFiches() {
    const host = document.getElementById('fiches');
    ['IRSI_T1', 'IRSI_T2', 'CIDECOP', 'CIDEPIEC', 'DROIT_COMMUN'].forEach((cle) => {
      const f = CONVENTIONS[cle];
      const tone = TONES[f.tone] || TONES.neutre;
      const card = el('article', 'fiche');
      card.style.setProperty('--tone', tone.c);
      card.appendChild(el('div', 'fiche__code', f.code + (f.badge ? ' · ' + f.badge : '')));
      card.appendChild(el('h2', null, f.titre));
      card.appendChild(el('p', 'fiche__nom', f.nomComplet));
      card.appendChild(el('p', 'fiche__lead', f.accroche));
      const grid = el('div', 'fiche__grid');
      (f.blocs || []).forEach((b) => {
        const sec = el('section');
        sec.appendChild(el('h3', null, b.t));
        const ul = el('ul', 'list');
        b.p.forEach((p) => ul.appendChild(el('li', null, p)));
        sec.appendChild(ul);
        grid.appendChild(sec);
      });
      card.appendChild(grid);
      host.appendChild(card);
    });
  }

  /* ---------------------- Sources ---------------------- */

  function renderSources() {
    const { SOURCES, RESERVES, SOURCES_CONSULTATION } = window.SOURCES;
    document.getElementById('date-consultation').textContent = SOURCES_CONSULTATION;

    /* Réserves affichées en tête : ce que les sources ne permettent pas d'établir. */
    const zone = document.getElementById('reserves');
    const panneau = el('div', 'reserves');
    panneau.appendChild(el('h2', null, 'Ce que les sources ne permettent pas de trancher'));
    const dl = el('dl', 'reserves__list');
    RESERVES.forEach((r) => {
      dl.appendChild(el('dt', null, r.t));
      dl.appendChild(el('dd', null, r.p));
    });
    panneau.appendChild(dl);
    zone.appendChild(panneau);

    const host = document.getElementById('sources');
    SOURCES.forEach((groupe) => {
      const sec = el('section', 'srcgroup');
      sec.appendChild(el('h2', 'srcgroup__titre', groupe.groupe));
      if (groupe.intro) sec.appendChild(el('p', 'srcgroup__intro', groupe.intro));

      const ul = el('ul', 'srclist');
      groupe.items.forEach((it) => {
        const li = el('li', 'src' + (it.manquant ? ' src--manquant' : ''));

        if (it.url) {
          const a = el('a', 'src__titre', it.titre);
          a.href = it.url;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          li.appendChild(a);
        } else {
          li.appendChild(el('span', 'src__titre', it.titre));
        }

        const meta = el('p', 'src__meta');
        meta.append(it.editeur);
        if (it.format) {
          meta.append(' · ');
          meta.appendChild(el('span', 'src__format', it.format));
        }
        li.appendChild(meta);

        if (it.note) li.appendChild(el('p', 'src__note', it.note));
        if (it.url) li.appendChild(el('p', 'src__url', it.url));
        ul.appendChild(li);
      });
      sec.appendChild(ul);
      host.appendChild(sec);
    });
  }

  /* ---------------------- Navigation et raccourcis ---------------------- */

  const vues = {
    assistant: document.getElementById('view-assistant'),
    fiches: document.getElementById('view-fiches'),
    sources: document.getElementById('view-sources'),
  };

  function afficherVue(nom) {
    if (!vues[nom]) return;
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('is-active', t.dataset.view === nom));
    Object.entries(vues).forEach(([n, section]) => (section.hidden = n !== nom));
  }

  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      afficherVue(tab.dataset.view);
      window.scrollTo({ top: 0 });
    });
  });

  resetBtn.addEventListener('click', parcours.reinitialiser);

  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (vues.assistant.hidden) return;

    if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
      const tag = document.activeElement && document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      /* Empêche la navigation arrière du navigateur, même s'il n'y a rien à défaire. */
      e.preventDefault();
      parcours.reculer();
      return;
    }

    if (!courant) return;
    const n = parseInt(e.key, 10);
    const def = QUESTIONS[courant];
    if (n >= 1 && n <= def.options.length) {
      e.preventDefault();
      parcours.repondre(courant, def.options[n - 1].v);
    }
  });

  /* Identité et version, lues depuis assets/version.js. */
  const adh = window.ADH || { sigle: 'ADH', nom: 'AssuDecisionHelper', version: '0.0.0' };
  document.getElementById('brand-version').textContent = 'v' + adh.version;
  document.getElementById('footer-version').textContent = `${adh.nom} (${adh.sigle}) — version ${adh.version}`;

  renderFiches();
  renderSources();
  initDepuisHash();
  render();
  /* ?vue=fiches ou ?vue=sources ouvre directement l'onglet correspondant. */
  afficherVue(new URLSearchParams(location.search).get('vue') || 'assistant');
})();
