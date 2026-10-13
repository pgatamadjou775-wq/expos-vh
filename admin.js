/* ============================================================
   COMMISSION EXPOSÉ — Interface Administration
   Dépend de core.js (données) et export.js (Word / Excel)
   ============================================================ */

const TABS=['rapport','expose','etudiants','membres','seances','config','export'];
let currentAdminTab='rapport';

function adAuth(){
  if(document.getElementById('ad-code').value.trim()!==String(DB.adminCode||DEFAULT_ADMIN_CODE)){ toast('Code incorrect','ko'); return; }
  try{ sessionStorage.setItem('CE_ADMIN','1'); }catch(e){}
  showAdmin();
}
function showAdmin(){
  document.getElementById('ad-auth').classList.add('hidden');
  document.getElementById('ad-main').classList.remove('hidden');
  adSwitch(currentAdminTab);
}
function adSwitch(tab){
  currentAdminTab=tab;
  TABS.forEach(t=>{
    document.getElementById('ad-tab-'+t).classList.toggle('on', t===tab);
    document.getElementById('ad-'+t).classList.toggle('hidden', t!==tab);
  });
  renderTab(tab);
}
function renderTab(tab){
  if(tab==='membres') renderAdMembres();
  if(tab==='expose'){ fillDocFilters('expose'); renderAdDocs('expose'); }
  if(tab==='rapport'){ fillDocFilters('rapport'); renderAdDocs('rapport'); }
  if(tab==='etudiants') renderAdEtudiants(true);
  if(tab==='config'){ renderAdCommissions(); renderAdMembresConfig(); renderAdCreneaux(); renderAdEglises(); }
  if(tab==='seances'){ renderAdSeances(); renderEgliseStats(); fillVisiteEgliseSelect(); renderAdVisites(); }
  if(tab==='export'){ fillExportSelectors(); renderExportList(); }
}
window.onRemoteUpdate = function(){
  updateSyncBadge();
  const main=document.getElementById('ad-main');
  if(!main || main.classList.contains('hidden')) return;
  // ne pas effacer une saisie en cours
  const a=document.activeElement;
  if(a && main.contains(a) && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)) return;
  renderTab(currentAdminTab);
};

function commissionOptions(withAll, selected){
  return (withAll?`<option value="">Toutes les commissions</option>`:'') + DB.commissions.map(c=>`<option value="${escapeHtml(c.nom)}"${c.nom===selected?' selected':''}>${escapeHtml(c.nom)}</option>`).join('');
}

/* ================= PRÉSENCES ================= */
function renderAdMembres(){
  const today=todayStr();
  const todays=DB.presences.filter(p=>p.date===today);
  document.getElementById('ad-m-present').textContent=todays.filter(p=>p.statut==='present').length;
  document.getElementById('ad-m-total').textContent=DB.membres.length;
  const sorted = todays.slice().sort((a,b)=>b.tsArrivee-a.tsArrivee);
  document.getElementById('ad-m-list').innerHTML = sorted.length ? sorted.map(p=>{
    const dureeTxt = p.statut==='present' ? 'en cours' : Math.floor((p.dureeMin||0)/60)+'h'+pad((p.dureeMin||0)%60);
    return `<div class="list-item"><div class="li-top"><div class="li-name">${escapeHtml(p.membreNom)}</div><span class="badge ${p.statut==='present'?'bg':'bn'}">${p.statut==='present'?'Présent':'Parti'}</span></div><div class="li-sub">${escapeHtml(p.jour)} • ${escapeHtml(p.creneauLabel)} • ${escapeHtml(p.motif)}${p.classe?' • '+escapeHtml(p.classe):''}<br>${p.heureArrivee}${p.heureDepart?' → '+p.heureDepart:''} • Durée : ${dureeTxt}</div>${p.statut==='present'?`<div class="actions"><button class="btn-xs b-y" onclick="forcerDepart('${p.id}')">Clôturer (départ maintenant)</button></div>`:''}</div>`;
  }).join('') : `<div class="empty">Aucun pointage aujourd'hui</div>`;
}
function forcerDepart(id){
  const p=DB.presences.find(x=>x.id===id); if(!p) return;
  p.heureDepart=nowTimeStr(); p.tsDepart=nowFull(); p.dureeMin=Math.max(0,Math.round((p.tsDepart-p.tsArrivee)/60000)); p.statut='parti';
  saveDB(); renderAdMembres(); toast('Départ enregistré','ok');
}

