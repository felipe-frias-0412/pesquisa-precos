const results = document.querySelector('#results');
const count = document.querySelector('#count');
const filters = document.querySelector('#filters');
const template = document.querySelector('#card-template');
const money = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
let debounce;

async function loadOptions() {
  const [stores, promotions] = await Promise.all([
    fetch('/api/stores').then(r => r.json()),
    fetch('/api/promotions').then(r => r.json())
  ]);
  for (const store of stores) document.querySelector('#store').add(new Option(`${store.name} — ${store.city}/${store.state}`, store.id));
  const categories = [...new Set(promotions.map(p => p.category))].sort();
  for (const category of categories) document.querySelector('#category').add(new Option(category, category));
}

async function loadPromotions() {
  const query = new URLSearchParams({
    search: document.querySelector('#search').value,
    category: document.querySelector('#category').value,
    store_id: document.querySelector('#store').value,
    sort: document.querySelector('#sort').value
  });
  results.innerHTML = '<div class="empty">Buscando as melhores ofertas…</div>';
  try {
    const response = await fetch('/api/promotions?' + query);
    if (!response.ok) throw new Error();
    const data = await response.json();
    count.textContent = data.length === 1 ? '1 promoção encontrada' : `${data.length} promoções encontradas`;
    results.innerHTML = '';
    if (!data.length) {
      results.innerHTML = '<div class="empty"><strong>Nenhuma oferta encontrada.</strong><br>Tente remover algum filtro.</div>';
      return;
    }
    for (const item of data) {
      const card = template.content.cloneNode(true);
      const image = card.querySelector('img');
      image.src = item.image_url || '';
      image.alt = item.image_url ? item.product_name : '';
      card.querySelector('.discount').textContent = `-${item.discount_percent}%`;
      card.querySelector('.category').textContent = item.category;
      card.querySelector('h2').textContent = item.product_name;
      card.querySelector('.description').textContent = [item.brand, item.description].filter(Boolean).join(' · ');
      card.querySelector('.store').textContent = `${item.store_name} — ${item.city}/${item.state}`;
      card.querySelector('s').textContent = money.format(item.original_price);
      card.querySelector('.pricing strong').textContent = money.format(item.promotional_price);
      const link = card.querySelector('.offer-link');
      link.href = item.product_url || '#';
      card.querySelector('.expires').textContent = 'Oferta válida até ' + new Date(item.ends_at).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});
      results.appendChild(card);
    }
  } catch {
    count.textContent = 'Falha ao atualizar';
    results.innerHTML = '<div class="empty">Não foi possível carregar as promoções. Tente novamente.</div>';
  }
}

filters.addEventListener('input', () => { clearTimeout(debounce); debounce=setTimeout(loadPromotions,250); });
document.querySelector('#clear').addEventListener('click',()=>{filters.reset();loadPromotions();});
const events = new EventSource('/api/events');
events.addEventListener('promotions-updated', loadPromotions);
events.addEventListener('stores-updated', () => location.reload());
events.onerror = () => document.querySelector('#live-status').textContent='Reconectando…';
events.onopen = () => document.querySelector('#live-status').textContent='Atualização em tempo real';
loadOptions().then(loadPromotions);
