const video = document.querySelector('#animation');
const toggle = document.querySelector('#toggle');
const preference = matchMedia('(prefers-reduced-motion: reduce)');
const list = document.querySelector('#exercises');
const search = document.querySelector('#search');
const error = document.querySelector('#error');
let exercises = [], selected = 'bench-press', playing = !preference.matches;
const local = path => '../' + path;
const searchable = text => text.toLocaleLowerCase('es').normalize('NFD').replace(/\p{Diacritic}/gu,'');
function renderList() {
  const query = searchable(search.value.trim());
  const visible = exercises.filter(e => searchable(e.title + ' ' + e.muscle + ' ' + e.equipment).includes(query));
  list.replaceChildren();
  for (const e of visible) {
    const button = document.createElement('button');
    button.type = 'button'; button.dataset.exercise = e.id; button.setAttribute('aria-pressed',String(e.id === selected));
    const thumb = document.createElement('img');
    thumb.src = local(e.poster); thumb.alt = ''; thumb.width = thumb.height = 64; thumb.loading = 'lazy';
    const text = document.createElement('span'); text.textContent = e.title;
    const meta = document.createElement('small'); meta.textContent = e.muscle + ' · ' + e.equipment;
    text.append(meta); button.append(thumb,text); list.append(button);
  }
  document.querySelector('#count').textContent = visible.length + ' de ' + exercises.length + ' ejercicios';
  document.querySelector('#empty').hidden = visible.length > 0;
}
function updateToggle() {
  toggle.textContent = video.paused ? 'Reproducir' : 'Pausar';
  toggle.setAttribute('aria-pressed',String(!video.paused));
}
async function play() { try { await video.play(); } catch { playing = false; updateToggle(); } }
function render() {
  const e = exercises.find(e => e.id === selected);
  if (!e) return;
  error.hidden = true;
  document.querySelector('#exercise-title').textContent = e.title;
  document.querySelector('#description').textContent = e.description;
  video.setAttribute('aria-label','Demostración de ' + e.title);
  video.poster = local(e.poster); video.src = local(e.video); video.width = e.width; video.height = e.height;
  const gif = document.querySelector('#gif-download');
  gif.hidden = !e.gif; gif.href = e.gif ? local(e.gif) : '#';
  document.querySelector('#video-download').href = local(e.video);
  for (const b of list.querySelectorAll('button')) b.setAttribute('aria-pressed',String(b.dataset.exercise === selected));
  if (playing) void play();
}
list.addEventListener('click',event => { const b = event.target.closest('[data-exercise]'); if (b) { playing = !video.paused; selected = b.dataset.exercise; render(); } });
search.addEventListener('input',renderList);
toggle.addEventListener('click',() => { playing = video.paused; if (playing) void play(); else video.pause(); });
video.addEventListener('play',updateToggle); video.addEventListener('pause',updateToggle);
video.addEventListener('error',() => { error.hidden = false; updateToggle(); });
preference.addEventListener('change',event => { if (event.matches) { playing = false; video.pause(); } });
fetch('catalog.json').then(r => { if (!r.ok) throw Error(); return r.json(); })
.then(catalog => { exercises = catalog; renderList(); render(); })
.catch(() => { error.hidden = false; error.textContent = 'No se pudo cargar el catálogo. Recargá la página para volver a intentar.'; });