/* ================= RAPPORTS / EXPOSÉS ================= */
const OUVERT = s => s==='depose'||s==='en_correction';
const CORRIGE = s => s==='corrige_complet'||s==='corrige_partiel'||s==='retire';
function fillDocFilters(kind){
  const p = kind==='expose'?'ade':'adr';
  const fc=document.getElementById(p+'-fc'), fs=document.getElementById(p+'-fs');
  const vc=fc.value, vs=fs.value;
  fc.innerHTML=commissionOptions(true, vc);
  const st = kind==='rapport' ? ['definitif','depose','en_correction','corrige_complet','corrige_partiel','retire','clos'] : ['depose','en_correction','corrige_complet','corrige_partiel','retire'];
  fs.innerHTML=`<option value="">Tous les statuts</option>`+st.map(s=>`<option value="${s}"${s===vs?' selected':''}>${statutLabel(s)[0]}</option>`).join('');
}
function renderAdDocs(kind){
  const data = kind==='expose' ? DB.expositions : DB.rapports;
  const pfx = kind==='expose' ? 'ade' : 'adr';
  const late = x => OUVERT(x.statut) && joursDepuis(x.tsDepot)>=RETARD_JOURS;
  document.getElementById(pfx+'-depose').textContent=data.filter(x=>x.statut==='depose').length;
  document.getElementById(pfx+'-encours').textContent=data.filter(x=>x.statut==='en_correction').length;
  document.getElementById(pfx+'-corrige').textContent=data.filter(x=>CORRIGE(x.statut)).length;
  document.getElementById(pfx+'-retard').textContent=data.filter(late).length;
  if(kind==='rapport'){
    document.getElementById('adr-definitif').textContent=data.filter(x=>x.statut==='definitif').length;
    document.getElementById('adr-manquant').textContent=etudiantsSansDefinitif().length;
  }
  const q=normName(document.getElementById(pfx+'-q').value);
  const fc=document.getElementById(pfx+'-fc').value, fs=document.getElementById(pfx+'-fs').value;
  let list=data.slice();
  if(q) list=list.filter(x=>normName(x.etudiantNom).includes(q)||normName(x.numero).includes(q));
  if(fc) list=list.filter(x=>x.commission===fc);
  if(fs) list=list.filter(x=>x.statut===fs);
  list.sort((a,b)=>(b.tsDepot||0)-(a.tsDepot||0) || String(a.etudiantNom).localeCompare(b.etudiantNom));
  const total=list.length; const LIMIT=200; const shown=list.slice(0,LIMIT);
  const listId = kind==='expose' ? 'ad-e-list' : 'ad-r-list';
  document.getElementById(listId).innerHTML = (shown.length ? shown.map(x=>{
    const [lbl,cls]=statutLabel(x.statut);
    const resp = x.responsable || responsableOf(x.commission);
    const acts=[];
    if(kind==='rapport' && x.statut!=='definitif') acts.push(`<button class="btn-xs b-ok" onclick="marquerDefinitif('${x.id}')">✔ Marquer définitif</button>`);
    if(kind==='rapport' && x.statut==='definitif') acts.push(`<button class="btn-xs b-y" onclick="annulerDefinitif('${x.id}')">Annuler « définitif »</button>`);
    if(x.statut==='en_correction') acts.push(`<button class="btn-xs b-y" onclick="libererDoc('${kind}','${x.id}')">Libérer (remettre à corriger)</button>`);
    acts.push(`<button class="btn-xs b-del" onclick="supprimerDoc('${kind}','${x.id}')">🗑 Supprimer</button>`);
    const photos = (x.photos||[]).length ? ` • <a href="${escapeHtml(x.photos[0])}" target="_blank">📷 ${x.photos.length} photo(s)</a>` : '';
    return `<div class="list-item"><div class="li-top"><div class="li-name">${escapeHtml(x.etudiantNom)}</div><span class="badge ${cls}">${lbl}</span></div><div class="li-sub">${escapeHtml(x.numero)} • ${escapeHtml(x.phase||'')}${x.classe?' • '+escapeHtml(x.classe):''}${x.commission?' • <b>'+escapeHtml(x.commission)+'</b>':''}${resp?' • Resp. : '+escapeHtml(resp):''}${x.lieu?' • '+escapeHtml(x.lieu):''}<br>${x.source==='import'?'Importé de la liste officielle':'Déposé le '+frDate(x.dateDepot)}${x.correcteur?' • Correcteur : '+escapeHtml(x.correcteur):''}${x.dateCorrection?' • Corrigé le '+frDate(x.dateCorrection):''}${x.dateRetrait?' • Retiré le '+frDate(x.dateRetrait):''}${photos}${late(x)?' • <span style="color:var(--RED);font-weight:700;">⚠ En retard</span>':''}</div><div class="actions">${acts.join('')}</div></div>`;
  }).join('') : `<div class="empty">Aucun document</div>`) + (total>LIMIT?`<div class="empty">${total-LIMIT} autres résultats — affinez la recherche.</div>`:'');
  renderCommissionBreakdown(kind);
}
function marquerDefinitif(id){
  const x=DB.rapports.find(r=>r.id===id); if(!x) return;
  if(!confirm(`Marquer le rapport de ${x.etudiantNom} comme DÉFINITIF ?\nIl n'apparaîtra plus dans l'espace correction.`)) return;
  const dejaDef=rapportDefinitifDe(x.etudiantNom);
  x.statut='definitif'; x.phase='Dépôt définitif';
  DB.rapports.forEach(r=>{ if(r!==x && normName(r.etudiantNom)===normName(x.etudiantNom) && OUVERT(r.statut)) r.statut='clos'; });
  if(dejaDef && dejaDef!==x && dejaDef.source==='import'){ removeRecord('rapports', dejaDef.id); }
  saveDB(); renderAdDocs('rapport'); toast('Rapport marqué définitif','ok');
}
function annulerDefinitif(id){
  const x=DB.rapports.find(r=>r.id===id); if(!x) return;
  if(!confirm(`Retirer le statut « définitif » du rapport de ${x.etudiantNom} ?\nIl repassera « à corriger ».`)) return;
  x.statut='depose'; x.phase='1ère correction'; x.tsDepot=x.tsDepot||nowFull();
  saveDB(); renderAdDocs('rapport'); toast('Statut modifié','ok');
}
function libererDoc(kind,id){
  const data = kind==='expose' ? DB.expositions : DB.rapports;
  const x=data.find(r=>r.id===id); if(!x) return;
  x.statut='depose'; x.correcteur='';
  saveDB(); renderAdDocs(kind); toast('Document remis dans la liste « à corriger »','ok');
}
function supprimerDoc(kind,id){
  const coll = kind==='expose' ? 'expositions' : 'rapports';
  const x=DB[coll].find(r=>r.id===id); if(!x) return;
  if(!confirm(`Supprimer définitivement ${x.numero} (${x.etudiantNom}) ?`)) return;
  removeRecord(coll,id); saveDB(); renderAdDocs(kind); toast('Supprimé','ok');
}
function etudiantsSansDefinitif(){
  const defs=new Set(DB.rapports.filter(r=>r.statut==='definitif').map(r=>normName(r.etudiantNom)));
  return DB.etudiants.filter(e=>!defs.has(normName(e.nom)));
}
function commissionBreakdownRows(kind){
  const data = kind==='expose' ? DB.expositions : DB.rapports;
  return DB.commissions.map(c=>{
    const mine=data.filter(x=>normName(x.commission)===normName(c.nom));
    const n = kind==='rapport' ? mine.filter(x=>x.statut==='definitif').length : mine.length;
    const total=attenduCommission(c);
    const pct = total>0 ? Math.round((n/total)*100) : null;
    return {nom:c.nom, responsable:c.responsable||'', total, n, pct};
  });
}
function renderCommissionBreakdown(kind){
  const el=document.getElementById(kind==='expose' ? 'ad-e-commission' : 'ad-r-commission');
  const rows=commissionBreakdownRows(kind);
  const lbl = kind==='rapport' ? 'Définitifs' : 'Déposés';
  el.innerHTML = rows.length ? `<table class="rep-table"><thead><tr><th>Commission</th><th>Responsable</th><th>Effectif</th><th>${lbl}</th><th>%</th></tr></thead><tbody>${rows.map(r=>`<tr><td style="text-align:left;">${escapeHtml(r.nom)}</td><td style="text-align:left;">${escapeHtml(r.responsable)}</td><td>${r.total||'—'}</td><td>${r.n}</td><td>${r.pct!==null?r.pct+'%':'—'}</td></tr>`).join('')}</tbody></table>` : `<div class="empty">Aucune commission configurée</div>`;
}

