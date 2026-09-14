const keyInput=document.querySelector('#api-key');
const notice=document.querySelector('#notice');
const money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
let promotions=[],stores=[];

/* ── helpers ── */
function headers(){return {'Content-Type':'application/json','x-admin-key':keyInput.value};}
function message(text,error=false){
  notice.textContent=text;notice.classList.remove('hidden');
  notice.style.background=error?'#fef3f2':'#ecfdf3';
  notice.style.color=error?'#b42318':'#067647';
  setTimeout(()=>notice.classList.add('hidden'),4000);
}
function toLocal(value){if(!value)return '';const d=new Date(value);return new Date(d-d.getTimezoneOffset()*60000).toISOString().slice(0,16);}
async function api(url,options={}){
  const r=await fetch(url,{...options,headers:{...headers(),...(options.headers||{})}});
  if(!r.ok){const body=await r.json().catch(()=>({}));throw new Error(body.error||'Operação não concluída.');}
  return r.status===204?null:r.json();
}

/* ── tabs ── */
document.querySelectorAll('.tab-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('view-promotions').classList.toggle('hidden',btn.dataset.tab!=='promotions');
    document.getElementById('view-stores').classList.toggle('hidden',btn.dataset.tab!=='stores');
  });
});

/* ── promotions ── */
const promoForm=document.querySelector('#promotion-form');
const promoList=document.querySelector('#admin-list');

async function loadStores(){
  try{stores=await api('/api/admin/stores');}catch{stores=await fetch('/api/stores').then(r=>r.json());}
  const select=promoForm.elements.store_id;
  select.innerHTML='<option value="">Selecione</option>';
  stores.forEach(s=>select.add(new Option(`${s.name} — ${s.city}/${s.state}`,s.id)));
}
async function loadPromotions(){
  if(!keyInput.value){promoList.innerHTML='<div class="empty">Informe a chave administrativa.</div>';return;}
  promoList.innerHTML='<div class="empty">Carregando promoções…</div>';
  try{promotions=await api('/api/admin/promotions');renderPromotions();}catch(e){promoList.innerHTML=`<div class="empty">${e.message}</div>`;}
}
function renderPromotions(){
  promoList.innerHTML='';
  if(!promotions.length){promoList.innerHTML='<div class="empty">Nenhuma promoção cadastrada.</div>';return;}
  promotions.forEach(p=>{
    const el=document.createElement('article');el.className='admin-item';
    el.innerHTML=`<div><h3></h3><p></p></div><div class="item-actions"><button data-action="edit">Editar</button><button data-action="status">${p.active?'Pausar':'Ativar'}</button><button data-action="delete">Excluir</button></div>`;
    el.querySelector('h3').textContent=p.product_name;
    el.querySelector('p').textContent=`${p.store_name} · ${money.format(p.promotional_price)} · ${p.active?'Ativa':'Pausada'}`;
    el.querySelector('[data-action=edit]').onclick=()=>editPromotion(p);
    el.querySelector('[data-action=status]').onclick=async()=>{try{await api(`/api/promotions/${p.id}/status`,{method:'PATCH',body:JSON.stringify({active:!p.active})});message('Status atualizado.');loadPromotions();}catch(e){message(e.message,true);}};
    el.querySelector('[data-action=delete]').onclick=async()=>{if(!confirm('Excluir esta promoção?'))return;try{await api(`/api/promotions/${p.id}`,{method:'DELETE'});message('Promoção excluída.');loadPromotions();}catch(e){message(e.message,true);}};
    promoList.appendChild(el);
  });
}
function editPromotion(p){
  document.querySelector('#promotion-id').value=p.id;
  for(const name of ['product_name','category','brand','description','original_price','promotional_price','store_id','image_url','product_url']) promoForm.elements[name].value=p[name]??'';
  promoForm.elements.starts_at.value=toLocal(p.starts_at);promoForm.elements.ends_at.value=toLocal(p.ends_at);promoForm.elements.active.checked=!!p.active;
  document.querySelector('#cancel-edit').classList.remove('hidden');window.scrollTo({top:0,behavior:'smooth'});
}
function resetPromotion(){promoForm.reset();document.querySelector('#promotion-id').value='';promoForm.elements.active.checked=true;document.querySelector('#cancel-edit').classList.add('hidden');}
promoForm.addEventListener('submit',async e=>{
  e.preventDefault();const data=Object.fromEntries(new FormData(promoForm));data.active=promoForm.elements.active.checked;
  const id=document.querySelector('#promotion-id').value;
  try{await api(id?`/api/promotions/${id}`:'/api/promotions',{method:id?'PUT':'POST',body:JSON.stringify(data)});message(id?'Promoção atualizada.':'Promoção cadastrada.');resetPromotion();loadPromotions();}catch(err){message(err.message,true);}
});
document.querySelector('#cancel-edit').onclick=resetPromotion;

