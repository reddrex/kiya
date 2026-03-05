'use strict';

class AIMLEngine {
  constructor() {
    this.categories = [];
    this.sets = {};
    this.substitutions = [];
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  async load(onProgress) {
    onProgress?.('Cargando diccionario...');
    await this._loadSubstitutions();

    onProgress?.('Cargando vocabulario...');
    await this._loadSets();

    onProgress?.('Cargando conocimiento...');
    await this._loadAIML();

    this._sortCategories();
    onProgress?.('¡Listo!');
  }

  /** Normalize input and return an array of message segments: [{delay, html}] */
  respond(input) {
    const normalized = this.normalizeInput(input);
    return this._matchInput(normalized);
  }

  normalizeInput(input) {
    let text = ' ' + input.toLowerCase() + ' ';
    for (const [from, to] of this.substitutions) {
      const f = from.toLowerCase();
      const t = to.toLowerCase();
      if (text.includes(f)) {
        text = text.split(f).join(t);
      }
    }
    return text.trim().replace(/\s+/g, ' ').toUpperCase();
  }

  // ─── Loading ──────────────────────────────────────────────────────────────

  async _loadSubstitutions() {
    try {
      const data = await fetch('substitutions/normal.substitution').then(r => r.json());
      this.substitutions = data;
    } catch (e) {
      console.warn('Could not load substitutions', e);
    }
  }

  async _loadSets() {
    const setNames = [
      'acceder', 'activar', 'actividadbanco', 'actualizar', 'advertencia',
      'ahaciahasta', 'alarma', 'anadir', 'apartados', 'app', 'aumentar',
      'bancodigital', 'bateria', 'borrar', 'cambiar', 'captura', 'cargar',
      'chat', 'colectividad', 'colgar', 'como', 'compartir', 'con',
      'conectar', 'contacto', 'cookies', 'correo', 'costardinero', 'datos',
      'decoro', 'desactivar', 'descargar', 'desinstalar', 'despedida',
      'disminuir', 'documento', 'donde', 'duda', 'elegir', 'encontrar',
      'escribir', 'escuchar', 'fecha', 'formasegura', 'gracias', 'haber',
      'hacer', 'hacerfoto', 'historia', 'icono', 'imagen', 'instalar',
      'insulto', 'internet', 'leer', 'llamar', 'llegar', 'llevara',
      'mandar', 'media', 'movil', 'musica', 'negativo', 'notas', 'paraque',
      'pastillas', 'pedir', 'perfil', 'pestana', 'poner', 'problematecnico',
      'publicar', 'quecual', 'quedarparado', 'quequien', 'querer',
      'recomendar', 'recordar', 'redessociales', 'reiniciar', 'retweet',
      'saludos', 'seguridad', 'serie', 'servir', 'silencio', 'sinconcoste',
      'sitio', 'tamano', 'texto', 'tono', 'tv', 'ubicacion', 'usar', 'ver',
      'vibracion', 'video', 'volumen', 'voz', 'whatsapp',
    ];

    await Promise.all(setNames.map(async name => {
      try {
        // 'con' is a reserved filename on Windows; locally it lives as con_.set
        // On GitHub Pages the file exists as con.set and is served correctly
        let data;
        try {
          data = await fetch(`sets/${name}.set`).then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
          });
        } catch {
          // Fallback for Windows-reserved filename
          data = await fetch(`sets/${name}_.set`).then(r => r.json());
        }
        this.sets[name] = data.map(entry => {
          const raw = Array.isArray(entry) ? entry[0] : entry;
          return this._normalizeSetEntry(raw);
        });
      } catch (e) {
        console.warn(`Could not load set: ${name}`, e);
        this.sets[name] = [];
      }
    }));
  }

  async _loadAIML() {
    const files = [
      'files/1general.aiml',
      'files/1respuestas.aiml',
      'files/2configypgtsfrecuentes.aiml',
      'files/2respuestas.aiml',
      'files/3navegacionweb.aiml',
      'files/3respuestas.aiml',
      'files/4comunicacion.aiml',
      'files/4respuestas.aiml',
      'files/5redessociales.aiml',
      'files/5respuestas.aiml',
      'files/6appsyentretenimiento.aiml',
      'files/6respuestas.aiml',
      'files/udc.aiml',
    ];

    for (const file of files) {
      try {
        const xml = await fetch(file).then(r => r.text());
        this._parseAIML(xml);
      } catch (e) {
        console.warn(`Could not load: ${file}`, e);
      }
    }
  }

  // ─── Parsing ──────────────────────────────────────────────────────────────

  _normalizeSetEntry(str) {
    return str
      .toLowerCase()
      .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i')
      .replace(/ó/g, 'o').replace(/ú/g, 'u').replace(/ü/g, 'u')
      .replace(/ñ/g, 'n').replace(/[¿?¡!,;()]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  }

  _parseAIML(xmlText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    if (doc.querySelector('parsererror')) {
      console.warn('AIML parse error in document');
      return;
    }
    this._extractCategories(doc);
  }

  _extractCategories(doc) {
    for (const cat of doc.querySelectorAll('category')) {
      const patternEl = cat.querySelector(':scope > pattern');
      const templateEl = cat.querySelector(':scope > template');
      if (!patternEl || !templateEl) continue;

      const parts = this._parsePattern(patternEl);
      if (parts.length === 0) continue;

      this.categories.push({
        parts,
        template: templateEl.cloneNode(true),
        priority: this._calcPriority(parts),
      });
    }
  }

  _parsePattern(patternEl) {
    const parts = [];
    for (const node of patternEl.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        const words = node.textContent.trim().toUpperCase().split(/\s+/).filter(Boolean);
        for (const w of words) {
          if (w === '^' || w === '#') parts.push({ type: 'caret' });
          else if (w === '*' || w === '_') parts.push({ type: 'star' });
          else parts.push({ type: 'word', value: w });
        }
      } else if (node.nodeName === 'set') {
        parts.push({ type: 'set', name: node.textContent.trim().toLowerCase() });
      }
    }
    return parts;
  }

  _calcPriority(parts) {
    let score = 0;
    for (const p of parts) {
      if (p.type === 'word') score += 10;
      else if (p.type === 'set') score += 5;
      else if (p.type === 'star') score += 2;
      else if (p.type === 'caret') score += 1;
    }
    return score;
  }

  _sortCategories() {
    this.categories.sort((a, b) => b.priority - a.priority);
  }

  // ─── Pattern Matching ─────────────────────────────────────────────────────

  _matchInput(normalized) {
    const tokens = normalized.split(/\s+/).filter(Boolean);
    for (const cat of this.categories) {
      if (this._matchAt(cat.parts, 0, tokens, 0)) {
        return this._renderTemplate(cat.template);
      }
    }
    return [{ delay: 1000, html: 'Lo siento, no sé cómo responder a eso.' }];
  }

  /** Recursive backtracking pattern matcher */
  _matchAt(parts, pi, tokens, ti) {
    if (pi === parts.length) return ti === tokens.length;

    const part = parts[pi];

    if (part.type === 'word') {
      if (ti < tokens.length && tokens[ti] === part.value) {
        return this._matchAt(parts, pi + 1, tokens, ti + 1);
      }
      return false;
    }

    if (part.type === 'set') {
      const entries = this.sets[part.name] || [];
      for (const entry of entries) {
        const et = entry.split(' ').filter(Boolean);
        if (et.length === 0) continue;
        let ok = true;
        for (let i = 0; i < et.length; i++) {
          if (ti + i >= tokens.length || tokens[ti + i] !== et[i]) { ok = false; break; }
        }
        if (ok && this._matchAt(parts, pi + 1, tokens, ti + et.length)) return true;
      }
      return false;
    }

    if (part.type === 'caret') { // ^ : 0 or more words
      for (let skip = 0; skip <= tokens.length - ti; skip++) {
        if (this._matchAt(parts, pi + 1, tokens, ti + skip)) return true;
      }
      return false;
    }

    if (part.type === 'star') { // * : 1 or more words
      for (let skip = 1; skip <= tokens.length - ti; skip++) {
        if (this._matchAt(parts, pi + 1, tokens, ti + skip)) return true;
      }
      return false;
    }

    return false;
  }

  // ─── Template Rendering ───────────────────────────────────────────────────

  /** Returns [{delay: ms, html: string}] */
  _renderTemplate(templateEl) {
    // If the only meaningful child is <srai>, follow it directly
    const meaningful = Array.from(templateEl.childNodes)
      .filter(n => n.nodeType !== Node.TEXT_NODE || n.textContent.trim());
    if (meaningful.length === 1 && meaningful[0].nodeName.toLowerCase() === 'srai') {
      return this._matchInput(meaningful[0].textContent.trim());
    }
    return this._renderNodes(Array.from(templateEl.childNodes));
  }

  _renderNodes(nodes) {
    const segments = [];
    let pendingDelay = 0;
    let parts = [];

    const flush = () => {
      const html = parts.join('').trim();
      if (html) {
        segments.push({ delay: pendingDelay, html });
        pendingDelay = 0;
      }
      parts = [];
    };

    for (const node of nodes) {
      const name = node.nodeName.toLowerCase();

      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        if (text.trim()) parts.push(this._esc(text));

      } else if (name === 'delay') {
        flush();
        pendingDelay = (parseInt(node.textContent) || 1) * 1000;

      } else if (name === 'random') {
        const items = Array.from(node.childNodes).filter(n => n.nodeName.toLowerCase() === 'li');
        if (items.length > 0) {
          const chosen = items[Math.floor(Math.random() * items.length)];
          flush();
          const inner = this._renderNodes(Array.from(chosen.childNodes));
          if (inner.length > 0) {
            // First inner segment inherits accumulated pendingDelay
            inner[0].delay = Math.max(inner[0].delay, pendingDelay);
            pendingDelay = 0;
          }
          for (const seg of inner) segments.push(seg);
        }

      } else if (name === 'srai') {
        flush();
        const inner = this._matchInput(node.textContent.trim());
        for (const seg of inner) segments.push(seg);

      } else if (['ul', 'ol', 'li', 'b', 'i', 'strong', 'em', 'br', 'p', 'span'].includes(name)) {
        parts.push(this._serializeNode(node));

      } else {
        const text = node.textContent;
        if (text && text.trim()) parts.push(this._esc(text));
      }
    }

    flush();
    return segments;
  }

  /** Serialize a DOM element to an HTML string, skipping XML namespace attributes */
  _serializeNode(node) {
    const name = node.nodeName.toLowerCase();
    if (node.nodeType === Node.TEXT_NODE) return this._esc(node.textContent);

    let attrs = '';
    if (node.attributes) {
      for (const attr of node.attributes) {
        if (attr.name === 'xmlns' || attr.name.startsWith('xmlns:')) continue;
        attrs += ` ${attr.name}="${this._esc(attr.value)}"`;
      }
    }

    let inner = '';
    for (const child of node.childNodes) {
      inner += child.nodeType === Node.TEXT_NODE
        ? this._esc(child.textContent)
        : this._serializeNode(child);
    }

    return `<${name}${attrs}>${inner}</${name}>`;
  }

  _esc(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