/* ================= ÉTUDIANTS ================= */
function renderAdEtudiants(refillSelects){
  document.getElementById('ads-total').textContent=DB.etudiants.length;
  document.getElementById('ads-com').textContent=DB.commissions.length;
  if(refillSelects){
    const fc=document.getElementById('ads-fc'); const v=fc.value; fc.innerHTML=commissionOptions(true,v);
    const nc=document.getElementById('ads-new-com'); const v2=nc.value; nc.innerHTML=commissionOptions(false,v2);
  }
  const q=normName(document.getElementById('ads-q').value), fc=document.getElementById('ads-fc').value;
  const defs=new Set(DB.rapports.filter(r=>r.statut==='definitif').map(r=>normName(r.etudiantNom)));
  let html='';
  const groups = DB.commissions.map(c=>c.nom);
  DB.etudiants.forEach(e=>{ if(!groups.includes(e.commission)) groups.push(e.commission); });
  groups.forEach(g=>{
    if(fc && g!==fc) return;
    const list=DB.etudiants.filter(e=>e.commission===g && (!q || normName(e.nom).includes(q)));
    if(!list.length) return;
    html+=`<div class="grp-h">${escapeHtml(String(g||'Sans commission').toUpperCase())} — Responsable : ${escapeHtml(responsableOf(g)||'—')} (${list.length})</div>`;
    html+=list.map(e=>`<div class="list-item" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;"><div style="flex:1;min-width:180px;"><div class="li-name" style="font-size:13.5px;">${escapeHtml(e.nom)}</div><div class="li-sub">${defs.has(normName(e.nom))?'<span class="badge bg">Rapport définitif</span>':'<span class="badge br">Pas de rapport définitif</span>'}</div></div><select class="inline-in" onchange="changerCommissionEtudiant('${e.id}',this.value)">${commissionOptions(false,e.commission)}</select><button class="btn-xs b-del" onclick="supprimerEtudiant('${e.id}')">🗑</button></div>`).join('');
  });
  document.getElementById('ads-list').innerHTML = html || `<div class="empty">Aucun étudiant</div>`;
}
function addEtudiant(){
  const nom=document.getElementById('ads-new-nom').value.trim();
  const com=document.getElementById('ads-new-com').value;
  if(!nom){ toast('Nom requis','ko'); return; }
  if(!com){ toast('Commission requise','ko'); return; }
  if(DB.etudiants.some(e=>normName(e.nom)===normName(nom))){ toast('Cet étudiant existe déjà','ko'); return; }
  DB.etudiants.push({id:nid(),nom,commission:com});
  saveDB(); document.getElementById('ads-new-nom').value=''; renderAdEtudiants(); toast('Étudiant ajouté','ok');
}
function changerCommissionEtudiant(id,com){
  const e=DB.etudiants.find(x=>x.id===id); if(!e) return;
  e.commission=com;
  DB.rapports.forEach(r=>{ if(normName(r.etudiantNom)===normName(e.nom)) r.commission=com; });
  saveDB(); renderAdEtudiants(); toast('Commission modifiée','ok');
}
function supprimerEtudiant(id){
  const e=DB.etudiants.find(x=>x.id===id); if(!e) return;
  if(!confirm(`Retirer ${e.nom} de la liste des étudiants ?\n(ses dépôts éventuels sont conservés)`)) return;
  removeRecord('etudiants',id); saveDB(); renderAdEtudiants(); toast('Étudiant retiré','ok');
}