/* ── stores ── */
const storeForm=document.querySelector('#store-form');
const storeList=document.querySelector('#store-list');

async function loadStoresAdmin(){
  if(!keyInput.value){storeList.innerHTML='<div class="empty">Informe a chave administrativa.</div>';return;}
  storeList.innerHTML='<div class="empty">Carregando estabelecimentos…</div>';
  try{stores=await api('/api/admin/stores');renderStores();}catch(e){storeList.innerHTML=`<div class="empty">${e.message}</div>`;}
}
function renderStores(){
  storeList.innerHTML='';
  if(!stores.length){storeList.innerHTML='<div class="empty">Nenhum estabelecimento cadastrado.</div>';return;}
  stores.forEach(s=>{
    const el=document.createElement('article');el.className='admin-item';
    el.innerHTML=`<div><h3></h3><p></p></div><div class="item-actions"><button data-action="edit">Editar</button><button data-action="status">${s.active?'Pausar':'Ativar'}</button><button data-action="delete">Excluir</button></div>`;
    el.querySelector('h3').textContent=s.name;
    el.querySelector('p').textContent=`${s.city}/${s.state} · ${s.active?'Ativo':'Pausado'}`;
    el.querySelector('[data-action=edit]').onclick=()=>editStore(s);
    el.querySelector('[data-action=status]').onclick=async()=>{try{await api(`/api/stores/${s.id}/status`,{method:'PATCH',body:JSON.stringify({active:!s.active})});message('Status atualizado.');loadStoresAdmin();loadStores();}catch(e){message(e.message,true);}};
    el.querySelector('[data-action=delete]').onclick=async()=>{if(!confirm('Excluir este estabelecimento?'))return;try{await api(`/api/stores/${s.id}`,{method:'DELETE'});message('Estabelecimento excluído.');loadStoresAdmin();loadStores();}catch(e){message(e.message,true);}};
    storeList.appendChild(el);
  });
}
function editStore(s){
  document.querySelector('#store-id').value=s.id;
  storeForm.elements.name.value=s.name;storeForm.elements.city.value=s.city;storeForm.elements.state.value=s.state;storeForm.elements.active.checked=!!s.active;
  document.querySelector('#cancel-store-edit').classList.remove('hidden');window.scrollTo({top:0,behavior:'smooth'});
}
function resetStore(){storeForm.reset();document.querySelector('#store-id').value='';storeForm.elements.active.checked=true;document.querySelector('#cancel-store-edit').classList.add('hidden');}
storeForm.addEventListener('submit',async e=>{
  e.preventDefault();const data=Object.fromEntries(new FormData(storeForm));data.active=storeForm.elements.active.checked;
  const id=document.querySelector('#store-id').value;
  try{await api(id?`/api/stores/${id}`:'/api/stores',{method:id?'PUT':'POST',body:JSON.stringify(data)});message(id?'Estabelecimento atualizado.':'Estabelecimento cadastrado.');resetStore();loadStoresAdmin();loadStores();}catch(err){message(err.message,true);}
});
document.querySelector('#cancel-store-edit').onclick=resetStore;

/* ── init ── */
keyInput.addEventListener('change',()=>{
  sessionStorage.setItem('admin-key',keyInput.value);
  loadStores();loadPromotions();loadStoresAdmin();
});
keyInput.value=sessionStorage.getItem('admin-key')||'';
loadStores().then(()=>{loadPromotions();loadStoresAdmin();});
