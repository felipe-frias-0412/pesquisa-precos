const form=document.querySelector('#promotion-form');
const keyInput=document.querySelector('#api-key');
const list=document.querySelector('#admin-list');
const notice=document.querySelector('#notice');
const money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
let promotions=[];

function headers(){return {'Content-Type':'application/json','x-admin-key':keyInput.value};}
function message(text,error=false){notice.textContent=text;notice.classList.remove('hidden');notice.style.background=error?'#fef3f2':'#ecfdf3';notice.style.color=error?'#b42318':'#067647';setTimeout(()=>notice.classList.add('hidden'),4000);}
function toLocal(value){if(!value)return '';const d=new Date(value);return new Date(d-d.getTimezoneOffset()*60000).toISOString().slice(0,16);}
async function api(url,options={}){const r=await fetch(url,{...options,headers:{...headers(),...(options.headers||{})}});if(!r.ok){const body=await r.json().catch(()=>({}));throw new Error(body.error||'Operação não concluída.');}return r.status===204?null:r.json();}

async function loadStores(){
 const stores=await fetch('/api/stores').then(r=>r.json());
 const select=form.elements.store_id;
 stores.forEach(s=>select.add(new Option(`${s.name} — ${s.city}/${s.state}`,s.id)));
}
async function load(){
 if(!keyInput.value){list.innerHTML='<div class="empty">Informe a chave administrativa.</div>';return;}
 try{promotions=await api('/api/admin/promotions');render();}catch(e){list.innerHTML=`<div class="empty">${e.message}</div>`;}
}
function render(){
 list.innerHTML='';
 if(!promotions.length){list.innerHTML='<div class="empty">Nenhuma promoção cadastrada.</div>';return;}
 promotions.forEach(p=>{
  const el=document.createElement('article');el.className='admin-item';
  el.innerHTML=`<div><h3></h3><p></p></div><div class="item-actions"><button data-action="edit">Editar</button><button data-action="status">${p.active?'Pausar':'Ativar'}</button><button data-action="delete">Excluir</button></div>`;
  el.querySelector('h3').textContent=p.product_name;
  el.querySelector('p').textContent=`${p.store_name} · ${money.format(p.promotional_price)} · ${p.active?'Ativa':'Pausada'}`;
  el.querySelector('[data-action=edit]').onclick=()=>edit(p);
  el.querySelector('[data-action=status]').onclick=async()=>{try{await api(`/api/promotions/${p.id}/status`,{method:'PATCH',body:JSON.stringify({active:!p.active})});message('Status atualizado.');load();}catch(e){message(e.message,true);}};
  el.querySelector('[data-action=delete]').onclick=async()=>{if(!confirm('Excluir esta promoção?'))return;try{await api(`/api/promotions/${p.id}`,{method:'DELETE'});message('Promoção excluída.');load();}catch(e){message(e.message,true);}};
  list.appendChild(el);
 });
}
function edit(p){
 document.querySelector('#promotion-id').value=p.id;
 for(const name of ['product_name','category','brand','description','original_price','promotional_price','store_id','image_url','product_url']) form.elements[name].value=p[name]??'';
 form.elements.starts_at.value=toLocal(p.starts_at);form.elements.ends_at.value=toLocal(p.ends_at);form.elements.active.checked=!!p.active;
 document.querySelector('#cancel-edit').classList.remove('hidden');window.scrollTo({top:0,behavior:'smooth'});
}
function reset(){form.reset();document.querySelector('#promotion-id').value='';form.elements.active.checked=true;document.querySelector('#cancel-edit').classList.add('hidden');}
form.addEventListener('submit',async e=>{
 e.preventDefault();const data=Object.fromEntries(new FormData(form));data.active=form.elements.active.checked;
 const id=document.querySelector('#promotion-id').value;
 try{await api(id?`/api/promotions/${id}`:'/api/promotions',{method:id?'PUT':'POST',body:JSON.stringify(data)});message(id?'Promoção atualizada.':'Promoção cadastrada.');reset();load();}catch(err){message(err.message,true);}
});
keyInput.addEventListener('change',()=>{sessionStorage.setItem('admin-key',keyInput.value);load();});
document.querySelector('#cancel-edit').onclick=reset;
keyInput.value=sessionStorage.getItem('admin-key')||'';
loadStores().then(load);