/* ================= CONFIGURATION ================= */
function renderAdCommissions(){
  const el=document.getElementById('ad-co-list');
  el.innerHTML = DB.commissions.length ? DB.commissions.map((c,i)=>`
    <div class="list-item" style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 0;flex-wrap:wrap;">
      <div style="flex:1;min-width:200px;">
        <div class="li-name" style="font-size:13.5px;">${escapeHtml(c.nom)} <span class="hint">(${effectifCommission(c.nom)} étudiants)</span></div>
        <div class="li-sub" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">Responsable : <input class="inline-in" type="text" value="${escapeHtml(c.responsable||'')}" style="width:220px;" onchange="updateCommission('${c.id}','responsable',this.value)">
        Total attendu : <input class="inline-in" type="number" min="0" value="${c.totalAttendu||''}" placeholder="${effectifCommission(c.nom)}" style="width:70px;" onchange="updateCommission('${c.id}','totalAttendu',this.value)"></div>
      </div>
      <button class="btn-sm" style="background:var(--REDP);color:var(--RED);" onclick="removeCommission('${c.id}')">🗑</button>
    </div>`).join('') : `<div class="empty">Aucune commission configurée</div>`;
}
function addCommission(){
  const nom=document.getElementById('ad-co-new-nom').value.trim();
  const resp=document.getElementById('ad-co-new-resp').value.trim();
  if(!nom){ toast('Nom requis','ko'); return; }
  if(commissionByName(nom)){ toast('Cette commission existe déjà','ko'); return; }
  DB.commissions.push({id:nid(), nom, responsable:resp, totalAttendu:0});
  saveDB(); document.getElementById('ad-co-new-nom').value=''; document.getElementById('ad-co-new-resp').value=''; renderAdCommissions();
  toast('Commission ajoutée','ok');
}
function updateCommission(id, field, val){
  const c=DB.commissions.find(x=>x.id===id); if(!c) return;
  c[field] = field==='totalAttendu' ? (parseInt(val)||0) : String(val).trim();
  saveDB(); toast('Enregistré','ok');
}
function removeCommission(id){
  const c=DB.commissions.find(x=>x.id===id); if(!c) return;
  const n=effectifCommission(c.nom);
  if(!confirm(`Supprimer la commission « ${c.nom} » ?${n?`\n${n} étudiant(s) y sont encore rattachés.`:''}`)) return;
  DB.commissions=DB.commissions.filter(x=>x.id!==id); saveDB(); renderAdCommissions();
  toast('Supprimée','ok');
}
function renderAdMembresConfig(){
  const el=document.getElementById('ad-mb-list');
  el.innerHTML = DB.membres.length ? DB.membres.map(m=>`
    <div class="list-item" style="display:flex;align-items:center;gap:8px;padding:10px 0;flex-wrap:wrap;">
      <input class="inline-in" type="text" value="${escapeHtml(m.nom)}" style="flex:1;min-width:160px;" onchange="updateMembre('${m.id}','nom',this.value)">
      <span class="hint">Code :</span><input class="inline-in" type="text" inputmode="numeric" value="${escapeHtml(m.code)}" style="width:80px;" onchange="updateMembre('${m.id}','code',this.value)">
      <button class="btn-xs b-del" onclick="removeMembre('${m.id}')">🗑</button>
    </div>`).join('') : `<div class="empty">Aucun membre</div>`;
}
function addMembre(){
  const nom=document.getElementById('ad-mb-new-nom').value.trim();
  const code=document.getElementById('ad-mb-new-code').value.trim();
  if(!nom||!code){ toast('Nom et code requis','ko'); return; }
  DB.membres.push({id:nid(),nom,code});
  saveDB(); document.getElementById('ad-mb-new-nom').value=''; document.getElementById('ad-mb-new-code').value=''; renderAdMembresConfig();
  toast('Membre ajouté','ok');
}
function updateMembre(id,field,val){
  const m=DB.membres.find(x=>x.id===id); if(!m) return;
  val=String(val).trim(); if(!val){ toast('Valeur requise','ko'); renderAdMembresConfig(); return; }
  m[field]=val; saveDB(); toast('Enregistré','ok');
}
function removeMembre(id){
  const m=DB.membres.find(x=>x.id===id); if(!m) return;
  if(!confirm(`Supprimer le membre ${m.nom} ?`)) return;
  removeRecord('membres',id); saveDB(); renderAdMembresConfig(); toast('Supprimé','ok');
}
function changeAdminCode(){
  const v=document.getElementById('ad-newcode').value.trim();
  if(v.length<4){ toast('Le code doit contenir au moins 4 caractères','ko'); return; }
  DB.adminCode=v; saveDB(); document.getElementById('ad-newcode').value=''; toast('Code administrateur modifié','ok');
}

function renderAdCreneaux(){
  document.getElementById('ad-cr-list').innerHTML = DB.creneaux.map(c=>`
    <div class="cr-edit">
      <label>${escapeHtml(c.jour)} — ${escapeHtml(c.label)}</label>
      <input type="time" value="${c.debut}" onchange="saveCreneau('${c.id}','debut',this.value)">
      <input type="time" value="${c.fin}" onchange="saveCreneau('${c.id}','fin',this.value)">
    </div>`).join('');
}
function saveCreneau(id,f,v){
  const c=DB.creneaux.find(x=>x.id===id); if(!c||!v) return;
  c[f]=v; c.label = c.debut.replace(':','h')+' - '+c.fin.replace(':','h');
  saveDB(); renderAdCreneaux(); toast('Créneau mis à jour','ok');
}

function renderAdEglises(){
  const el=document.getElementById('ad-eg-list');
  el.innerHTML = DB.eglises.length ? DB.eglises.map((n,i)=>`<div class="list-item" style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;"><div class="li-name" style="font-size:13.5px;">${escapeHtml(n)}</div><button class="btn-sm" style="background:var(--REDP);color:var(--RED);" onclick="removeEglise(${i})">🗑</button></div>`).join('') : `<div class="empty">Aucune église fille configurée</div>`;
}
function addEglise(){
  const inp=document.getElementById('ad-eg-new');
  const v=inp.value.trim();
  if(!v){ toast('Nom requis','ko'); return; }
  if(DB.eglises.some(e=>normName(e)===normName(v))){ toast('Cette église existe déjà','ko'); return; }
  DB.eglises.push(v); saveDB(); inp.value=''; renderAdEglises();
  toast('Église fille ajoutée','ok');
}
function removeEglise(i){
  if(!confirm('Supprimer cette église fille ?')) return;
  DB.eglises.splice(i,1); saveDB(); renderAdEglises();
  toast('Supprimée','ok');
}

/* ================= SÉANCES DE MÉTHODOLOGIE ================= */
function signalerReprise(){
  const classe=document.getElementById('se-classe').value;
  const dateReprise=document.getElementById('se-date-reprise').value;
  const salle=document.getElementById('se-salle').value.trim();
  if(!dateReprise){ toast('Date de reprise requise','ko'); return; }
  if(!salle){ toast('Salle requise','ko'); return; }
  const dateProgrammee=addDaysStr(dateReprise,7);
  DB.sessions.push({id:nid(), classe, numero:1, dateProgrammee, salle, statut:'programmee', presentateur:'', dateValidation:''});
  saveDB();
  document.getElementById('se-date-reprise').value=''; document.getElementById('se-salle').value='';
  renderAdSeances();
  toast(`1er passage programmé le ${frDate(dateProgrammee)} pour ${classe}`,'ok');
}
function renderAdSeances(){
  const el=document.getElementById('ad-se-list');
  const sorted=DB.sessions.slice().sort((a,b)=>String(b.dateProgrammee).localeCompare(a.dateProgrammee));
  el.innerHTML = sorted.length ? `<div style="display:flex;flex-direction:column;gap:10px;">${sorted.map(s=>`
    <div class="list-item" style="border:1px solid var(--LINE);border-radius:10px;">
      <div class="li-top"><div class="li-name">${escapeHtml(s.classe)} — Passage n°${s.numero}</div><span class="badge ${s.statut==='validee'?'bg':'by'}">${s.statut==='validee'?'Présentation validée':'Programmée'}</span></div>
      <div class="li-sub" style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        Date : <input class="inline-in" type="date" value="${s.dateProgrammee}" onchange="saveSeance('${s.id}','dateProgrammee',this.value)">
        Salle : <input class="inline-in" type="text" value="${escapeHtml(s.salle||'')}" style="width:110px;" onchange="saveSeance('${s.id}','salle',this.value)">
        <button class="btn-xs b-del" onclick="supprimerSeance('${s.id}')">🗑</button>
      </div>
      ${s.statut==='validee' ? `<div class="li-sub">Présenté par ${escapeHtml(s.presentateur||'—')} le ${frDate(s.dateValidation)}</div>` : ''}
    </div>`).join('')}</div>` : `<div class="empty">Aucune séance programmée pour le moment</div>`;
}
function saveSeance(id,f,v){
  const s=DB.sessions.find(x=>x.id===id); if(!s) return;
  s[f]=v; saveDB(); toast('Séance mise à jour','ok');
}
function supprimerSeance(id){
  if(!confirm('Supprimer cette séance ?')) return;
  removeRecord('sessions',id); saveDB(); renderAdSeances();
}
function saveSeances(){ saveDB(); toast('Séances enregistrées','ok'); }

/* ================= VISITES DANS LES ÉGLISES FILLES ================= */
function egliseCount(coll,nom){ return DB[coll].filter(x=>x.lieu==='Église fille — '+nom).length; }
function renderEgliseStats(){
  const el=document.getElementById('ad-eg-stats');
  el.innerHTML = DB.eglises.length ? `<table class="rep-table"><thead><tr><th>Église fille</th><th>Exposés déposés</th><th>Rapports déposés</th></tr></thead><tbody>${DB.eglises.map(n=>`<tr><td style="text-align:left;">${escapeHtml(n)}</td><td>${egliseCount('expositions',n)}</td><td>${egliseCount('rapports',n)}</td></tr>`).join('')}</tbody></table>` : `<div class="empty">Aucune église fille configurée</div>`;
}
function fillVisiteEgliseSelect(){
  const sel=document.getElementById('vi-eglise'); const v=sel.value;
  sel.innerHTML = DB.eglises.length ? DB.eglises.map(n=>`<option value="${escapeHtml(n)}"${n===v?' selected':''}>${escapeHtml(n)} (${egliseCount('expositions',n)} exposés)</option>`).join('') : `<option value="">Aucune église fille</option>`;
}
function addVisite(){
  const eglise=document.getElementById('vi-eglise').value;
  const date=document.getElementById('vi-date').value;
  const note=document.getElementById('vi-note').value.trim();
  if(!eglise){ toast('Église requise','ko'); return; }
  if(!date){ toast('Date requise','ko'); return; }
  DB.visites.push({id:nid(), eglise, date, note, statut:'programmee'});
  saveDB();
  document.getElementById('vi-date').value=''; document.getElementById('vi-note').value='';
  renderAdVisites();
  toast('Visite programmée','ok');
}
function renderAdVisites(){
  const el=document.getElementById('ad-vi-list');
  const sorted=DB.visites.slice().sort((a,b)=>String(a.date).localeCompare(b.date));
  el.innerHTML = sorted.length ? sorted.map(v=>`
    <div class="list-item"><div class="li-top"><div class="li-name">${escapeHtml(v.eglise)}</div><span class="badge ${v.statut==='effectuee'?'bg':'by'}">${v.statut==='effectuee'?'Effectuée':'Programmée'}</span></div>
    <div class="li-sub">Le ${frDate(v.date)}${v.note?' — '+escapeHtml(v.note):''}</div>
    <div class="actions">${v.statut!=='effectuee' ? `<button class="btn-xs b-ok" onclick="marquerVisiteEffectuee('${v.id}')">Marquer comme effectuée</button>` : ''}<button class="btn-xs b-del" onclick="supprimerVisite('${v.id}')">🗑</button></div>
    </div>`).join('') : `<div class="empty">Aucune visite programmée</div>`;
}
function marquerVisiteEffectuee(id){
  const v=DB.visites.find(x=>x.id===id); if(!v) return;
  v.statut='effectuee'; saveDB(); renderAdVisites();
  toast('Visite marquée comme effectuée','ok');
}
function supprimerVisite(id){
  if(!confirm('Supprimer cette visite ?')) return;
  removeRecord('visites',id); saveDB(); renderAdVisites();
}

/* ================================================================
   EXPORTS WORD / EXCEL / IMPRESSION
   ================================================================ */
function genLine(){ const d=new Date(); return `Académie Vases d'Honneur — Commission Exposé • Généré le ${frDate(todayStr())} à ${pad(d.getHours())}h${pad(d.getMinutes())}`; }
const W = (label,width,align)=>({label,width,align});

function modelDefinitifs(){
  const defs=DB.rapports.filter(r=>r.statut==='definitif');
  const byCom = nom => defs.filter(r=>normName(r.commission)===normName(nom)).sort((a,b)=>String(a.etudiantNom).localeCompare(b.etudiantNom,'fr'));
  const coms=DB.commissions.slice();
  defs.forEach(r=>{ if(r.commission && !coms.find(c=>normName(c.nom)===normName(r.commission))) coms.push({nom:r.commission,responsable:''}); });
  const sans=etudiantsSansDefinitif();
  const synth=coms.map(c=>{ const n=byCom(c.nom).length, eff=effectifCommission(c.nom); return [c.nom, c.responsable||'—', eff, n, Math.max(0,eff-n)]; });
  const tot=['TOTAL','', synth.reduce((s,r)=>s+r[2],0), synth.reduce((s,r)=>s+r[3],0), synth.reduce((s,r)=>s+r[4],0)];
  const cols=[W('N°',1,'center'),W("Nom de l'étudiant",6.6),W('Commission',3.6),W('Responsable de commission',4.4),W('Date de dépôt',2.4,'center')];
  const sections=[{heading:'Synthèse par commission',columns:[W('Commission',4.5),W('Responsable',5.5),W('Effectif',2,'center'),W('Définitifs',2.2,'center'),W('Manquants',2.2,'center')],rows:synth,total:tot}];
  coms.forEach((c,ci)=>{
    const list=byCom(c.nom); if(!list.length) return;
    const resp=c.responsable||'—';
    sections.push({heading:`${String(c.nom).toUpperCase()} — Responsable : ${resp} (${list.length})`,columns:cols,
      rows:list.map((r,i)=>[i+1,r.etudiantNom,r.commission,resp,r.source==='import'?'Liste officielle':frDate(r.dateDepot)])});
  });
  if(sans.length) sections.push({heading:`Étudiants sans rapport définitif (${sans.length})`,columns:[W('N°',1,'center'),W("Nom de l'étudiant",7),W('Commission',4),W('Responsable de commission',5)],rows:sans.map((e,i)=>[i+1,e.nom,e.commission,responsableOf(e.commission)||'—'])});
  const flat=[]; coms.forEach(c=>byCom(c.nom).forEach(r=>flat.push(r)));
  const xcols=[W('N°',6,'center'),W("Nom de l'étudiant",38),W('Commission',22),W('Responsable de commission',30),W('N° dossier',18),W('Date de dépôt',14,'center'),W('Lieu de dépôt',24)];
  const parCom=[]; let k=0;
  coms.forEach(c=>{ const list=byCom(c.nom); if(!list.length) return; parCom.push({__section:`${String(c.nom).toUpperCase()} — Responsable : ${c.responsable||'—'} (${list.length})`}); list.forEach((r,i)=>parCom.push([i+1,r.etudiantNom,r.commission,c.responsable||'—',r.numero,r.source==='import'?'Liste officielle':frDate(r.dateDepot),r.lieu||''])); });
  return {
    title:'Rapports de stage définitifs — liste par commission',
    subtitle:`${genLine()} • ${defs.length} rapport(s) définitif(s) pour ${DB.etudiants.length} étudiant(s)`,
    fileName:'Rapports_stage_definitifs_par_commission',
    sections,
    sheets:[
      {name:'Synthèse',title:'Rapports de stage définitifs — synthèse par commission',columns:[W('Commission',26),W('Responsable',32),W('Effectif',11,'center'),W('Définitifs',12,'center'),W('Manquants',12,'center')],rows:synth,total:tot},
      {name:'Par commission',title:'Rapports de stage définitifs — par commission',columns:xcols,rows:parCom},
      {name:'Liste complète',title:'Rapports de stage définitifs — liste complète',columns:xcols,rows:flat.map((r,i)=>[i+1,r.etudiantNom,r.commission,responsableOf(r.commission)||'—',r.numero,r.source==='import'?'Liste officielle':frDate(r.dateDepot),r.lieu||''])},
      {name:'Sans définitif',title:'Étudiants sans rapport de stage définitif',columns:[W('N°',6,'center'),W("Nom de l'étudiant",40),W('Commission',24),W('Responsable de commission',32)],rows:sans.map((e,i)=>[i+1,e.nom,e.commission,responsableOf(e.commission)||'—'])}
    ]
  };
}
function suiviRows(kind){
  const data=(kind==='expose'?DB.expositions:DB.rapports).slice().sort((a,b)=>(a.tsDepot||0)-(b.tsDepot||0));
  return data.map((x,i)=>{
    const base=[i+1,x.numero,x.etudiantNom,x.commission||'',x.responsable||responsableOf(x.commission)||'',x.phase||'',statutLabel(x.statut)[0],x.lieu||'',x.source==='import'?'Liste officielle':frDate(x.dateDepot),x.correcteur||'',frDate(x.dateCorrection),frDate(x.dateRetrait),x.commentaire||''];
    if(kind==='expose') base.splice(8,0,(x.themes||[]).join('\n'), x.moderateur||'');
    return base;
  });
}
function modelSuivi(kind){
  const isE=kind==='expose';
  const cols=[W('N°',0.8,'center'),W('N° dossier',2.6),W('Étudiant',4),W('Commission',2.6),W('Responsable',3),W('Phase',2.2),W('Statut',2.4),W('Lieu',2.6)];
  if(isE) cols.push(W('Thèmes',3.4),W('Modérateur',2.4));
  cols.push(W('Déposé le',2,'center'),W('Correcteur',2.6),W('Corrigé le',2,'center'),W('Retiré le',2,'center'),W('Commentaire',3.4));
  const rows=suiviRows(kind);
  const titre = isE ? 'Suivi des exposés' : 'Suivi des rapports de stage';
  const xcols=cols.map(c=>W(c.label,Math.round(c.width*4.2),c.align));
  const data=isE?DB.expositions:DB.rapports;
  const st={}; data.forEach(x=>{ const l=statutLabel(x.statut)[0]; st[l]=(st[l]||0)+1; });
  return {title:titre, subtitle:`${genLine()} • ${rows.length} document(s)`, landscape:true, fileName:isE?'Suivi_exposes':'Suivi_rapports_de_stage',
    sections:[{heading:'Répartition par statut',columns:[W('Statut',6),W('Nombre',3,'center')],rows:Object.entries(st)},{heading:'Détail',columns:cols,rows,empty:'Aucun document enregistré.'}],
    sheets:[{name:titre,title:titre,columns:xcols,rows},{name:'Par statut',title:titre+' — répartition par statut',columns:[W('Statut',30),W('Nombre',12,'center')],rows:Object.entries(st)}]};
}
function modelEtudiants(){
  const cols=[W('N°',1,'center'),W("Nom de l'étudiant",7.4),W('Commission',4),W('Responsable de commission',5.5)];
  const sections=[]; const parCom=[];
  DB.commissions.forEach(c=>{
    const list=DB.etudiants.filter(e=>e.commission===c.nom);
    if(!list.length) return;
    const h=`${String(c.nom).toUpperCase()} — Responsable : ${c.responsable||'—'} (${list.length})`;
    sections.push({heading:h,columns:cols,rows:list.map((e,i)=>[i+1,e.nom,e.commission,c.responsable||'—'])});
    parCom.push({__section:h}); list.forEach((e,i)=>parCom.push([i+1,e.nom,e.commission,c.responsable||'—']));
  });
  return {title:"Étudiants par commission",subtitle:`${genLine()} • ${DB.etudiants.length} étudiants répartis en ${sections.length} commissions`,fileName:'Etudiants_par_commission',sections,
    sheets:[{name:'Par commission',title:'Étudiants par commission',columns:[W('N°',6,'center'),W("Nom de l'étudiant",42),W('Commission',24),W('Responsable de commission',32)],rows:parCom},
            {name:'Liste',title:'Liste des étudiants',columns:[W('N°',6,'center'),W("Nom de l'étudiant",42),W('Commission',24),W('Responsable de commission',32)],rows:DB.etudiants.map((e,i)=>[i+1,e.nom,e.commission,responsableOf(e.commission)||'—'])}]};
}
function modelPresences(year,month){
  const inP = p => p.date && p.date.substring(0,4)===String(year) && (month==='' || parseInt(p.date.substring(5,7))-1===parseInt(month));
  const list=DB.presences.filter(inP).sort((a,b)=>(a.tsArrivee||0)-(b.tsArrivee||0));
  const dur = m => m ? Math.floor(m/60)+'h'+pad(m%60) : '';
  const rows=list.map((p,i)=>[i+1,frDate(p.date),p.jour,p.membreNom,p.creneauLabel,p.motif,p.classe||'',p.heureArrivee,p.heureDepart||'(en cours)',dur(p.dureeMin)]);
  const byM={}; list.forEach(p=>{ const o=byM[p.membreNom]||(byM[p.membreNom]={n:0,min:0}); o.n++; o.min+=p.dureeMin||0; });
  const synth=Object.entries(byM).sort((a,b)=>b[1].min-a[1].min).map(([n,o])=>[n,o.n,dur(o.min)||'0h00']);
  const periode = month==='' ? 'Année '+year : MOIS_LBL[month]+' '+year;
  const cols=[W('N°',0.8,'center'),W('Date',2,'center'),W('Jour',1.8),W('Membre',4),W('Créneau',2.8),W('Motif',4),W('Classe',1.8),W('Arrivée',1.5,'center'),W('Départ',1.7,'center'),W('Durée',1.5,'center')];
  return {title:'Journal de présence des membres — '+periode,subtitle:`${genLine()} • ${list.length} pointage(s)`,landscape:true,fileName:'Presences_'+safeFileName(periode),
    sections:[{heading:'Synthèse par membre',columns:[W('Membre',8),W('Pointages',3,'center'),W('Heures cumulées',4,'center')],rows:synth,empty:'Aucun pointage sur la période.'},{heading:'Détail des pointages',columns:cols,rows,empty:'Aucun pointage sur la période.'}],
    sheets:[{name:'Pointages',title:'Journal de présence — '+periode,columns:cols.map(c=>W(c.label,Math.round(c.width*4.5),c.align)),rows},{name:'Synthèse membres',title:'Synthèse par membre — '+periode,columns:[W('Membre',36),W('Pointages',12,'center'),W('Heures cumulées',18,'center')],rows:synth}]};
}
function modelAnnuel(year){
  const inYear = ds => ds && ds.substring(0,4)===String(year);
  const mk=()=>Array.from({length:12},()=>({depose:0,corrige:0,definitif:0}));
  const mExp=mk(), mRap=mk();
  DB.expositions.forEach(x=>{ if(inYear(x.dateDepot)){ const m=parseInt(x.dateDepot.substring(5,7))-1; mExp[m].depose++; if(CORRIGE(x.statut)) mExp[m].corrige++; }});
  DB.rapports.forEach(x=>{ if(inYear(x.dateDepot)){ const m=parseInt(x.dateDepot.substring(5,7))-1; mRap[m].depose++; if(CORRIGE(x.statut)) mRap[m].corrige++; if(x.statut==='definitif') mRap[m].definitif++; }});
  const mPres=Array.from({length:12},()=>({heures:0,pointages:0}));
  DB.presences.forEach(p=>{ if(inYear(p.date)){ const m=parseInt(p.date.substring(5,7))-1; mPres[m].pointages++; mPres[m].heures+=(p.dureeMin||0)/60; }});
  const rows=MOIS_LBL.map((l,i)=>[l,mExp[i].depose,mExp[i].corrige,mRap[i].depose,mRap[i].corrige,mRap[i].definitif,mPres[i].pointages,Math.round(mPres[i].heures*10)/10]);
  const sum=j=>rows.reduce((s,r)=>s+r[j],0);
  const total=['TOTAL',sum(1),sum(2),sum(3),sum(4),sum(5),sum(6),Math.round(sum(7)*10)/10];
  const cols=[W('Mois',2.6),W('Exposés déposés',2,'center'),W('Exposés corrigés',2,'center'),W('Rapports déposés',2,'center'),W('Rapports corrigés',2,'center'),W('Rapports définitifs',2,'center'),W('Pointages',1.8,'center'),W('Heures',1.6,'center')];
  const coE=commissionBreakdownRows('expose').map(r=>[r.nom,r.responsable,r.total||'—',r.n,r.pct!==null?r.pct+'%':'—']);
  const coR=commissionBreakdownRows('rapport').map(r=>[r.nom,r.responsable,r.total||'—',r.n,r.pct!==null?r.pct+'%':'—']);
  const coCols=lbl=>[W('Commission',4.2),W('Responsable',5.2),W('Effectif',2,'center'),W(lbl,2.2,'center'),W('%',1.6,'center')];
  return {title:`Rapport d'évolution — Année ${year}`,subtitle:genLine(),landscape:true,fileName:'Rapport_evolution_'+year,
    sections:[{heading:'Synthèse mensuelle',columns:cols,rows,total},{heading:'Rapports de stage définitifs par commission',columns:coCols('Définitifs'),rows:coR},{heading:'Exposés par commission',columns:coCols('Déposés'),rows:coE}],
    sheets:[{name:'Synthèse mensuelle',title:`Rapport d'évolution — ${year}`,columns:cols.map(c=>W(c.label,c.label==='Mois'?16:14,c.align)),rows,total},
            {name:'Rapports par commission',title:'Rapports de stage définitifs par commission',columns:[W('Commission',26),W('Responsable',32),W('Effectif',11,'center'),W('Définitifs',12,'center'),W('%',8,'center')],rows:coR},
            {name:'Exposés par commission',title:'Exposés par commission',columns:[W('Commission',26),W('Responsable',32),W('Effectif',11,'center'),W('Déposés',12,'center'),W('%',8,'center')],rows:coE}]};
}

const EXPORTS = [
  {id:'definitifs', t:'Rapports de stage définitifs — par commission', s:'Synthèse + liste par commission avec les responsables + étudiants sans définitif', m:()=>modelDefinitifs()},
  {id:'suivi_rapports', t:'Suivi complet des rapports de stage', s:'Tous les dépôts, statuts, correcteurs et dates', m:()=>modelSuivi('rapport')},
  {id:'suivi_exposes', t:'Suivi complet des exposés', s:'Tous les exposés, thèmes, modérateurs, correcteurs', m:()=>modelSuivi('expose')},
  {id:'etudiants', t:'Liste des étudiants par commission', s:'Registre des étudiants avec responsables de commission', m:()=>modelEtudiants()},
  {id:'presences', t:'Journal de présence des membres', s:'Pour l\'année et le mois choisis ci-dessus', m:()=>modelPresences(document.getElementById('ad-ex-year').value, document.getElementById('ad-ex-month').value)},
  {id:'annuel', t:'Rapport d\'évolution annuel', s:'Synthèse mensuelle et répartition par commission (année choisie)', m:()=>modelAnnuel(document.getElementById('ad-ex-year').value)}
];
function fillExportSelectors(){
  const sel=document.getElementById('ad-ex-year');
  const years=new Set([new Date().getFullYear()]);
  const add=ds=>{ const y=parseInt(String(ds||'').substring(0,4)); if(y>2000) years.add(y); };
  DB.presences.forEach(p=>add(p.date)); DB.expositions.forEach(x=>add(x.dateDepot)); DB.rapports.forEach(x=>add(x.dateDepot));
  const sorted=Array.from(years).sort((a,b)=>b-a);
  const prev=sel.value;
  sel.innerHTML=sorted.map(y=>`<option value="${y}">${y}</option>`).join('');
  if(prev && sorted.includes(parseInt(prev))) sel.value=prev;
  const ms=document.getElementById('ad-ex-month'); const pm=ms.value;
  ms.innerHTML=`<option value="">Toute l'année</option>`+MOIS_LBL.map((m,i)=>`<option value="${i}">${m}</option>`).join('');
  ms.value = pm!=null ? pm : '';
}
function renderExportList(){
  document.getElementById('ad-ex-list').innerHTML = EXPORTS.map(e=>`
    <div class="exp-row"><div><div class="exp-t">${escapeHtml(e.t)}</div><div class="exp-s">${escapeHtml(e.s)}</div></div>
    <div class="exp-btns"><button class="bw" onclick="runExport('${e.id}','docx')">📝 Word</button><button class="bx" onclick="runExport('${e.id}','xlsx')">📊 Excel</button><button class="bp" onclick="runExport('${e.id}','preview')">👁 Aperçu</button><button class="bp" onclick="runExport('${e.id}','print')">🖨 PDF</button></div></div>`).join('');
}
function runExport(id, fmt){
  const e=EXPORTS.find(x=>x.id===id); if(!e) return;
  let m;
  try{ m=e.m(); }catch(err){ console.error(err); toast('Erreur lors de la préparation du rapport','ko'); return; }
  const fname=(m.fileName||'Rapport')+'_'+todayStr();
  try{
    if(fmt==='docx'){ downloadBytes(OfficeExport.buildDocx(m), fname+'.docx', OfficeExport.MIME_DOCX); toast('Fichier Word téléchargé','ok'); }
    else if(fmt==='xlsx'){ downloadBytes(OfficeExport.buildXlsx(m), fname+'.xlsx', OfficeExport.MIME_XLSX); toast('Fichier Excel téléchargé','ok'); }
    else if(fmt==='preview'){ document.getElementById('ad-ex-preview').innerHTML=OfficeExport.buildHtml(m); document.getElementById('ad-ex-preview').scrollIntoView({behavior:'smooth'}); }
    else if(fmt==='print'){
      const area=document.getElementById('print-area');
      area.innerHTML=OfficeExport.buildHtml(m);
      let st=document.getElementById('print-orient');
      if(!st){ st=document.createElement('style'); st.id='print-orient'; document.head.appendChild(st); }
      st.textContent=`@page{size:A4 ${m.landscape?'landscape':'portrait'};margin:12mm;}`;
      area.style.display='block'; window.print();
      setTimeout(()=>{ area.style.display='none'; },800);
    }
  }catch(err){ console.error(err); toast("Erreur lors de l'export",'ko'); }
}
// compatibilité avec l'ancienne interface
function renderAnnualPreview(){ runExport('annuel','preview'); }
function exportAnnualPDF(){ runExport('annuel','print'); }
function exportAnnualWord(){ runExport('annuel','docx'); }

/* ================= INIT ================= */
(function(){
  let ok=false; try{ ok=sessionStorage.getItem('CE_ADMIN')==='1'; }catch(e){}
  if(ok) showAdmin();
  updateSyncBadge();
})();
