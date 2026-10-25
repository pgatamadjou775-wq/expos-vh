/* ============================================================
   COMMISSION EXPOSÉ — Interface Administration
   Dépend de core.js (modèle de données partagé)
   ============================================================ */

function adAuth(){
  if(document.getElementById('ad-code').value.trim()!==String(DB.adminCode||ADMIN_CODE)){ toast('Code incorrect','ko'); return; }
  try{ sessionStorage.setItem('CE_ADMIN','1'); }catch(e){}
  showAdmin();
}
function showAdmin(){
  document.getElementById('ad-auth').classList.add('hidden');
  document.getElementById('ad-main').classList.remove('hidden');
  adSwitch(currentAdminTab);
}
let currentAdminTab='dashboard';
function adSwitch(tab){
  currentAdminTab=tab;
  ['dashboard','membres','expose','rapport','etudiants','config','seances','notif','export'].forEach(t=>{
    document.getElementById('ad-tab-'+t).classList.toggle('on', t===tab);
    document.getElementById('ad-'+t).classList.toggle('hidden', t!==tab);
  });
  if(tab==='dashboard') renderDashboard();
  if(tab==='membres'){ renderAdMembres(); renderAdMembresAlertes(); renderAdMembresBilan(); }
  if(tab==='expose'){ fillDocFilters('expose'); renderAdDocs('expose'); }
  if(tab==='rapport'){ fillDocFilters('rapport'); renderAdDocs('rapport'); }
  if(tab==='etudiants'){ renderAdEtudiants(true); renderDoublons('etudiants'); }
  if(tab==='notif') renderNotif();
  if(tab==='config'){ renderReglages(); renderDoublons('membres'); fillSelect('bib-new-classe',reglages().classes); fillSelect('med-new-classe',reglages().classes); fillSelect('quiz-new-classe',reglages().classes); fillSelect('bib-new-type',reglages().typesSource); }
  if(tab==='config'){ renderAdMembresManage(); renderAdCreneaux(); renderAdMotifs(); renderAdEglises(); renderAdCommissions(); renderAdBiblio(); renderAdMeditations(); renderAdQuiz(); }
  if(tab==='seances') fillSelect('se-classe', reglages().classes);
  if(tab==='seances'){ renderAdSeances(); renderAdSeancesAlertes(); renderEgliseStats(); fillSortieEgliseSelect(); renderAdSorties(); if(!document.querySelector('#se-themes-list .theme-row')) addThemeRow('se-themes-list'); }
  if(tab==='export'){ fillExportSelectors(); renderExportList(); }
}
window.onRemoteUpdate = function(){
  updateSyncBadge();
  const main=document.getElementById('ad-main');
  if(!main || main.classList.contains('hidden')) return;
  // ne pas effacer une saisie en cours (formulaires, PV, fiches membres...)
  const a=document.activeElement;
  if(a && main.contains(a) && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)) return;
  adSwitch(currentAdminTab);
};

/* ================= MEMBRES : JOURNAL DE PRÉSENCE ================= */
function renderAdMembres(){
  const today=todayStr();
  const todays=DB.presences.filter(p=>p.date===today);
  const presentNow = todays.filter(p=>p.statut==='present').length;
  document.getElementById('ad-m-present').textContent=presentNow;
  document.getElementById('ad-m-total').textContent=DB.membres.length;
  const list=document.getElementById('ad-m-list');
  const sorted = todays.slice().sort((a,b)=>b.tsArrivee-a.tsArrivee);
  list.innerHTML = sorted.length ? sorted.map(p=>{
    const dureeTxt = p.statut==='present' ? 'en cours' : Math.floor(p.dureeMin/60)+'h'+pad(p.dureeMin%60);
    return `<div class="list-item"><div class="li-top"><div class="li-name">${p.membreNom}</div><span class="badge ${p.statut==='present'?'bg':'bn'}">${p.statut==='present'?'Présent':'Parti'}</span></div><div class="li-sub">${p.jour} • ${p.creneauLabel} • ${p.motif}${p.classe?' • '+p.classe:''}<br>${p.heureArrivee}${p.heureDepart?' → '+p.heureDepart:''} • Durée : ${dureeTxt}</div></div>`;
  }).join('') : `<div class="empty">Aucun pointage aujourd'hui</div>`;
}
// Nombre de dimanches du mois en cours (jusqu'à aujourd'hui) où le membre n'a pointé aucune présence
function memberSundayAbsences(membreId){
  const now=new Date(); const year=now.getFullYear(), month=now.getMonth();
  let absences=0, total=0;
  for(let d=1; d<=now.getDate(); d++){
    const dt=new Date(year, month, d);
    if(dt.getDay()===0){
      total++;
      const ds=dt.getFullYear()+'-'+pad(dt.getMonth()+1)+'-'+pad(dt.getDate());
      const has=DB.presences.some(p=>p.membreId===membreId && p.date===ds);
      if(!has) absences++;
    }
  }
  return {absences, total};
}
function renderAdMembresAlertes(){
  const el=document.getElementById('ad-m-alertes');
  const alertes=[];
  DB.membres.forEach(m=>{
    const {absences}=memberSundayAbsences(m.id);
    if(absences>=SEUIL_ABSENCES_DIMANCHE) alertes.push(`${escapeHtml(m.nom)} n'a pointé aucune présence lors de ${absences} dimanche(s) ce mois-ci.`);
    if(niveauAlerte(m.financier)) alertes.push(`Situation financière ${m.financier.toLowerCase()} signalée pour ${escapeHtml(m.nom)}.`);
    if(niveauAlerte(m.spirituel)) alertes.push(`Situation spirituelle ${m.spirituel.toLowerCase()} signalée pour ${escapeHtml(m.nom)}.`);
  });
  el.innerHTML = alertes.length ? `<div class="alert-banner">${alertes.join('<br>')}</div>` : '';
}
function memberPeriodStats(membreId, days){
  const since = Date.now() - days*86400000;
  const recs = DB.presences.filter(p=>p.membreId===membreId && p.tsArrivee>=since);
  const heures = recs.reduce((s,p)=>s+((p.dureeMin||0)/60),0);
  return {nb:recs.length, heures};
}
function memberMonthStats(membreId){
  const now=new Date(); const ym = now.getFullYear()+'-'+pad(now.getMonth()+1);
  const recs = DB.presences.filter(p=>p.membreId===membreId && p.date && p.date.startsWith(ym));
  const heures = recs.reduce((s,p)=>s+((p.dureeMin||0)/60),0);
  return {nb:recs.length, heures};
}
function renderAdMembresBilan(){
  const el=document.getElementById('ad-m-bilan');
  el.innerHTML = DB.membres.length ? `<table class="rep-table"><thead><tr><th>Membre</th><th>Semaine (nb/h)</th><th>Mois (nb/h)</th><th>Absences dimanche</th><th>Financier</th><th>Spirituel</th></tr></thead><tbody>${DB.membres.map(m=>{
    const w=memberPeriodStats(m.id,7), mo=memberMonthStats(m.id), sa=memberSundayAbsences(m.id);
    return `<tr>
      <td style="text-align:left;">${escapeHtml(m.nom)}${m.eglise?'<br><span style=\"font-size:10px;color:var(--MUT);\">'+escapeHtml(m.eglise)+'</span>':''}${m.motifAbsence?'<br><span style=\"font-size:10px;color:var(--RED);\">'+escapeHtml(m.motifAbsence)+'</span>':''}${m.lieu?'<br><span style=\"font-size:10px;color:var(--MUT);\">'+escapeHtml(m.lieu)+'</span>':''}</td>
      <td>${w.nb} / ${w.heures.toFixed(1)}h</td>
      <td>${mo.nb} / ${mo.heures.toFixed(1)}h</td>
      <td>${sa.absences>=SEUIL_ABSENCES_DIMANCHE?'<span style="color:var(--RED);font-weight:700;">':''}${sa.absences}/${sa.total}${sa.absences>=SEUIL_ABSENCES_DIMANCHE?' </span>':''}</td>
      <td><span class="badge ${niveauBadgeClass(m.financier)}">${escapeHtml(m.financier||'Moyen')}</span></td>
      <td><span class="badge ${niveauBadgeClass(m.spirituel)}">${escapeHtml(m.spirituel||'Moyen')}</span></td>
    </tr>`;
  }).join('')}</tbody></table>` : `<div class="empty">Aucun membre enregistré</div>`;
}

/* ================= EXPOSÉS / RAPPORTS ================= */
const OUVERT = s => s==='depose'||s==='en_correction';
const CORRIGE = s => s==='corrige_complet'||s==='corrige_partiel'||s==='retire';
function respNom(x){ return (x.responsable && (x.responsable.nom||x.responsable)) || commissionResponsable(x.commission) || ''; }
function fillDocFilters(kind){
  const st = kind==='rapport' ? ['definitif','depose','en_correction','corrige_complet','corrige_partiel','retire','clos'] : ['depose','en_correction','corrige_complet','corrige_partiel','retire'];
  const fs=document.getElementById((kind==='expose'?'ade':'adr')+'-fs'); const vs=fs.value;
  fs.innerHTML=`<option value="">Tous les statuts</option>`+st.map(s=>`<option value="${s}"${s===vs?' selected':''}>${statutLabel(s)[0]}</option>`).join('');
  if(kind==='rapport'){
    const fc=document.getElementById('adr-fc'); const vc=fc.value;
    fc.innerHTML=`<option value="">Toutes les commissions</option>`+DB.commissions.map(c=>`<option value="${escapeHtml(c.nom)}"${c.nom===vc?' selected':''}>${escapeHtml(c.nom)}</option>`).join('');
  } else {
    const fl=document.getElementById('ade-fl'); const vl=fl.value;
    const lieux=Array.from(new Set(DB.expositions.map(x=>x.lieu).filter(Boolean))).sort();
    fl.innerHTML=`<option value="">Tous les lieux</option>`+lieux.map(l=>`<option value="${escapeHtml(l)}"${l===vl?' selected':''}>${escapeHtml(l)}</option>`).join('');
  }
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
  const fs=document.getElementById(pfx+'-fs').value;
  let list=data.slice();
  if(q) list=list.filter(x=>normName(x.etudiantNom).includes(q)||normName(x.numero).includes(q));
  if(fs) list=list.filter(x=>x.statut===fs);
  if(kind==='rapport'){ const fc=document.getElementById('adr-fc').value; if(fc) list=list.filter(x=>x.commission===fc); }
  else { const fl=document.getElementById('ade-fl').value; if(fl) list=list.filter(x=>x.lieu===fl); }
  list.sort((a,b)=>(b.tsDepot||0)-(a.tsDepot||0) || String(a.etudiantNom).localeCompare(b.etudiantNom,'fr'));
  const LIMIT=200, total=list.length;
  const listId = kind==='expose' ? 'ad-e-list' : 'ad-r-list';
  document.getElementById(listId).innerHTML = (total ? list.slice(0,LIMIT).map(x=>{
    const [lbl,cls]=statutLabel(x.statut);
    const r=x.responsable && typeof x.responsable==='object' ? x.responsable : null;
    const respTxt = kind==='rapport' ? ` • Resp. commission : ${escapeHtml(respNom(x)||'—')}${r&&r.tel?' ('+escapeHtml(r.tel)+')':''}` : '';
    const mandTxt = x.mandataire ? ` • Mandataire : ${escapeHtml(x.mandataire.nom)} (${escapeHtml(x.mandataire.tel||'')})` : '';
    const photos = (x.photos||[]).length ? ` • <a href="${escapeHtml(x.photos[0])}" target="_blank">${x.photos.length} photo(s)</a>` : '';
    const acts=[];
    if(kind==='rapport' && x.statut!=='definitif') acts.push(`<button class="btn-xs b-ok" onclick="marquerDefinitif('${x.id}')">Marquer définitif</button>`);
    if(kind==='rapport' && x.statut==='definitif') acts.push(`<button class="btn-xs b-y" onclick="annulerDefinitif('${x.id}')">Annuler « définitif »</button>`);
    if(x.statut==='en_correction') acts.push(`<button class="btn-xs b-y" onclick="libererDoc('${kind}','${x.id}')">Libérer (remettre à corriger)</button>`);
    acts.push(`<button class="btn-xs b-del" onclick="supprimerDoc('${kind}','${x.id}')">Supprimer</button>`);
    return `<div class="list-item"><div class="li-top"><div class="li-name">${escapeHtml(x.etudiantNom)}</div><span class="badge ${cls}">${lbl}</span></div><div class="li-sub">${escapeHtml(x.numero)}${x.classe?' • '+escapeHtml(x.classe):''} • ${escapeHtml(x.phase||'')}${x.lieu?' • '+escapeHtml(x.lieu):''}${x.commission?' • <b>'+escapeHtml(x.commission)+'</b>':''}<br>${x.source==='liste officielle'?'Enregistré depuis la liste officielle':'Déposé le '+frDate(x.dateDepot)}${x.correcteur?' • Correcteur : '+escapeHtml(x.correcteur):''}${x.dateCorrection?' • Corrigé le '+frDate(x.dateCorrection):''}${x.dateRetrait?' • Retiré le '+frDate(x.dateRetrait):''}${late(x)?' • <span style="color:var(--RED);font-weight:700;">En retard</span>':''}${respTxt}${mandTxt}${photos}</div><div class="actions">${acts.join('')}</div></div>`;
  }).join('') : `<div class="empty">Aucun document</div>`) + (total>LIMIT?`<div class="empty">${total-LIMIT} autres résultats — affinez la recherche.</div>`:'');
  if(kind==='rapport') renderCommissionBreakdown(kind);
}
function marquerDefinitif(id){
  const x=DB.rapports.find(r=>r.id===id); if(!x) return;
  if(!confirm(`Marquer le rapport de ${x.etudiantNom} comme DÉFINITIF ?\nIl n'apparaîtra plus dans l'Espace Correcteur.`)) return;
  const deja=rapportDefinitifDe(x.etudiantNom);
  x.statut='definitif'; x.phase='Dépôt définitif';
  DB.rapports.forEach(r=>{ if(r!==x && normName(r.etudiantNom)===normName(x.etudiantNom) && OUVERT(r.statut)) r.statut='clos'; });
  if(deja && deja!==x && deja.source==='liste officielle') removeRecord('rapports', deja.id);
  saveDB(); renderAdDocs('rapport'); toast('Rapport marqué définitif','ok');
}
function annulerDefinitif(id){
  const x=DB.rapports.find(r=>r.id===id); if(!x) return;
  if(!confirm(`Retirer le statut « définitif » du rapport de ${x.etudiantNom} ?\nIl repassera « à corriger ».`)) return;
  x.statut='depose'; x.phase='1ère correction'; if(!x.tsDepot) x.tsDepot=nowFull();
  saveDB(); renderAdDocs('rapport'); toast('Statut modifié','ok');
}
function libererDoc(kind,id){
  const x=(kind==='expose'?DB.expositions:DB.rapports).find(r=>r.id===id); if(!x) return;
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
// Rapports : nombre de rapports DÉFINITIFS par commission comparé au total attendu
function commissionBreakdownRows(kind){
  const data = kind==='expose' ? DB.expositions : DB.rapports;
  return DB.commissions.map(c=>{
    const mine=data.filter(x=>x.commission===c.nom);
    const n = kind==='rapport' ? mine.filter(x=>x.statut==='definitif').length : mine.length;
    const total = c.totalAttendu || DB.etudiants.filter(e=>e.commission===c.nom).length;
    const pct = total>0 ? Math.round((n/total)*100) : null;
    return {nom:c.nom, responsable:c.responsable||'', total, n, pct};
  });
}
function renderCommissionBreakdown(kind){
  const id = kind==='expose' ? 'ad-e-commission' : 'ad-r-commission';
  const el=document.getElementById(id);
  const rows=commissionBreakdownRows(kind);
  const faibles = rows.filter(r=>r.pct!==null && r.pct<SEUIL_COMMISSION_FAIBLE);
  el.innerHTML = (faibles.length ? `<div class="alert-banner">${faibles.map(r=>`Taux de rapports définitifs faible pour "${escapeHtml(r.nom)}" : ${r.n}/${r.total} (${r.pct}%) — grand écart avec le nombre attendu.`).join('<br>')}</div>` : '')
    + (rows.length ? `<table class="rep-table"><thead><tr><th>Commission</th><th>Responsable</th><th>Total attendu</th><th>Définitifs</th><th>%</th></tr></thead><tbody>${rows.map(r=>`<tr><td style="text-align:left;">${escapeHtml(r.nom)}</td><td style="text-align:left;">${escapeHtml(r.responsable)}</td><td>${r.total||'—'}</td><td>${r.n}</td><td>${r.pct!==null?r.pct+'%'+(r.pct<SEUIL_COMMISSION_FAIBLE?' ':''):'—'}</td></tr>`).join('')}</tbody></table>` : `<div class="empty">Aucune commission configurée</div>`);
}

/* ================= CONFIGURATION : CRÉNEAUX ================= */
function renderAdCreneaux(){
  const el=document.getElementById('ad-cr-list');
  el.innerHTML = DB.creneaux.map(c=>`
    <div class="cr-edit">
      <label>${c.jour} — ${c.label}</label>
      <input type="time" data-id="${c.id}" data-f="debut" value="${c.debut}">
      <input type="time" data-id="${c.id}" data-f="fin" value="${c.fin}">
    </div>`).join('');
}
function saveCreneaux(){
  document.querySelectorAll('#ad-cr-list input').forEach(inp=>{
    const c=DB.creneaux.find(x=>x.id===inp.dataset.id);
    if(c) c[inp.dataset.f]=inp.value;
  });
  DB.creneaux.forEach(c=>{ c.label = c.debut.replace(':','h')+' - '+c.fin.replace(':','h'); });
  saveDB(); renderAdCreneaux();
  toast('Créneaux mis à jour','ok');
}

/* ================= CONFIGURATION : MEMBRES DE LA COMMISSION ================= */
function renderAdMembresManage(){
  const el=document.getElementById('ad-mb-list');
  el.innerHTML = DB.membres.length ? DB.membres.map((m,i)=>`
    <div class="list-item" style="padding:12px 0;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;">
        <div class="li-name" style="font-size:13.5px;">${escapeHtml(m.nom)} <span style="font-weight:400;color:var(--MUT);font-size:11.5px;">${escapeHtml(m.role||'Membre')} — code ${escapeHtml(m.code)}</span></div>
        <button class="btn-sm" style="background:var(--REDP);color:var(--RED);" onclick="removeMembre(${i})">Supprimer</button>
      </div>
      <div class="fg-row" style="margin-bottom:8px;">
        <input type="text" value="${escapeHtml(m.nom)}" placeholder="Nom" onchange="updateMembreField(${i},'nom',this.value)">
        <input type="text" inputmode="numeric" value="${escapeHtml(m.code)}" placeholder="Code personnel" onchange="updateMembreField(${i},'code',this.value)">
      </div>
      <div class="fg-row">
        <input type="text" value="${escapeHtml(m.lieu||'')}" placeholder="Lieu d'habitation" onchange="updateMembreField(${i},'lieu',this.value)">
        <input type="tel" value="${escapeHtml(m.tel||'')}" placeholder="Numéro (WhatsApp)" onchange="updateMembreField(${i},'tel',this.value)">
      </div>
      <div class="fg-row" style="margin-top:8px;">
        <input type="text" value="${escapeHtml(m.motifAbsence||'')}" placeholder="Situation / motif d'absence" onchange="updateMembreField(${i},'motifAbsence',this.value)">
        <input type="text" value="${escapeHtml(m.eglise||'')}" placeholder="Église / groupe" onchange="updateMembreField(${i},'eglise',this.value)">
      </div>
      <div class="fg-row" style="margin-top:8px;">
        <select onchange="updateMembreField(${i},'financier',this.value)">${NIVEAU_OPTIONS.map(n=>`<option value="${n}" ${m.financier===n?'selected':''}>Financier : ${n}</option>`).join('')}</select>
        <select onchange="updateMembreField(${i},'spirituel',this.value)">${NIVEAU_OPTIONS.map(n=>`<option value="${n}" ${m.spirituel===n?'selected':''}>Spirituel : ${n}</option>`).join('')}</select>
      </div>
    </div>`).join('') : `<div class="empty">Aucun membre enregistré</div>`;
}
function updateMembreField(i, field, value){
  if((field==='nom'||field==='code') && !String(value).trim()){ toast('Valeur requise','ko'); renderAdMembresManage(); return; }
  if(field==='code' && DB.membres.some((m,j)=>j!==i && String(m.code)===String(value).trim())){ toast('Ce code est déjà utilisé par un autre membre','ko'); renderAdMembresManage(); return; }
  if(field==='nom' && DB.membres.some((m,j)=>j!==i && cleNom(m.nom)===cleNom(value))){ toast('Ce nom existe déjà dans la liste des membres','ko'); renderAdMembresManage(); return; }
  DB.membres[i][field]=String(value).trim(); saveDB();
  renderAdMembresAlertes();
}
function addMembre(){
  const nomInp=document.getElementById('ad-mb-new-nom');
  const codeInp=document.getElementById('ad-mb-new-code');
  const telInp=document.getElementById('ad-mb-new-tel');
  const nom=nomInp.value.trim(); const code=codeInp.value.trim();
  if(!nom){ toast('Nom requis','ko'); return; }
  if(!code){ toast('Code personnel requis','ko'); return; }
  if(existeDeja(DB.membres.map(m=>m.nom), nom, cleNom)){ toast('Ce membre existe déjà dans la liste','ko'); return; }
  if(DB.membres.some(m=>String(m.code)===code)){ toast('Ce code est déjà utilisé par un autre membre','ko'); return; }
  DB.membres.push({id:nid(), nom, code, tel:telInp.value.trim(), lieu:'', financier:'Moyen', spirituel:'Moyen', motifAbsence:''});
  saveDB(); nomInp.value=''; codeInp.value=''; telInp.value=''; renderAdMembresManage();
  toast('Membre ajouté','ok');
}
function removeMembre(i){
  if(!confirm('Supprimer ce membre de la commission ?')) return;
  removeRecord('membres', DB.membres[i].id); saveDB(); renderAdMembresManage();
  toast('Membre supprimé','ok');
}

/* ================= CONFIGURATION : MOTIFS DE PRÉSENCE ================= */
function renderAdMotifs(){
  const el=document.getElementById('ad-mo-list');
  el.innerHTML = DB.motifsPresence.length ? DB.motifsPresence.map((m,i)=>`<div class="list-item" style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;"><div class="li-name" style="font-size:13.5px;">${escapeHtml(m)}</div>${DB.motifsPresence.length>1?`<button class="btn-sm" style="background:var(--REDP);color:var(--RED);" onclick="removeMotif(${i})">Supprimer</button>`:''}</div>`).join('') : `<div class="empty">Aucun motif configuré</div>`;
}
function addMotif(){
  const inp=document.getElementById('ad-mo-new');
  const v=inp.value.trim();
  if(!v){ toast('Nom requis','ko'); return; }
  if(existeDeja(DB.motifsPresence, v)){ toast('Ce motif existe déjà','ko'); return; }
  DB.motifsPresence.push(v); saveDB(); inp.value=''; renderAdMotifs();
  toast('Motif ajouté','ok');
}
function removeMotif(i){
  if(!confirm('Supprimer ce motif ?')) return;
  DB.motifsPresence.splice(i,1); saveDB(); renderAdMotifs();
  toast('Supprimé','ok');
}

/* ================= CONFIGURATION : ÉGLISES / LIEUX ================= */
function renderAdEglises(){
  const el=document.getElementById('ad-eg-list');
  el.innerHTML = DB.eglises.length ? DB.eglises.map((n,i)=>`<div class="list-item" style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;"><div class="li-name" style="font-size:13.5px;">${escapeHtml(n)}</div><button class="btn-sm" style="background:var(--REDP);color:var(--RED);" onclick="removeEglise(${i})">Supprimer</button></div>`).join('') : `<div class="empty">Aucun lieu configuré</div>`;
}
function addEglise(){
  const inp=document.getElementById('ad-eg-new');
  const v=inp.value.trim();
  if(!v){ toast('Nom requis','ko'); return; }
  if(existeDeja(DB.eglises, v)){ toast('Ce lieu existe déjà dans la liste','ko'); return; }
  DB.eglises.push(v); saveDB(); inp.value=''; renderAdEglises();
  toast('Lieu ajouté','ok');
}
function removeEglise(i){
  if(!confirm('Supprimer ce lieu ?')) return;
  DB.eglises.splice(i,1); saveDB(); renderAdEglises();
  toast('Supprimée','ok');
}

/* ================= CONFIGURATION : COMMISSIONS ================= */
function renderAdCommissions(){
  const el=document.getElementById('ad-co-list');
  el.innerHTML = DB.commissions.length ? DB.commissions.map((c,i)=>`
    <div class="list-item" style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 0;">
      <div style="flex:1;">
        <div class="li-name" style="font-size:13.5px;">${escapeHtml(c.nom)}</div>
        <div class="li-sub" style="margin-bottom:4px;">Responsable : <input type="text" value="${escapeHtml(c.responsable||'')}" placeholder="Nom du responsable (ou « Église fille »)" style="width:240px;padding:4px 6px;border:1px solid var(--LINE);border-radius:6px;" onchange="updateCommissionResponsable(${i}, this.value)"></div>
        <div class="li-sub">Total attendu : <input type="number" min="0" value="${c.totalAttendu||0}" style="width:70px;padding:4px 6px;border:1px solid var(--LINE);border-radius:6px;" onchange="updateCommissionTotal(${i}, this.value)"></div>
      </div>
      <button class="btn-sm" style="background:var(--REDP);color:var(--RED);" onclick="removeCommission(${i})">Supprimer</button>
    </div>`).join('') : `<div class="empty">Aucune commission configurée</div>`;
}
function addCommission(){
  const nomInp=document.getElementById('ad-co-new-nom');
  const totInp=document.getElementById('ad-co-new-total');
  const nom=nomInp.value.trim();
  if(!nom){ toast('Nom requis','ko'); return; }
  if(existeDeja(DB.commissions.map(c=>c.nom), nom)){ toast('Cette commission existe déjà','ko'); return; }
  DB.commissions.push({id:nid(), nom, totalAttendu: parseInt(totInp.value)||0});
  saveDB(); nomInp.value=''; totInp.value=''; renderAdCommissions();
  toast('Commission ajoutée','ok');
}
function updateCommissionTotal(i, val){
  DB.commissions[i].totalAttendu = parseInt(val)||0;
  saveDB();
}
function updateCommissionResponsable(i, val){
  const c=DB.commissions[i]; if(!c) return;
  const ancien=c.responsable||'';
  c.responsable=val.trim();
  // met à jour les étudiants de la commission qui avaient l'ancien responsable
  DB.etudiants.forEach(e=>{ if(e.commission===c.nom && (e.responsable||'')===ancien) e.responsable=c.responsable; });
  saveDB(); toast('Responsable enregistré','ok');
}
function removeCommission(i){
  if(!confirm('Supprimer cette commission ?')) return;
  DB.commissions.splice(i,1); saveDB(); renderAdCommissions();
  toast('Supprimée','ok');
}

/* ================= CONFIGURATION : BIBLIOTHÈQUE "SOURCE VASES D'HONNEUR" ================= */
function renderAdBiblio(){
  const el=document.getElementById('ad-bib-list');
  const list=DB.bibliotheque;
  el.innerHTML = list.length ? uniq(reglages().classes.concat(list.map(b=>b.classe))).map(cl=>{
    const items=list.filter(b=>b.classe===cl);
    if(!items.length) return '';
    return `<div style="margin-bottom:8px;"><div class="hint" style="font-weight:700;color:var(--GRN);">${cl}</div>${items.map(b=>{
      const idx=list.indexOf(b);
      return `<div class="list-item" style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;"><div><div class="li-name" style="font-size:13px;">${escapeHtml(b.titre)} <span class="badge bn">${escapeHtml(b.type)}</span></div><div class="li-sub">${b.auteur?escapeHtml(b.auteur):''}${b.lien?' • '+escapeHtml(b.lien):''}</div></div><button class="btn-sm" style="background:var(--REDP);color:var(--RED);" onclick="removeBiblio(${idx})">Supprimer</button></div>`;
    }).join('')}</div>`;
  }).join('') : `<div class="empty">Aucune source enregistrée</div>`;
}
function addBiblio(){
  const classe=document.getElementById('bib-new-classe').value;
  const type=document.getElementById('bib-new-type').value;
  const titreInp=document.getElementById('bib-new-titre');
  const auteurInp=document.getElementById('bib-new-auteur');
  const lienInp=document.getElementById('bib-new-lien');
  const titre=titreInp.value.trim();
  if(!titre){ toast('Titre requis','ko'); return; }
  if(DB.bibliotheque.some(b=>b.classe===classe && normName(b.titre)===normName(titre))){ toast('Cette source existe déjà pour '+classe,'ko'); return; }
  DB.bibliotheque.push({id:nid(), classe, type, titre, auteur:auteurInp.value.trim(), lien:lienInp.value.trim(), dateAjout:todayStr()});
  saveDB(); titreInp.value=''; auteurInp.value=''; lienInp.value=''; renderAdBiblio();
  toast('Source ajoutée à la bibliothèque','ok');
}
function removeBiblio(idx){
  if(!confirm('Supprimer cette source ?')) return;
  removeRecord('bibliotheque', DB.bibliotheque[idx].id); saveDB(); renderAdBiblio();
  toast('Supprimée','ok');
}

/* ================= CONFIGURATION : CALENDRIER DE MÉDITATION & QUIZ BIBLIQUE ================= */
function renderAdMeditations(){
  const el=document.getElementById('ad-med-list');
  const sorted=DB.meditations.slice().sort((a,b)=>a.date.localeCompare(b.date));
  el.innerHTML = sorted.length ? sorted.map(m=>{
    const idx=DB.meditations.indexOf(m);
    return `<div class="list-item" style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;"><div><div class="li-name" style="font-size:13px;">${escapeHtml(m.classe)} — ${escapeHtml(m.livre)}</div><div class="li-sub">Le ${m.date}</div></div><button class="btn-sm" style="background:var(--REDP);color:var(--RED);" onclick="removeMeditation(${idx})">Supprimer</button></div>`;
  }).join('') : `<div class="empty">Aucune méditation programmée</div>`;
}
function addMeditation(){
  const classe=document.getElementById('med-new-classe').value;
  const date=document.getElementById('med-new-date').value;
  const livreInp=document.getElementById('med-new-livre');
  const livre=livreInp.value.trim();
  if(!date){ toast('Date requise','ko'); return; }
  if(!livre){ toast('Livre / passage requis','ko'); return; }
  DB.meditations.push({id:nid(), classe, date, livre});
  saveDB(); livreInp.value=''; renderAdMeditations();
  toast('Méditation ajoutée au calendrier','ok');
}
function removeMeditation(idx){
  if(!confirm('Supprimer cette méditation ?')) return;
  removeRecord('meditations', DB.meditations[idx].id); saveDB(); renderAdMeditations();
  toast('Supprimée','ok');
}
function renderAdQuiz(){
  const el=document.getElementById('ad-quiz-list');
  const sorted=DB.quizBiblique.slice().sort((a,b)=>a.date.localeCompare(b.date));
  el.innerHTML = sorted.length ? sorted.map(q=>{
    const idx=DB.quizBiblique.indexOf(q);
    return `<div class="list-item" style="padding:8px 0;">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div class="li-name" style="font-size:13px;">${escapeHtml(q.classe)} — Passage n°${q.numero}</div>
        <button class="btn-sm" style="background:var(--REDP);color:var(--RED);" onclick="removeQuiz(${idx})">Supprimer</button>
      </div>
      <div class="li-sub">Le ${q.date} • Référence : ${escapeHtml(q.livre)}${q.contenu?'<br>'+escapeHtml(q.contenu):''}</div>
    </div>`;
  }).join('') : `<div class="empty">Aucun quiz biblique programmé</div>`;
}
function addQuiz(){
  const classe=document.getElementById('quiz-new-classe').value;
  const date=document.getElementById('quiz-new-date').value;
  const livreInp=document.getElementById('quiz-new-livre');
  const contenuInp=document.getElementById('quiz-new-contenu');
  const livre=livreInp.value.trim();
  if(!date){ toast('Date requise','ko'); return; }
  if(!livre){ toast('Référence du livre requise','ko'); return; }
  const numero = DB.quizBiblique.filter(q=>q.classe===classe).length + 1;
  DB.quizBiblique.push({id:nid(), classe, numero: numero>3?numero:numero, date, livre, contenu:contenuInp.value.trim(), statut:'programme'});
  saveDB(); livreInp.value=''; contenuInp.value=''; renderAdQuiz();
  toast('Quiz biblique programmé','ok');
}
function removeQuiz(idx){
  if(!confirm('Supprimer ce quiz ?')) return;
  removeRecord('quizBiblique', DB.quizBiblique[idx].id); saveDB(); renderAdQuiz();
  toast('Supprimé','ok');
}

/* ================= SÉANCES DE MÉTHODOLOGIE ================= */
function signalerReprise(){
  const classe=document.getElementById('se-classe').value;
  const dateReprise=document.getElementById('se-date-reprise').value;
  const salle=document.getElementById('se-salle').value.trim();
  if(!dateReprise){ toast('Date de reprise requise','ko'); return; }
  if(!salle){ toast('Salle requise','ko'); return; }
  const p1n=document.getElementById('se-pres1-nom').value.trim(), p1t=document.getElementById('se-pres1-tel').value.trim();
  const p2n=document.getElementById('se-pres2-nom').value.trim(), p2t=document.getElementById('se-pres2-tel').value.trim();
  const m1n=document.getElementById('se-mod1-nom').value.trim(), m1t=document.getElementById('se-mod1-tel').value.trim();
  const m2n=document.getElementById('se-mod2-nom').value.trim(), m2t=document.getElementById('se-mod2-tel').value.trim();
  const presentateurs=[]; if(p1n) presentateurs.push({nom:p1n,tel:p1t}); if(p2n) presentateurs.push({nom:p2n,tel:p2t});
  const themesProposes=getThemes('se-themes-list');
  const dateProgrammee=addDaysStr(dateReprise,7);
  const session={id:nid(), classe, numero:1, dateReprise, dateProgrammee, salle,
    presentateurs, moderateur1: m1n?{nom:m1n,tel:m1t}:null, moderateur2: m2n?{nom:m2n,tel:m2t}:null,
    themesProposes, statut:'programmee', presentateur:'', dateValidation:'', compteRendu:'', adminValide:false, dateDepotPremierJet:''};
  DB.sessions.push(session);
  // Informe les présentateurs et modérateurs assignés
  const vSe={classe, date:frDate(dateProgrammee), salle};
  presentateurs.forEach(p=>sendMessage(p.nom, modele('seancePresentateur',Object.assign({nom:p.nom},vSe)), p.tel, {titre:'Séance de méthodologie'}));
  [session.moderateur1, session.moderateur2].filter(Boolean).forEach(mo=>sendMessage(mo.nom, modele('seanceModerateur',Object.assign({nom:mo.nom},vSe)), mo.tel, {titre:'Séance de méthodologie'}));
  saveDB();
  ['se-date-reprise','se-salle','se-pres1-nom','se-pres1-tel','se-pres2-nom','se-pres2-tel','se-mod1-nom','se-mod1-tel','se-mod2-nom','se-mod2-tel'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('se-themes-list').innerHTML=''; addThemeRow('se-themes-list');
  renderAdSeances(); renderAdSeancesAlertes();
  toast(`1er passage programmé le ${dateProgrammee} pour ${classe} — présentateurs et modérateurs notifiés`,'ok');
}
function renderAdSeances(){
  const el=document.getElementById('ad-se-list');
  const sorted=DB.sessions.slice().sort((a,b)=>b.dateProgrammee.localeCompare(a.dateProgrammee));
  const statutLbl={programmee:['Programmée','by'],presentee:['Présentée — en attente de validation','by'],validee:['Présentation validée','bg']};
  el.innerHTML = sorted.length ? `<div style="display:flex;flex-direction:column;gap:10px;">${sorted.map(s=>{
    const [lbl,cls]=statutLbl[s.statut]||['—','bn'];
    const waTag=(tel,texte)=>{ const l=waLink(tel,texte); return l?` <a class="pill-link" href="${l}" target="_blank">WhatsApp</a>`:''; };
    const pres=(s.presentateurs||[]).map(p=>`${escapeHtml(p.nom)} (${escapeHtml(p.tel||'—')})${waTag(p.tel,'Rappel : présentation de la méthodologie en '+s.classe+' le '+s.dateProgrammee+' — Salle '+s.salle+'.')}`).join(', ')||'—';
    const mod1=s.moderateur1?`${escapeHtml(s.moderateur1.nom)} (${escapeHtml(s.moderateur1.tel||'—')})${waTag(s.moderateur1.tel,'Rappel : séance méthodologie en '+s.classe+' le '+s.dateProgrammee+'.')}`:'—';
    const mod2=s.moderateur2?`${escapeHtml(s.moderateur2.nom)} (${escapeHtml(s.moderateur2.tel||'—')})${waTag(s.moderateur2.tel,'Rappel : séance méthodologie en '+s.classe+' le '+s.dateProgrammee+'.')}`:'';
    const themes=(s.themesProposes||[]).join(', ')||'—';
    return `<div class="list-item" style="border:1px solid var(--LINE);border-radius:10px;">
      <div class="li-top"><div class="li-name">${escapeHtml(s.classe)} — Passage n°${s.numero}</div><span class="badge ${cls}">${lbl}</span></div>
      <div class="li-sub" style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        Date : <input type="date" data-id="${s.id}" data-f="dateProgrammee" value="${s.dateProgrammee}" style="padding:4px 6px;border:1px solid var(--LINE);border-radius:6px;">
        Salle : <input type="text" data-id="${s.id}" data-f="salle" value="${escapeHtml(s.salle||'')}" style="padding:4px 6px;border:1px solid var(--LINE);border-radius:6px;width:110px;">
      </div>
      <div class="li-sub" style="margin-top:6px;">Présentateur(s) : ${pres}<br>Modérateurs : ${mod1}${mod2?', '+mod2:''}<br>Thèmes proposés : ${escapeHtml(themes)}</div>
      ${s.compteRendu ? `<div class="li-sub" style="margin-top:6px;"><b>Compte-rendu :</b> ${escapeHtml(s.compteRendu)} (par ${escapeHtml(s.presentateur||'—')} le ${s.dateValidation})</div>` : ''}
      ${s.statut==='validee' ? `<div class="li-sub" style="margin-top:6px;">1er jet attendu le : <b>${s.dateDepotPremierJet}</b></div>` : ''}
      ${s.statut==='presentee' ? `<button class="btn-sm btn-g" style="margin-top:8px;" onclick="validerPresentation('${s.id}')">Valider la présentation</button>` : ''}
    </div>`;
  }).join('')}</div>` : `<div class="empty">Aucune séance programmée pour le moment</div>`;
}
function saveSeances(){
  document.querySelectorAll('#ad-se-list input').forEach(inp=>{
    const s=DB.sessions.find(x=>x.id===inp.dataset.id);
    if(s) s[inp.dataset.f]=inp.value;
  });
  saveDB(); renderAdSeances();
  toast('Séances mises à jour','ok');
}
function validerPresentation(id){
  const s=DB.sessions.find(x=>x.id===id); if(!s) return;
  const dateJet = prompt(`Date de dépôt du premier jet pour ${s.classe} (AAAA-MM-JJ) :`, addDaysStr(todayStr(),14));
  if(!dateJet) return;
  s.statut='validee'; s.dateDepotPremierJet=dateJet; s.adminValide=true;
  const themesTxt = (s.themesProposes && s.themesProposes.length) ? s.themesProposes.join(', ') : 'aucun thème proposé pour le moment';
  if(s.moderateur1) sendMessage(s.moderateur1.nom, `Compte-rendu reçu pour ${s.classe} (passage n°${s.numero}). Thèmes proposés : ${themesTxt}.`, s.moderateur1.tel);
  if(s.moderateur2) sendMessage(s.moderateur2.nom, `Compte-rendu reçu pour ${s.classe} (passage n°${s.numero}). Thèmes proposés : ${themesTxt}.`, s.moderateur2.tel);
  DB.etudiants.filter(e=>e.classe===s.classe).forEach(e=>{
    sendMessage(e.nom, `Suite à la présentation de la méthodologie, la date de dépôt de votre 1er jet d'exposé est fixée au ${dateJet}.`);
  });
  const nextDate=addMonthsStr(todayStr(),2);
  DB.sessions.push({id:nid(), classe:s.classe, numero:(s.numero||1)+1, dateReprise:s.dateReprise, dateProgrammee: nextDate, salle:s.salle,
    presentateurs:s.presentateurs||[], moderateur1:s.moderateur1, moderateur2:s.moderateur2, themesProposes:[],
    statut:'programmee', presentateur:'', dateValidation:'', compteRendu:'', adminValide:false, dateDepotPremierJet:''});
  saveDB(); renderAdSeances(); renderAdSeancesAlertes();
  toast('Présentation validée — thèmes envoyés aux modérateurs, date du 1er jet envoyée aux étudiants de la classe','ok');
}
function renderAdSeancesAlertes(){
  const el=document.getElementById('ad-se-alertes');
  const alertes = DB.sessions.filter(s=>s.numero===1 && s.statut==='programmee' && s.dateReprise && joursDepuisStr(s.dateReprise)>=SEUIL_REPRISE_JOURS);
  el.innerHTML = alertes.length ? `<div class="alert-banner">${alertes.map(s=>`${escapeHtml(s.classe)} a fait sa rentrée le ${s.dateReprise} mais n'a toujours pas eu de passage de méthodologie (${joursDepuisStr(s.dateReprise)} jours).`).join('<br>')}</div>` : '';
}

/* ================= SORTIES DANS LES ÉGLISES FILLES ================= */
function egliseExposeCount(nom){
  return DB.expositions.filter(x=>x.lieu===nom).length;
}
function renderEgliseStats(){
  const el=document.getElementById('ad-eg-stats');
  el.innerHTML = DB.eglises.length ? `<table class="rep-table"><thead><tr><th>Lieu</th><th>Exposés déposés</th></tr></thead><tbody>${DB.eglises.map(n=>`<tr><td style="text-align:left;">${escapeHtml(n)}</td><td>${egliseExposeCount(n)}</td></tr>`).join('')}</tbody></table>` : `<div class="empty">Aucun lieu configuré</div>`;
}
function fillSortieEgliseSelect(){
  const sel=document.getElementById('so-eglise');
  sel.innerHTML = DB.eglises.length ? DB.eglises.map(n=>`<option value="${escapeHtml(n)}">${escapeHtml(n)} (${egliseExposeCount(n)} exposés)</option>`).join('') : `<option value="">Aucun lieu configuré</option>`;
}
const POSTES_SORTIE = [
  {key:'president', label:'Président du jury'},
  {key:'jury1', label:'Jury 1'},
  {key:'jury2', label:'Jury 2'},
  {key:'observateur1', label:'Observateur 1'},
  {key:'observateur2', label:'Observateur 2'},
  {key:'coordonnateur', label:'Coordonnateur'}
];
function addSortie(){
  const eglise=document.getElementById('so-eglise').value;
  const date=document.getElementById('so-date').value;
  if(!eglise){ toast('Église requise','ko'); return; }
  if(!date){ toast('Date requise','ko'); return; }
  const postes={};
  POSTES_SORTIE.forEach(p=>{
    const nom=document.getElementById('so-'+p.key+'-nom').value.trim();
    const tel=document.getElementById('so-'+p.key+'-tel').value.trim();
    postes[p.key] = nom ? {nom, tel} : null;
  });
  if(!postes.president || !postes.jury1 || !postes.jury2 || !postes.observateur1 || !postes.observateur2){
    toast('Président du jury, Jury 1, Jury 2, Observateur 1 et Observateur 2 sont requis','ko'); return;
  }
  DB.sorties.push({id:nid(), eglise, date, postes, pv:'', statut:'programmee'});
  POSTES_SORTIE.forEach(p=>{
    const assigne=postes[p.key];
    if(assigne) sendMessage(assigne.nom, modele('sortie',{nom:assigne.nom, date:frDate(date), lieu:eglise, poste:p.label}), assigne.tel, {titre:'Sortie programmée'});
  });
  saveDB();
  document.getElementById('so-date').value='';
  POSTES_SORTIE.forEach(p=>{ document.getElementById('so-'+p.key+'-nom').value=''; document.getElementById('so-'+p.key+'-tel').value=''; });
  renderAdSorties();
  toast('Sortie programmée — toutes les personnes assignées ont été notifiées','ok');
}
function renderAdSorties(){
  const el=document.getElementById('ad-so-list');
  const sorted=DB.sorties.slice().sort((a,b)=>a.date.localeCompare(b.date));
  el.innerHTML = sorted.length ? sorted.map(v=>{
    const postesTxt = POSTES_SORTIE.filter(p=>v.postes[p.key]).map(p=>{
      const person=v.postes[p.key];
      const link=waLink(person.tel, `Rappel : sortie à ${v.eglise} le ${v.date} — vous êtes ${p.label}.`);
      return `${p.label} : ${escapeHtml(person.nom)} (${escapeHtml(person.tel||'—')})${link?` <a class="pill-link" href="${link}" target="_blank">WhatsApp</a>`:''}`;
    }).join('<br>');
    return `<div class="list-item" style="border:1px solid var(--LINE);border-radius:10px;">
      <div class="li-top"><div class="li-name">${escapeHtml(v.eglise)}</div><span class="badge ${v.statut==='effectuee'?'bg':'by'}">${v.statut==='effectuee'?'Effectuée':'Programmée'}</span></div>
      <div class="li-sub" style="margin-top:6px;">Le ${v.date}</div>
      <div class="li-sub" style="margin-top:6px;">${postesTxt}</div>
      <div class="fg" style="margin-top:8px;"><label>Procès-verbal (PV) de la sortie</label><textarea rows="2" id="pv-${v.id}" placeholder="Compte-rendu de la sortie...">${escapeHtml(v.pv||'')}</textarea></div>
      <div style="display:flex;gap:8px;">
        <button class="btn-sm btn-g" onclick="savePV('${v.id}')">Enregistrer le PV</button>
        ${v.statut!=='effectuee' ? `<button class="btn-sm btn-y" onclick="marquerSortieEffectuee('${v.id}')">Marquer comme effectuée</button>` : ''}
      </div>
    </div>`;
  }).join('') : `<div class="empty">Aucune sortie programmée</div>`;
}
function savePV(id){
  const v=DB.sorties.find(x=>x.id===id); if(!v) return;
  v.pv = document.getElementById('pv-'+id).value.trim();
  saveDB(); toast('PV enregistré','ok');
}
function marquerSortieEffectuee(id){
  const v=DB.sorties.find(x=>x.id===id); if(!v) return;
  v.statut='effectuee'; saveDB(); renderAdSorties();
  toast('Sortie marquée comme effectuée','ok');
}

/* ================================================================
   RAPPORT D'ÉVOLUTION ANNUEL (export PDF / Word)
   ================================================================ */
function fillExportYears(){
  const sel=document.getElementById('ad-ex-year');
  const years=new Set([new Date().getFullYear()]);
  DB.presences.forEach(p=>years.add(parseInt(p.date.substring(0,4))));
  DB.expositions.forEach(x=>years.add(parseInt(x.dateDepot.substring(0,4))));
  DB.rapports.forEach(x=>years.add(parseInt(x.dateDepot.substring(0,4))));
  const sorted=Array.from(years).sort((a,b)=>b-a);
  const prev=sel.value;
  sel.innerHTML=sorted.map(y=>`<option value="${y}">${y}</option>`).join('');
  if(prev && sorted.includes(parseInt(prev))) sel.value=prev;
}
function buildAnnualReportHTML(year){
  const inYear = ds => ds && ds.substring(0,4)===String(year);
  const mExp = Array.from({length:12},()=>({depose:0,corrige:0,retire:0}));
  DB.expositions.forEach(x=>{
    if(inYear(x.dateDepot)){ const m=parseInt(x.dateDepot.substring(5,7))-1; mExp[m].depose++; if(x.statut==='corrige_complet'||x.statut==='corrige_partiel'||x.statut==='retire') mExp[m].corrige++; if(x.statut==='retire') mExp[m].retire++; }
  });
  const mRap = Array.from({length:12},()=>({depose:0,corrige:0,retire:0}));
  DB.rapports.forEach(x=>{
    if(inYear(x.dateDepot)){ const m=parseInt(x.dateDepot.substring(5,7))-1; mRap[m].depose++; if(x.statut==='corrige_complet'||x.statut==='corrige_partiel'||x.statut==='retire') mRap[m].corrige++; if(x.statut==='retire') mRap[m].retire++; }
  });
  const mPres = Array.from({length:12},()=>({heures:0,pointages:0}));
  DB.presences.forEach(p=>{
    if(inYear(p.date)){ const m=parseInt(p.date.substring(5,7))-1; mPres[m].pointages++; mPres[m].heures += (p.dureeMin||0)/60; }
  });
  const rows = i => `<tr><td>${MOIS_LBL[i]}</td><td>${mExp[i].depose}</td><td>${mExp[i].corrige}</td><td>${mRap[i].depose}</td><td>${mRap[i].corrige}</td><td>${mPres[i].pointages}</td><td>${mPres[i].heures.toFixed(1)}h</td></tr>`;
  const totExpD=mExp.reduce((s,m)=>s+m.depose,0), totExpC=mExp.reduce((s,m)=>s+m.corrige,0);
  const totRapD=mRap.reduce((s,m)=>s+m.depose,0), totRapC=mRap.reduce((s,m)=>s+m.corrige,0);
  const totPres=mPres.reduce((s,m)=>s+m.pointages,0), totH=mPres.reduce((s,m)=>s+m.heures,0);
  const coRowsRap=commissionBreakdownRows('rapport');
  const coTable = (rows,titre) => rows.length ? `<div class="rep-h2">${titre}</div><table class="rep-table"><thead><tr><th>Commission</th><th>Responsable</th><th>Total attendu</th><th>Définitifs</th><th>%</th></tr></thead><tbody>${rows.map(r=>`<tr><td style="text-align:left;">${escapeHtml(r.nom)}</td><td style="text-align:left;">${escapeHtml(r.responsable||'')}</td><td>${r.total||'—'}</td><td>${r.n}</td><td>${r.pct!==null?r.pct+'%':'—'}</td></tr>`).join('')}</tbody></table>` : '';
  const membresRows = DB.membres.map(m=>{
    const mo=memberMonthStats(m.id);
    return `<tr><td style="text-align:left;">${escapeHtml(m.nom)}</td><td>${mo.nb}</td><td>${mo.heures.toFixed(1)}h</td><td>${escapeHtml(m.financier||'')}</td><td>${escapeHtml(m.spirituel||'')}</td></tr>`;
  }).join('');
  return `
    <div class="rep-title">Académie Vases d'Honneur — Commission Exposé</div>
    <div class="rep-sub">Rapport d'évolution — Année ${year} — généré le ${frDate(todayStr())}</div>
    <div class="rep-h2">Synthèse mensuelle</div>
    <table class="rep-table"><thead><tr><th>Mois</th><th>Exposés déposés</th><th>Exposés corrigés</th><th>Rapports déposés</th><th>Rapports corrigés</th><th>Pointages membres</th><th>Heures cumulées</th></tr></thead>
    <tbody>${Array.from({length:12},(_,i)=>rows(i)).join('')}</tbody></table>
    <div class="rep-h2">Totaux annuels</div>
    <table class="rep-table"><thead><tr><th>Exposés déposés</th><th>Exposés corrigés</th><th>Rapports déposés</th><th>Rapports corrigés</th><th>Pointages</th><th>Heures cumulées</th></tr></thead>
    <tbody><tr><td>${totExpD}</td><td>${totExpC}</td><td>${totRapD}</td><td>${totRapC}</td><td>${totPres}</td><td>${totH.toFixed(1)}h</td></tr></tbody></table>
    ${coTable(coRowsRap,'Rapports de stage définitifs par commission')}
    <div class="rep-h2">Situation des membres (ce mois-ci)</div>
    <table class="rep-table"><thead><tr><th>Membre</th><th>Pointages</th><th>Heures</th><th>Financier</th><th>Spirituel</th></tr></thead><tbody>${membresRows}</tbody></table>`;
}
function renderAnnualPreview(){
  const year=document.getElementById('ad-ex-year').value;
  document.getElementById('ad-ex-preview').innerHTML = buildAnnualReportHTML(year);
}
function exportAnnualPDF(){ runExport('annuel','print'); }
function exportAnnualPDF_ancien(){
  const year=document.getElementById('ad-ex-year').value;
  const area=document.getElementById('print-area');
  area.innerHTML = buildAnnualReportHTML(year);
  area.style.display='block';
  window.print();
  setTimeout(()=>{ area.style.display='none'; },500);
}
function exportAnnualWord(){
  const year=document.getElementById('ad-ex-year').value;
  if(window.OfficeExport){ exportHtml(buildAnnualReportHTML(year), 'Rapport_Evolution_'+year, 'docx'); return; }
  const body = buildAnnualReportHTML(year);
  const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
  <head><meta charset="utf-8"><title>Rapport ${year}</title>
  <style>body{font-family:Calibri,Arial,sans-serif;} table{border-collapse:collapse;width:100%;} th,td{border:1px solid #999;padding:6px;text-align:center;font-size:12px;} th{background:#e2f2ec;}</style>
  </head><body>${body}</body></html>`;
  const blob = new Blob(['\ufeff', html], {type:'application/msword'});
  const url = URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=`Rapport_Evolution_${year}.doc`; a.click();
  URL.revokeObjectURL(url);
  toast('Rapport Word téléchargé','ok');
}

function exportAnnualExcel(){
  const year=document.getElementById('ad-ex-year').value;
  exportHtml(buildAnnualReportHTML(year), 'Rapport_Evolution_'+year, 'xlsx');
}

/* ================================================================
   ÉTUDIANTS (liste officielle modifiable)
   ================================================================ */
function commissionOptions(withAll, selected){
  return (withAll?`<option value="">Toutes les commissions</option>`:'') + DB.commissions.map(c=>`<option value="${escapeHtml(c.nom)}"${c.nom===selected?' selected':''}>${escapeHtml(c.nom)}</option>`).join('');
}
function renderAdEtudiants(refill){
  document.getElementById('ads-total').textContent=DB.etudiants.length;
  document.getElementById('ads-com').textContent=DB.commissions.length;
  if(refill){
    const fc=document.getElementById('ads-fc'); const v=fc.value; fc.innerHTML=commissionOptions(true,v);
    const nc=document.getElementById('ads-new-com'); const v2=nc.value; nc.innerHTML=commissionOptions(false,v2);
  }
  const q=normName(document.getElementById('ads-q').value), fc=document.getElementById('ads-fc').value;
  const defs=new Set(DB.rapports.filter(r=>r.statut==='definitif').map(r=>normName(r.etudiantNom)));
  const groups=DB.commissions.map(c=>c.nom);
  DB.etudiants.forEach(e=>{ if(!groups.includes(e.commission)) groups.push(e.commission); });
  let html='';
  groups.forEach(g=>{
    if(fc && g!==fc) return;
    const list=DB.etudiants.filter(e=>e.commission===g && (!q || normName(e.nom).includes(q)));
    if(!list.length) return;
    html+=`<div class="grp-h">${escapeHtml(String(g||'Sans commission').toUpperCase())} — Responsable : ${escapeHtml(commissionResponsable(g)||'—')} (${list.length})</div>`;
    html+=list.map(e=>`<div class="list-item" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;"><div style="flex:1;min-width:180px;"><div class="li-name" style="font-size:13.5px;">${escapeHtml(e.nom)}</div><div class="li-sub">${defs.has(normName(e.nom))?'<span class="badge bg">Rapport définitif</span>':'<span class="badge br">Pas de rapport définitif</span>'}</div></div><select class="inline-in" onchange="changerCommissionEtudiant('${e.id}',this.value)">${commissionOptions(false,e.commission)}</select><button class="btn-xs b-del" onclick="supprimerEtudiant('${e.id}')">Supprimer</button></div>`).join('');
  });
  document.getElementById('ads-list').innerHTML = html || `<div class="empty">Aucun étudiant</div>`;
}
function addEtudiant(){
  const nom=document.getElementById('ads-new-nom').value.trim();
  const com=document.getElementById('ads-new-com').value;
  if(!nom){ toast('Nom requis','ko'); return; }
  if(!com){ toast('Commission requise','ko'); return; }
  if(DB.etudiants.some(e=>normName(e.nom)===normName(nom))){ toast('Cet étudiant existe déjà','ko'); return; }
  DB.etudiants.push({id:nid(), nom, commission:com, responsable:commissionResponsable(com), classe:''});
  saveDB(); document.getElementById('ads-new-nom').value=''; renderAdEtudiants(); toast('Étudiant ajouté','ok');
}
function changerCommissionEtudiant(id,com){
  const e=DB.etudiants.find(x=>x.id===id); if(!e) return;
  e.commission=com; e.responsable=commissionResponsable(com);
  DB.rapports.forEach(r=>{ if(normName(r.etudiantNom)===normName(e.nom)){ r.commission=com; if(r.source==='liste officielle') r.responsable={nom:e.responsable,tel:''}; } });
  saveDB(); renderAdEtudiants(); toast('Commission modifiée','ok');
}
function supprimerEtudiant(id){
  const e=DB.etudiants.find(x=>x.id===id); if(!e) return;
  if(!confirm(`Retirer ${e.nom} de la liste des étudiants ?\n(ses dépôts éventuels sont conservés)`)) return;
  removeRecord('etudiants',id); saveDB(); renderAdEtudiants(); toast('Étudiant retiré','ok');
}
function changeAdminCode(){
  const v=document.getElementById('ad-newcode').value.trim();
  if(v.length<4){ toast('Le code doit contenir au moins 4 caractères','ko'); return; }
  DB.adminCode=v; saveDB(); document.getElementById('ad-newcode').value=''; toast('Code administrateur modifié','ok');
}

/* ================================================================
   EXPORTS WORD (.docx) / EXCEL (.xlsx) / APERÇU / PDF
   ================================================================ */
function genLine(){ const d=new Date(); return `Académie Vases d'Honneur — Commission Exposé • Généré le ${frDate(todayStr())} à ${pad(d.getHours())}h${pad(d.getMinutes())}`; }
const W = (label,width,align)=>({label,width,align});
const depotTxt = r => r.source==='liste officielle' ? 'Liste officielle' : frDate(r.dateDepot);

function modelDefinitifs(){
  const defs=DB.rapports.filter(r=>r.statut==='definitif');
  const coms=DB.commissions.slice();
  defs.forEach(r=>{ if(r.commission && !coms.find(c=>c.nom===r.commission)) coms.push({nom:r.commission,responsable:''}); });
  const byCom = nom => defs.filter(r=>r.commission===nom).sort((a,b)=>String(a.etudiantNom).localeCompare(b.etudiantNom,'fr'));
  const eff = nom => DB.etudiants.filter(e=>e.commission===nom).length;
  const sans=etudiantsSansDefinitif();
  const synth=coms.map(c=>{ const n=byCom(c.nom).length, e=eff(c.nom); return [c.nom, c.responsable||'—', e, n, Math.max(0,e-n)]; });
  const tot=['TOTAL','', synth.reduce((s,r)=>s+r[2],0), synth.reduce((s,r)=>s+r[3],0), synth.reduce((s,r)=>s+r[4],0)];
  const cols=[W('N°',1,'center'),W("Nom de l'étudiant",6.6),W('Commission',3.6),W('Responsable de commission',4.4),W('Date de dépôt',2.4,'center')];
  const sections=[{heading:'Synthèse par commission',columns:[W('Commission',4.5),W('Responsable',5.5),W('Effectif',2,'center'),W('Définitifs',2.2,'center'),W('Manquants',2.2,'center')],rows:synth,total:tot}];
  const xcols=[W('N°',6,'center'),W("Nom de l'étudiant",38),W('Commission',22),W('Responsable de commission',30),W('N° dossier',18),W('Date de dépôt',14,'center'),W('Lieu de dépôt',30)];
  const parCom=[]; const flat=[];
  coms.forEach(c=>{
    const list=byCom(c.nom); if(!list.length) return;
    const h=`${String(c.nom).toUpperCase()} — Responsable : ${c.responsable||'—'} (${list.length})`;
    sections.push({heading:h,columns:cols,rows:list.map((r,i)=>[i+1,r.etudiantNom,r.commission,respNom(r)||'—',depotTxt(r)])});
    parCom.push({__section:h});
    list.forEach((r,i)=>{ const row=[i+1,r.etudiantNom,r.commission,respNom(r)||'—',r.numero,depotTxt(r),r.lieu||'']; parCom.push(row); flat.push(row); });
  });
  if(sans.length) sections.push({heading:`Étudiants sans rapport définitif (${sans.length})`,columns:[W('N°',1,'center'),W("Nom de l'étudiant",7),W('Commission',4),W('Responsable de commission',5)],rows:sans.map((e,i)=>[i+1,e.nom,e.commission,commissionResponsable(e.commission)||'—'])});
  return {title:'Rapports de stage définitifs — liste par commission', subtitle:`${genLine()} • ${defs.length} rapport(s) définitif(s) pour ${DB.etudiants.length} étudiant(s)`, fileName:'Rapports_stage_definitifs_par_commission', sections,
    sheets:[
      {name:'Synthèse',title:'Rapports de stage définitifs — synthèse par commission',columns:[W('Commission',26),W('Responsable',32),W('Effectif',11,'center'),W('Définitifs',12,'center'),W('Manquants',12,'center')],rows:synth,total:tot},
      {name:'Par commission',title:'Rapports de stage définitifs — par commission',columns:xcols,rows:parCom},
      {name:'Liste complète',title:'Rapports de stage définitifs — liste complète',columns:xcols,rows:flat.map((r,i)=>[i+1].concat(r.slice(1)))},
      {name:'Sans définitif',title:'Étudiants sans rapport de stage définitif',columns:[W('N°',6,'center'),W("Nom de l'étudiant",40),W('Commission',24),W('Responsable de commission',32)],rows:sans.map((e,i)=>[i+1,e.nom,e.commission,commissionResponsable(e.commission)||'—'])}
    ]};
}
function modelSuivi(kind){
  const isE=kind==='expose';
  const data=(isE?DB.expositions:DB.rapports).slice().sort((a,b)=>(a.tsDepot||0)-(b.tsDepot||0));
  const cols = isE
    ? [W('N°',0.8,'center'),W('N° dossier',2.6),W('Étudiant',4),W('Classe',1.8),W('Nom de la classe',2.8),W('Phase',2.2),W('Statut',2.4),W('Lieu',3.2),W('Thèmes',3.4),W('Modérateur',2.4),W('Déposé le',2,'center'),W('Correcteur',2.6),W('Corrigé le',2,'center'),W('Retiré le',2,'center'),W('Commentaire',3.4)]
    : [W('N°',0.8,'center'),W('N° dossier',2.6),W('Étudiant',4),W('Commission',2.6),W('Responsable',3),W('Mandataire',2.6),W('Phase',2.2),W('Statut',2.4),W('Lieu',3.2),W('Déposé le',2,'center'),W('Correcteur',2.6),W('Corrigé le',2,'center'),W('Retiré le',2,'center'),W('Commentaire',3.4)];
  const rows=data.map((x,i)=> isE
    ? [i+1,x.numero,x.etudiantNom,x.classe||'',x.nomClasse||'',x.phase||'',statutLabel(x.statut)[0],x.lieu||'',(x.themes||[]).join('\n'),x.moderateur||'',frDate(x.dateDepot),x.correcteur||'',frDate(x.dateCorrection),frDate(x.dateRetrait),x.commentaire||'']
    : [i+1,x.numero,x.etudiantNom,x.commission||'',respNom(x),x.mandataire?x.mandataire.nom:'',x.phase||'',statutLabel(x.statut)[0],x.lieu||'',depotTxt(x),x.correcteur||'',frDate(x.dateCorrection),frDate(x.dateRetrait),x.commentaire||'']);
  const st={}; data.forEach(x=>{ const l=statutLabel(x.statut)[0]; st[l]=(st[l]||0)+1; });
  const titre = isE ? 'Suivi des exposés' : 'Suivi des rapports de stage';
  return {title:titre, subtitle:`${genLine()} • ${rows.length} document(s)`, landscape:true, fileName:isE?'Suivi_exposes':'Suivi_rapports_de_stage',
    sections:[{heading:'Répartition par statut',columns:[W('Statut',6),W('Nombre',3,'center')],rows:Object.entries(st),empty:'Aucun document.'},{heading:'Détail',columns:cols,rows,empty:'Aucun document enregistré.'}],
    sheets:[{name:titre,title:titre,columns:cols.map(c=>W(c.label,Math.round(c.width*4.2),c.align)),rows},{name:'Par statut',title:titre+' — répartition par statut',columns:[W('Statut',34),W('Nombre',12,'center')],rows:Object.entries(st)}]};
}
function modelEtudiants(){
  const cols=[W('N°',1,'center'),W("Nom de l'étudiant",7.4),W('Commission',4),W('Responsable de commission',5.5)];
  const sections=[]; const parCom=[];
  DB.commissions.forEach(c=>{
    const list=DB.etudiants.filter(e=>e.commission===c.nom); if(!list.length) return;
    const h=`${String(c.nom).toUpperCase()} — Responsable : ${c.responsable||'—'} (${list.length})`;
    sections.push({heading:h,columns:cols,rows:list.map((e,i)=>[i+1,e.nom,e.commission,c.responsable||'—'])});
    parCom.push({__section:h}); list.forEach((e,i)=>parCom.push([i+1,e.nom,e.commission,c.responsable||'—']));
  });
  const xc=[W('N°',6,'center'),W("Nom de l'étudiant",42),W('Commission',24),W('Responsable de commission',32)];
  return {title:'Étudiants par commission',subtitle:`${genLine()} • ${DB.etudiants.length} étudiants répartis en ${sections.length} commissions`,fileName:'Etudiants_par_commission',sections,
    sheets:[{name:'Par commission',title:'Étudiants par commission',columns:xc,rows:parCom},{name:'Liste',title:'Liste des étudiants',columns:xc,rows:DB.etudiants.map((e,i)=>[i+1,e.nom,e.commission,commissionResponsable(e.commission)||'—'])}]};
}
function modelPresences(year,month){
  const inP = p => p.date && p.date.substring(0,4)===String(year) && (month==='' || parseInt(p.date.substring(5,7))-1===parseInt(month));
  const list=DB.presences.filter(inP).sort((a,b)=>(a.tsArrivee||0)-(b.tsArrivee||0));
  const rows=list.map((p,i)=>[i+1,frDate(p.date),p.jour,p.membreNom,p.creneauLabel,p.motif,p.classe||'',p.heureArrivee]);
  const byM={}; list.forEach(p=>{ byM[p.membreNom]=(byM[p.membreNom]||0)+1; });
  const synth=DB.membres.map(m=>[m.nom, byM[m.nom]||0, memberSundayAbsences(m.id).absences, m.financier||'', m.spirituel||'']);
  const periode = month==='' ? 'Année '+year : MOIS_LBL[month]+' '+year;
  const cols=[W('N°',0.8,'center'),W('Date',2,'center'),W('Jour',1.8),W('Membre',4),W('Créneau',2.8),W('Motif',4.4),W('Classe',1.8),W('Arrivée',1.6,'center')];
  const scols=[W('Membre',6),W('Pointages',2.4,'center'),W('Absences dimanche (mois en cours)',3.6,'center'),W('Financier',2.4,'center'),W('Spirituel',2.4,'center')];
  return {title:'Journal de présence des membres — '+periode,subtitle:`${genLine()} • ${list.length} pointage(s)`,landscape:true,fileName:'Presences_'+safeFileName(periode),
    sections:[{heading:'Synthèse par membre',columns:scols,rows:synth,empty:'Aucun membre.'},{heading:'Détail des pointages',columns:cols,rows,empty:'Aucun pointage sur la période.'}],
    sheets:[{name:'Pointages',title:'Journal de présence — '+periode,columns:cols.map(c=>W(c.label,Math.round(c.width*4.5),c.align)),rows},{name:'Synthèse membres',title:'Synthèse par membre — '+periode,columns:scols.map(c=>W(c.label,Math.round(c.width*5),c.align)),rows:synth}]};
}
function modelSorties(){
  const list=DB.sorties.slice().sort((a,b)=>String(a.date).localeCompare(b.date));
  const nomTel = p => p ? p.nom+(p.tel?' ('+p.tel+')':'') : '';
  const cols=[W('Date',2,'center'),W('Église / lieu',4.4),W('Statut',2),W('Président du jury',3.4),W('Jury 1',3),W('Jury 2',3),W('Observateurs',3.6),W('Coordonnateur',3),W('PV',5)];
  const rows=list.map(v=>{ const p=v.postes||{}; return [frDate(v.date),v.eglise,v.statut==='effectuee'?'Effectuée':'Programmée',nomTel(p.president),nomTel(p.jury1),nomTel(p.jury2),[nomTel(p.observateur1),nomTel(p.observateur2)].filter(Boolean).join('\n'),nomTel(p.coordonnateur),v.pv||'']; });
  return {title:'Sorties dans les églises filles',subtitle:`${genLine()} • ${rows.length} sortie(s)`,landscape:true,fileName:'Sorties_eglises_filles',
    sections:[{heading:'Sorties programmées et effectuées',columns:cols,rows,empty:'Aucune sortie programmée.'}],
    sheets:[{name:'Sorties',title:'Sorties dans les églises filles',columns:cols.map(c=>W(c.label,Math.round(c.width*4.5),c.align)),rows}]};
}
function modelMembres(){
  const cols=[W('N°',1,'center'),W('Nom',5.8),W('Rôle',3.6),W('Code',1.8,'center'),W('Téléphone',3.6),W('Église / groupe',3.6),W('État spirituel',2.2,'center'),W('Situation',4.4)];
  const rows=DB.membres.map((m,i)=>[i+1,m.nom,m.role||'Membre',String(m.code||''),m.tel||'',m.eglise||'',m.spirituel||'',m.motifAbsence||'']);
  return {title:'Membres de la Commission Exposé — codes personnels',landscape:true,subtitle:`${genLine()} • ${rows.length} membre(s) • Document confidentiel : à remettre à chaque membre`,fileName:'Membres_commission_codes',
    sections:[{heading:'Liste des membres',columns:cols,rows,empty:'Aucun membre.'}],
    sheets:[{name:'Membres',title:'Membres de la Commission Exposé — codes personnels',columns:cols.map(c=>W(c.label,Math.round(c.width*4.5),c.align)),rows}]};
}
const EXPORTS = [
  {id:'membres', t:'Membres de la commission et codes personnels', s:'Liste confidentielle à imprimer pour remettre à chaque membre son code', m:()=>modelMembres()},
  {id:'definitifs', t:'Rapports de stage définitifs — par commission', s:'Synthèse, liste par commission avec les responsables, étudiants sans définitif', m:()=>modelDefinitifs()},
  {id:'suivi_rapports', t:'Suivi complet des rapports de stage', s:'Tous les dépôts : statuts, responsables, mandataires, correcteurs, dates', m:()=>modelSuivi('rapport')},
  {id:'suivi_exposes', t:'Suivi complet des exposés', s:'Tous les exposés : classes, thèmes, modérateurs, correcteurs', m:()=>modelSuivi('expose')},
  {id:'etudiants', t:'Liste des étudiants par commission', s:'Liste officielle avec les responsables de commission', m:()=>modelEtudiants()},
  {id:'presences', t:'Journal de présence des membres', s:'Pour l\'année et le mois choisis ci-dessus + situation des membres', m:()=>modelPresences(document.getElementById('ad-ex-year').value, document.getElementById('ad-ex-month').value)},
  {id:'sorties', t:'Sorties dans les églises filles', s:'Postes (jury, observateurs…), statut et PV', m:()=>modelSorties()},
  {id:'annuel', t:'Rapport d\'évolution annuel', s:'Synthèse mensuelle, commissions et situation des membres (année choisie)', html:()=>buildAnnualReportHTML(document.getElementById('ad-ex-year').value)}
];
function fillExportSelectors(){
  fillExportYears();
  const ms=document.getElementById('ad-ex-month'); const pm=ms.value;
  ms.innerHTML=`<option value="">Toute l'année</option>`+MOIS_LBL.map((m,i)=>`<option value="${i}">${m}</option>`).join('');
  ms.value=pm||'';
}
function renderExportList(){
  document.getElementById('ad-ex-list').innerHTML = EXPORTS.map(e=>`
    <div class="exp-row"><div><div class="exp-t">${escapeHtml(e.t)}</div><div class="exp-s">${escapeHtml(e.s)}</div></div>
    <div class="exp-btns"><button class="bw" onclick="runExport('${e.id}','docx')">Word</button><button class="bx" onclick="runExport('${e.id}','xlsx')">Excel</button><button class="bp" onclick="runExport('${e.id}','preview')">Aperçu</button><button class="bp" onclick="runExport('${e.id}','print')">PDF</button></div></div>`).join('');
}
function printHtml(html, landscape){
  const area=document.getElementById('print-area');
  area.innerHTML=html;
  let st=document.getElementById('print-orient');
  if(!st){ st=document.createElement('style'); st.id='print-orient'; document.head.appendChild(st); }
  st.textContent=`@page{size:A4 ${landscape?'landscape':'portrait'};margin:12mm;}`;
  area.style.display='block'; window.print();
  setTimeout(()=>{ area.style.display='none'; },800);
}
function runExport(id, fmt){
  const e=EXPORTS.find(x=>x.id===id); if(!e) return;
  try{
    if(e.html){ // rapport annuel (HTML existant)
      const html=e.html(), name='Rapport_Evolution_'+document.getElementById('ad-ex-year').value;
      if(fmt==='docx'||fmt==='xlsx') exportHtml(html, name, fmt);
      else if(fmt==='preview') document.getElementById('ad-ex-preview').innerHTML=html;
      else printHtml(html, true);
      return;
    }
    const m=e.m();
    const file=(m.fileName||'Rapport')+'_'+todayStr();
    if(fmt==='docx'){ downloadBytes(OfficeExport.buildDocx(m), file+'.docx', OfficeExport.MIME_DOCX); toast('Fichier Word téléchargé','ok'); }
    else if(fmt==='xlsx'){ downloadBytes(OfficeExport.buildXlsx(m), file+'.xlsx', OfficeExport.MIME_XLSX); toast('Fichier Excel téléchargé','ok'); }
    else if(fmt==='preview'){ document.getElementById('ad-ex-preview').innerHTML=OfficeExport.buildHtml(m); document.getElementById('ad-ex-preview').scrollIntoView({behavior:'smooth'}); }
    else printHtml(OfficeExport.buildHtml(m), m.landscape);
  }catch(err){ console.error(err); toast("Erreur lors de l'export",'ko'); }
}

/* Convertit un rapport HTML (titres .rep-title/.rep-sub/.rep-h2 + tableaux .rep-table)
   en vrai fichier Word (.docx) ou Excel (.xlsx), sans connexion Internet. */
function exportHtml(html, fileName, fmt){
  fileName = fileName + '_' + todayStr();
  const div=document.createElement('div'); div.innerHTML=html;
  const model={title:'', subtitle:'', sections:[], sheets:[]};
  let heading='';
  Array.from(div.querySelectorAll('.rep-title,.rep-sub,.rep-h2,table')).forEach(el=>{
    if(el.classList.contains('rep-title')){ if(!model.title) model.title=el.textContent.trim(); else heading=el.textContent.trim(); return; }
    if(el.classList.contains('rep-sub')){ if(!model.subtitle) model.subtitle=el.textContent.trim(); return; }
    if(el.classList.contains('rep-h2')){ heading=el.textContent.trim(); return; }
    const labels=Array.from(el.querySelectorAll('thead th')).map(th=>th.textContent.trim());
    const rows=Array.from(el.querySelectorAll('tbody tr')).map(tr=>Array.from(tr.children).map(td=>{ const t=td.innerText!==undefined?td.innerText.trim():td.textContent.trim(); return /^\d+$/.test(t)?parseInt(t,10):t; }));
    const lens=labels.map((l,i)=>Math.max(l.length, ...rows.map(r=>String(r[i]==null?'':r[i]).length)));
    const columns=labels.map((l,i)=>({label:l, align: lens[i]<=12 ? 'center':'left', w:Math.min(48,Math.max(6,lens[i]+2))}));
    model.sections.push({heading, columns:columns.map(c=>({label:c.label,align:c.align,width:c.w*0.2})), rows, xcols:columns.map(c=>({label:c.label,align:c.align,width:c.w}))});
    heading='';
  });
  model.landscape = model.sections.some(s=>s.columns.length>6);
  // Excel : les sections qui ont les mêmes colonnes sont regroupées sur une même feuille
  const groups=[];
  model.sections.forEach(s=>{
    const key=s.columns.map(c=>c.label).join('|');
    let g=groups.find(x=>x.key===key); if(!g){ g={key,secs:[]}; groups.push(g); }
    g.secs.push(s);
  });
  model.sheets=groups.map(g=>{
    const multi=g.secs.length>1;
    const rows=[]; g.secs.forEach(s=>{ if(multi && s.heading) rows.push({__section:s.heading}); s.rows.forEach(r=>rows.push(r)); });
    const cols=g.secs[0].xcols.map((c,i)=>({label:c.label,align:c.align,width:Math.max(...g.secs.map(s=>s.xcols[i].width))}));
    return {name: multi ? 'Par commission' : (g.secs[0].heading||model.title||'Feuille'), title: multi ? model.title : (g.secs[0].heading||model.title), columns:cols, rows};
  });
  try{
    const bytes = fmt==='xlsx' ? OfficeExport.buildXlsx(model) : OfficeExport.buildDocx(model);
    downloadBytes(bytes, fileName+'.'+fmt, fmt==='xlsx'?OfficeExport.MIME_XLSX:OfficeExport.MIME_DOCX);
    toast(fmt==='xlsx'?'Fichier Excel téléchargé':'Fichier Word téléchargé','ok');
  }catch(e){ console.error(e); toast("Erreur lors de l'export",'ko'); }
}

/* ================= UTILITAIRES PARTAGÉS AVEC LE CÔTÉ ÉTUDIANT ================= */
function addThemeRow(containerId, value){
  const c=document.getElementById(containerId);
  const row=document.createElement('div');
  row.className='theme-row';
  row.innerHTML=`<input type="text" placeholder="Intitulé du thème..." value="${value?escapeHtml(value):''}"><button type="button" onclick="this.parentNode.remove()">Retirer</button>`;
  c.appendChild(row);
}
function getThemes(containerId){
  return Array.from(document.querySelectorAll('#'+containerId+' input')).map(i=>i.value.trim()).filter(Boolean);
}

/* ================= INIT ================= */
(function(){
  let ok=false; try{ ok=sessionStorage.getItem('CE_ADMIN')==='1'; }catch(e){}
  if(ok) showAdmin();
  updateSyncBadge();
})();

/* ================================================================
   TABLEAU DE BORD — toutes les statistiques du logiciel
   ================================================================ */
function barRows(items, opts){
  opts=opts||{};
  if(!items.length) return `<div class="empty">${opts.empty||'Aucune donnée pour le moment'}</div>`;
  const max=Math.max(1,...items.map(i=>opts.pct?100:i.v));
  return items.map(i=>{
    const w = opts.pct ? Math.min(100,i.pct||0) : Math.round(i.v/max*100);
    const val = opts.pct ? `${i.pct!==null&&i.pct!==undefined?i.pct+'%':'—'} <small>${i.v}/${i.t}</small>` : `${i.v}`;
    const tip = opts.pct ? `${i.l} : ${i.v} sur ${i.t} (${i.pct||0}%)` : `${i.l} : ${i.v}`;
    return `<div class="bar-row" title="${escapeHtml(tip)}"><div class="bl">${escapeHtml(i.l)}${i.s?`<small>${escapeHtml(i.s)}</small>`:''}</div><div class="bar-track"><div class="bar-fill" style="width:${w}%"></div></div><div class="bv">${val}</div></div>`;
  }).join('');
}
function countBy(list, fn){ const m={}; list.forEach(x=>{ const k=fn(x); if(k) m[k]=(m[k]||0)+1; }); return Object.entries(m).sort((a,b)=>b[1]-a[1]).map(([l,v])=>({l,v})); }
function dashboardStats(){
  const today=todayStr(), ym=today.slice(0,7), year=today.slice(0,4);
  const R=DB.rapports, E=DB.expositions;
  const late = x => OUVERT(x.statut) && joursDepuis(x.tsDepot)>=RETARD_JOURS;
  const corriges=[...R,...E].filter(x=>x.dateCorrection && x.dateDepot && CORRIGE(x.statut) && x.source!=='liste officielle');
  const delai = corriges.length ? Math.round(corriges.reduce((s,x)=>s+Math.max(0,(new Date(x.dateCorrection)-new Date(x.dateDepot))/86400000),0)/corriges.length*10)/10 : null;
  const presMois=DB.presences.filter(p=>p.date && p.date.startsWith(ym));
  const alertesMembres=DB.membres.filter(m=>memberSundayAbsences(m.id).absences>=SEUIL_ABSENCES_DIMANCHE || niveauAlerte(m.financier) || niveauAlerte(m.spirituel)).length;
  const defs=R.filter(x=>x.statut==='definitif').length;
  return {today,ym,year,R,E,late,delai,presMois,alertesMembres,defs,
    k:[
      ['Étudiants inscrits',DB.etudiants.length,'n'],
      ['Commissions',DB.commissions.length,'n'],
      ['Membres de la commission',DB.membres.length,'n'],
      ["Présents aujourd'hui",DB.presences.filter(p=>p.date===today).length,'g'],
      ['Rapports définitifs',`${defs} <small>/ ${DB.etudiants.length}</small>`,'g'],
      ['Étudiants sans définitif',etudiantsSansDefinitif().length,'r'],
      ['Exposés enregistrés',E.length,'n'],
      ['À corriger (exposés + rapports)',[...E,...R].filter(x=>x.statut==='depose').length,'y'],
      ['En cours de correction',[...E,...R].filter(x=>x.statut==='en_correction').length,'y'],
      ['En retard (+'+RETARD_JOURS+' jours)',[...E,...R].filter(late).length,'r'],
      ['Corrigés à retirer',[...E,...R].filter(x=>x.statut==='corrige_complet'||x.statut==='corrige_partiel').length,'g'],
      ['Délai moyen de correction',delai===null?'—':delai+' <small>jours</small>','n'],
      ['Pointages ce mois',presMois.length,'g'],
      ['Membres à suivre (alertes)',alertesMembres,alertesMembres?'r':'n'],
      ['Messages non lus',DB.messages.filter(m=>!m.lu).length,'y'],
      ['Sorties programmées',DB.sorties.filter(v=>v.statut!=='effectuee').length,'n']
    ]};
}
function renderDashboard(){
  const st=dashboardStats();
  const d=new Date();
  document.getElementById('db-maj').textContent=`Situation au ${frDate(st.today)} à ${pad(d.getHours())}h${pad(d.getMinutes())} — se met à jour automatiquement`;
  document.getElementById('db-kpis').innerHTML=st.k.map(([l,v,c])=>`<div class="kpi kpi-${c}"><div class="kv">${v}</div><div class="kl">${l}</div></div>`).join('');
  // alertes
  const al=[];
  const lateN=[...st.E,...st.R].filter(st.late).length;
  if(lateN) al.push(`${lateN} document(s) attendent une correction depuis plus de ${RETARD_JOURS} jours.`);
  commissionBreakdownRows('rapport').filter(r=>r.pct!==null && r.pct<SEUIL_COMMISSION_FAIBLE).forEach(r=>al.push(`Commission « ${escapeHtml(r.nom)} » : seulement ${r.n}/${r.total} rapports définitifs (${r.pct}%).`));
  if(st.alertesMembres) al.push(`${st.alertesMembres} membre(s) à suivre (absences le dimanche ou situation signalée) — voir l'onglet Membres.`);
  DB.sessions.filter(s=>s.numero===1 && s.statut==='programmee' && s.dateReprise && joursDepuisStr(s.dateReprise)>=SEUIL_REPRISE_JOURS).forEach(s=>al.push(`${escapeHtml(s.classe)} n'a pas encore eu sa présentation de méthodologie (rentrée le ${frDate(s.dateReprise)}).`));
  document.getElementById('db-alertes').innerHTML = al.length ? `<div class="alert-banner">${al.join('<br>')}</div>` : '';
  const stat = list => ['definitif','depose','en_correction','corrige_complet','corrige_partiel','retire','clos'].map(k=>({l:statutLabel(k)[0],v:list.filter(x=>x.statut===k).length})).filter(i=>i.v);
  document.getElementById('db-rap-statut').innerHTML=barRows(stat(st.R),{empty:'Aucun rapport'});
  document.getElementById('db-exp-statut').innerHTML=barRows(stat(st.E),{empty:'Aucun exposé enregistré pour le moment'});
  document.getElementById('db-commissions').innerHTML=barRows(commissionBreakdownRows('rapport').map(r=>({l:r.nom,s:'Resp. : '+(r.responsable||'—'),v:r.n,t:r.total,pct:r.pct})),{pct:true,empty:'Aucune commission'});
  document.getElementById('db-exp-classe').innerHTML=barRows(countBy(st.E,x=>x.classe),{empty:'Aucun exposé'});
  document.getElementById('db-exp-phase').innerHTML=barRows(countBy(st.E,x=>x.phase),{empty:'Aucun exposé'});
  // activité mensuelle : 3 petits graphiques (une seule mesure chacun)
  document.getElementById('db-annee').textContent=st.year;
  const inY = ds => ds && ds.slice(0,4)===st.year;
  const monthly = (list, dateKey, filt) => MOIS_LBL.map((_,i)=>list.filter(x=>inY(x[dateKey]) && parseInt(x[dateKey].slice(5,7))-1===i && (!filt||filt(x))).length);
  const chart = (titre, vals) => { const mx=Math.max(1,...vals); return `<div class="msec">${titre} — total ${vals.reduce((a,b)=>a+b,0)}</div><div class="months">${vals.map((v,i)=>`<div class="mcol" title="${MOIS_LBL[i]} : ${v}"><div class="mval">${v||''}</div><div class="mbar-wrap"><div class="mbar" style="height:${Math.round(v/mx*100)}%"></div></div><div class="mlbl">${MOIS_LBL[i].slice(0,3)}</div></div>`).join('')}</div>`; };
  document.getElementById('db-mois').innerHTML =
    chart('Exposés déposés', monthly(st.E,'dateDepot')) +
    chart('Rapports de stage déposés (hors liste officielle)', monthly(st.R,'dateDepot',x=>x.source!=='liste officielle')) +
    chart('Pointages des membres', monthly(DB.presences,'date'));
  document.getElementById('db-membres').innerHTML=barRows(countBy(st.presMois,p=>p.membreNom).slice(0,12),{empty:'Aucun pointage ce mois-ci'});
  document.getElementById('db-motifs').innerHTML=barRows(countBy(st.presMois,p=>p.motif),{empty:'Aucun pointage ce mois-ci'});
  document.getElementById('db-correcteurs').innerHTML=barRows(countBy([...st.E,...st.R].filter(x=>x.correcteur && (CORRIGE(x.statut))),x=>x.correcteur).slice(0,12),{empty:'Aucune correction terminée'});
  document.getElementById('db-lieux').innerHTML=barRows(countBy([...st.E,...st.R].filter(x=>x.source!=='liste officielle'),x=>x.lieu).slice(0,10),{empty:'Aucun dépôt pour le moment'});
  const ses=DB.sessions, so=DB.sorties;
  const pills=(arr)=>`<div class="mini-pills">${arr.map(([l,v])=>`<span><b>${v}</b>${l}</span>`).join('')}</div>`;
  document.getElementById('db-activites').innerHTML =
    `<div class="msec">Séances de méthodologie</div>`+pills([['programmées',ses.filter(s=>s.statut==='programmee').length],['présentées (à valider)',ses.filter(s=>s.statut==='presentee').length],['validées',ses.filter(s=>s.statut==='validee').length]])+
    `<div class="msec" style="margin-top:14px;">Sorties dans les églises filles</div>`+pills([['programmées',so.filter(v=>v.statut!=='effectuee').length],['effectuées',so.filter(v=>v.statut==='effectuee').length],['PV rédigés',so.filter(v=>v.pv).length]])+
    `<div class="msec" style="margin-top:14px;">Source Vases d'Honneur et calendrier</div>`+pills(uniq(reglages().classes).map(c=>['sources ('+c+')',DB.bibliotheque.filter(b=>b.classe===c).length]).concat([['méditations programmées',DB.meditations.length],['quiz bibliques',DB.quizBiblique.length]]))+
    `<div class="msec" style="margin-top:14px;">Notifications</div>`+pills([['messages envoyés',DB.messages.length],['non lus',DB.messages.filter(m=>!m.lu).length]]);
}
/* Export du tableau de bord (Word / Excel) */
function exportDashboard(fmt){
  const st=dashboardStats();
  const strip = v => String(v).replace(/<[^>]+>/g,'');
  const rowsOf = items => items.map(i=>[i.l,i.v]);
  const stat = list => ['definitif','depose','en_correction','corrige_complet','corrige_partiel','retire','clos'].map(k=>({l:statutLabel(k)[0],v:list.filter(x=>x.statut===k).length})).filter(i=>i.v);
  const co=commissionBreakdownRows('rapport').map(r=>[r.nom,r.responsable||'—',r.total,r.n,r.pct!==null?r.pct+'%':'—']);
  const two=[W('Élément',8),W('Nombre',3,'center')];
  const sections=[
    {heading:'Chiffres clés',columns:[W('Indicateur',9),W('Valeur',4,'center')],rows:st.k.map(([l,v])=>[l,strip(v)])},
    {heading:'Rapports de stage par statut',columns:two,rows:rowsOf(stat(st.R))},
    {heading:'Exposés par statut',columns:two,rows:rowsOf(stat(st.E)),empty:'Aucun exposé.'},
    {heading:'Rapports définitifs par commission',columns:[W('Commission',4.5),W('Responsable',5.5),W('Effectif',2,'center'),W('Définitifs',2.2,'center'),W('Taux',2,'center')],rows:co},
    {heading:'Pointages des membres ce mois',columns:two,rows:rowsOf(countBy(st.presMois,p=>p.membreNom)),empty:'Aucun pointage ce mois-ci.'},
    {heading:'Corrections terminées par correcteur',columns:two,rows:rowsOf(countBy([...st.E,...st.R].filter(x=>x.correcteur&&CORRIGE(x.statut)),x=>x.correcteur)),empty:'Aucune correction terminée.'}
  ];
  const m={title:'Tableau de bord — Commission Exposé',subtitle:genLine(),fileName:'Tableau_de_bord',sections,
    sheets:sections.map(s=>({name:s.heading,title:s.heading,columns:s.columns.map(c=>W(c.label,Math.round(c.width*4.5),c.align)),rows:s.rows}))};
  const file='Tableau_de_bord_'+todayStr();
  if(fmt==='xlsx') downloadBytes(OfficeExport.buildXlsx(m), file+'.xlsx', OfficeExport.MIME_XLSX);
  else downloadBytes(OfficeExport.buildDocx(m), file+'.docx', OfficeExport.MIME_DOCX);
  toast(fmt==='xlsx'?'Fichier Excel téléchargé':'Fichier Word téléchargé','ok');
}

/* ================================================================
   PERSONNALISATION (listes, seuils, textes d'accueil)
   ================================================================ */
const LISTES_PERSO=[
  ['classes','Classes'],['phasesExpose','Phases des exposés'],['phasesRapport','Phases des rapports de stage'],
  ['niveaux','Niveaux (situation financière / spirituelle des membres)'],['typesSource','Types de sources (bibliothèque)']
];
function renderReglages(){
  const r=reglages();
  ['badge','titre1','titre2','suiviTitre1','suiviTitre2'].forEach(k=>{ const el=document.getElementById('rg-'+k); if(el && document.activeElement!==el) el.value=(r.accueil||{})[k]||''; });
  ['retard','commissionFaible','absencesDimanche','reprise'].forEach(k=>{ const el=document.getElementById('rg-'+k); if(el && document.activeElement!==el) el.value=(r.seuils||{})[k]||''; });
  document.getElementById('rg-listes').innerHTML = LISTES_PERSO.map(([k,lbl])=>`
    <div style="margin-bottom:12px;"><div class="hint" style="font-weight:800;color:var(--GRN);margin-bottom:6px;">${lbl}</div>
      <div class="mini-pills">${(r[k]||[]).map((v,i)=>`<span>${escapeHtml(v)} ${k.startsWith('phases')&&v===PHASE_DEFINITIVE?'<em class="hint">(obligatoire)</em>':`<a class="pill-link" href="javascript:void(0)" onclick="rgListeRenommer('${k}',${i})">Renommer</a> <a class="pill-link" style="background:var(--REDP);color:var(--RED);" href="javascript:void(0)" onclick="rgListeRetirer('${k}',${i})">Retirer</a>`}</span>`).join('')}</div>
      <div class="theme-row" style="margin-top:6px;"><input class="inline-in" type="text" id="rg-new-${k}" placeholder="Ajouter..." onkeydown="if(event.key==='Enter')rgListeAjouter('${k}')"><button type="button" style="background:var(--GRNP);color:var(--GRN);" onclick="rgListeAjouter('${k}')">Ajouter</button></div>
    </div>`).join('');
}
function rgListeAjouter(k){
  const inp=document.getElementById('rg-new-'+k), v=inp.value.trim();
  if(!v){ toast('Valeur requise','ko'); return; }
  if(existeDeja(DB.reglages[k], v)){ toast('Cette valeur existe déjà dans la liste','ko'); return; }
  DB.reglages[k].push(v); applyReglages(); saveDB(); renderReglages(); toast('Ajouté','ok');
}
function rgListeRetirer(k,i){
  const v=DB.reglages[k][i];
  if(DB.reglages[k].length<=1){ toast('La liste doit garder au moins une valeur','ko'); return; }
  if(!confirm(`Retirer « ${v} » de la liste ?`)) return;
  DB.reglages[k].splice(i,1); applyReglages(); saveDB(); renderReglages(); toast('Retiré','ok');
}
function rgListeRenommer(k,i){
  const ancien=DB.reglages[k][i];
  const v=(prompt('Nouveau nom :', ancien)||'').trim();
  if(!v || v===ancien) return;
  if(DB.reglages[k].some((x,j)=>j!==i && normName(x)===normName(v))){ toast('Cette valeur existe déjà','ko'); return; }
  DB.reglages[k][i]=v;
  // les fiches qui utilisaient l'ancien nom suivent le changement
  if(k==='classes') ['bibliotheque','meditations','quizBiblique','sessions','expositions','presences','etudiants'].forEach(c=>(DB[c]||[]).forEach(r=>{ if(r.classe===ancien) r.classe=v; }));
  if(k==='phasesExpose') DB.expositions.forEach(r=>{ if(r.phase===ancien) r.phase=v; });
  if(k==='phasesRapport') DB.rapports.forEach(r=>{ if(r.phase===ancien) r.phase=v; });
  if(k==='niveaux') DB.membres.forEach(m=>{ if(m.financier===ancien) m.financier=v; if(m.spirituel===ancien) m.spirituel=v; });
  if(k==='typesSource') DB.bibliotheque.forEach(b=>{ if(b.type===ancien) b.type=v; });
  applyReglages(); saveDB(); renderReglages(); toast('Renommé partout','ok');
}
function rgTexte(k,v){ DB.reglages.accueil[k]=v.trim(); saveDB(); toast('Texte enregistré','ok'); }
function rgSeuil(k,v){ const n=parseInt(v,10); if(!(n>0)){ toast('Nombre invalide','ko'); renderReglages(); return; } DB.reglages.seuils[k]=n; applyReglages(); saveDB(); toast('Seuil enregistré','ok'); }

/* ================================================================
   DOUBLONS : détection et fusion
   ================================================================ */
function renderDoublons(type){
  const list = type==='etudiants' ? DB.etudiants : DB.membres;
  const el=document.getElementById(type==='etudiants'?'ads-doublons':'ad-mb-doublons'); if(!el) return;
  const paires=doublonsProbables(list);
  const card=document.getElementById('ads-doublons-card'); if(type==='etudiants' && card) card.classList.toggle('hidden', !paires.length);
  if(!paires.length){ el.innerHTML=''; return; }
  const info = x => type==='etudiants' ? (x.commission||'') : (x.role||'')+(x.tel?' — '+x.tel:'');
  el.innerHTML = `<div class="alert-banner" style="margin:${type==='etudiants'?'12px 16px':'0 0 10px'};">${paires.length} doublon(s) possible(s) : choisissez la fiche à garder (les dépôts et pointages de l'autre lui sont rattachés).</div>` +
    paires.map(([a,b])=>`<div class="list-item"><div class="li-sub" style="font-size:13px;color:var(--INK);"><b>${escapeHtml(a.nom)}</b> <span class="hint">${escapeHtml(info(a))}</span><br><b>${escapeHtml(b.nom)}</b> <span class="hint">${escapeHtml(info(b))}</span></div>
      <div class="actions"><button class="btn-xs b-ok" onclick="fusionner('${type}','${a.id}','${b.id}')">Garder « ${escapeHtml(a.nom)} »</button><button class="btn-xs b-ok" onclick="fusionner('${type}','${b.id}','${a.id}')">Garder « ${escapeHtml(b.nom)} »</button><button class="btn-xs b-y" onclick="pasDoublon('${a.id}','${b.id}','${type}')">Ce ne sont pas des doublons</button></div></div>`).join('');
}
function fusionner(type, gardeId, jeteId){
  const coll = type==='etudiants' ? 'etudiants' : 'membres';
  const garde=DB[coll].find(x=>x.id===gardeId), jete=DB[coll].find(x=>x.id===jeteId);
  if(!garde || !jete) return;
  if(!confirm(`Garder « ${garde.nom} » et supprimer « ${jete.nom} » ?`)) return;
  if(type==='etudiants'){
    const kj=cleNom(jete.nom);
    DB.rapports.concat(DB.expositions).forEach(r=>{ if(r.etudiantId===jete.id || cleNom(r.etudiantNom)===kj){ r.etudiantId=garde.id; r.etudiantNom=garde.nom; } });
    // un seul rapport définitif pour l'étudiant conservé
    const defs=DB.rapports.filter(r=>r.statut==='definitif' && cleNom(r.etudiantNom)===cleNom(garde.nom));
    defs.slice(1).forEach(r=>{ if(r.source==='liste officielle') removeRecord('rapports', r.id); });
    DB.messages.forEach(m=>{ if((!m.cible||m.cible==='personne') && cleNom(m.nom)===kj) m.nom=garde.nom; });
  } else {
    DB.presences.forEach(p=>{ if(p.membreId===jete.id){ p.membreId=garde.id; p.membreNom=garde.nom; } });
    ['tel','eglise','lieu','motifAbsence'].forEach(k=>{ if(!garde[k] && jete[k]) garde[k]=jete[k]; });
  }
  removeRecord(coll, jete.id);
  saveDB(); toast('Doublon fusionné','ok');
  if(type==='etudiants'){ renderAdEtudiants(); renderDoublons('etudiants'); } else { renderAdMembresManage(); renderDoublons('membres'); }
}
function pasDoublon(a,b,type){
  DB.reglages.nonDoublons=uniq((DB.reglages.nonDoublons||[]).concat([[a,b].sort().join('|')]), x=>x);
  saveDB(); renderDoublons(type); toast('Noté : ce ne sont pas des doublons','ok');
}

/* ================================================================
   NOTIFICATIONS (envoi, annonces, messages programmés, modèles)
   ================================================================ */
const JOURS_LBL=['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
const CIBLE_LBL={personne:'Une personne',tous:'Tout le monde',etudiants:'Tous les étudiants',membres:'Tous les membres',commission:'Commission'};
let PUSH_STATS=null;
function personnesConnues(){
  return uniq(DB.etudiants.map(e=>e.nom).concat(DB.membres.map(m=>m.nom)), cleNom).sort((a,b)=>a.localeCompare(b,'fr'));
}
function ntCibleChange(p){
  const c=document.getElementById(p+'-cible').value;
  document.getElementById(p+'-nom-wrap').classList.toggle('hidden', c!=='personne');
  document.getElementById(p+'-com-wrap').classList.toggle('hidden', c!=='commission');
}
function renderNotif(){
  const today=todayStr();
  fillSelect('nt-com', DB.commissions.map(c=>c.nom)); fillSelect('pg-com', DB.commissions.map(c=>c.nom));
  document.getElementById('nt-personnes').innerHTML=personnesConnues().map(n=>`<option value="${escapeHtml(n)}">`).join('');
  ntCibleChange('nt'); ntCibleChange('pg');
  const pj=document.getElementById('pg-jours');
  if(!pj.children.length) pj.innerHTML=JOURS_LBL.map((j,i)=>`<span><label style="display:flex;gap:6px;align-items:center;cursor:pointer;"><input type="checkbox" value="${i}" ${i===6?'checked':''}> ${j}</label></span>`).join('');
  const kpis=[
    ['Messages envoyés aujourd\'hui', DB.messages.filter(m=>m.date===today).length,'g'],
    ['Messages personnels non lus', DB.messages.filter(m=>(!m.cible||m.cible==='personne') && !m.lu).length,'y'],
    ['Annonces envoyées', DB.messages.filter(m=>m.cible && m.cible!=='personne').length,'n'],
    ['Messages programmés actifs', DB.programmes.filter(p=>p.actif).length,'n'],
    ['Téléphones abonnés (push)', PUSH_STATS?PUSH_STATS.total:'…','g'],
    ['Écrans connectés en direct', PUSH_STATS?PUSH_STATS.enLigne:'…','g']
  ];
  document.getElementById('nt-kpis').innerHTML=kpis.map(([l,v,c])=>`<div class="kpi kpi-${c}"><div class="kv">${v}</div><div class="kl">${l}</div></div>`).join('');
  fetch('/api/push/stats',{cache:'no-store'}).then(r=>r.json()).then(j=>{ const ch=!PUSH_STATS||PUSH_STATS.total!==j.total||PUSH_STATS.enLigne!==j.enLigne; PUSH_STATS=j; if(ch && currentAdminTab==='notif') renderNotif(); }).catch(()=>{});
  renderProgrammes(); renderHistorique(); renderModeles();
}
function ntEnvoyer(){
  const cible=document.getElementById('nt-cible').value;
  const titre=document.getElementById('nt-titre').value.trim()||'Commission Exposé';
  const texte=document.getElementById('nt-texte').value.trim();
  if(!texte){ toast('Écrivez le message','ko'); return; }
  if(cible==='personne'){
    const nom=document.getElementById('nt-nom').value.trim();
    if(!nom){ toast('Choisissez la personne','ko'); return; }
    const mem=DB.membres.find(m=>cleNom(m.nom)===cleNom(nom));
    const ok=sendMessage(mem?mem.nom:nom, texte, mem?mem.tel:'', {titre, type:'manuel'});
    if(!ok){ toast('Ce message a déjà été envoyé à cette personne aujourd\'hui','ko'); return; }
  } else {
    const com=document.getElementById('nt-com').value;
    if(cible==='commission' && !com){ toast('Choisissez la commission','ko'); return; }
    if(DB.messages.some(m=>m.cible===cible && m.texte===texte && m.date===todayStr() && (cible!=='commission'||m.commission===com))){ toast('Cette annonce a déjà été envoyée aujourd\'hui','ko'); return; }
    sendAnnonce(cible, texte, titre, com, 'Administration');
  }
  saveDB();
  document.getElementById('nt-texte').value=''; document.getElementById('nt-titre').value='';
  renderNotif(); toast('Message envoyé','ok');
}
function pgAjouter(){
  const cible=document.getElementById('pg-cible').value;
  const texte=document.getElementById('pg-texte').value.trim();
  const titre=document.getElementById('pg-titre').value.trim()||'Rappel';
  const heure=document.getElementById('pg-heure').value||'08:00';
  const jours=Array.from(document.querySelectorAll('#pg-jours input:checked')).map(i=>parseInt(i.value,10));
  const nom=document.getElementById('pg-nom').value.trim(), commission=document.getElementById('pg-com').value;
  if(!texte){ toast('Écrivez le message','ko'); return; }
  if(!jours.length){ toast('Choisissez au moins un jour','ko'); return; }
  if(cible==='personne' && !nom){ toast('Choisissez la personne','ko'); return; }
  if(DB.programmes.some(p=>p.cible===cible && p.heure===heure && normName(p.texte)===normName(texte))){ toast('Ce message est déjà programmé','ko'); return; }
  DB.programmes.push({id:nid(), actif:true, cible, nom:cible==='personne'?nom:'', commission:cible==='commission'?commission:'', titre, texte, jours, heure, dernierEnvoi:''});
  saveDB(); document.getElementById('pg-texte').value=''; document.getElementById('pg-titre').value='';
  renderProgrammes(); toast('Message programmé','ok');
}
function renderProgrammes(){
  const el=document.getElementById('pg-list');
  el.innerHTML = DB.programmes.length ? DB.programmes.map(p=>`<div class="list-item" style="padding:10px 0;">
    <div class="li-top"><div class="li-name">${escapeHtml(p.titre||'Rappel')} <span class="hint">— ${escapeHtml(p.cible==='personne'?p.nom:p.cible==='commission'?'Commission '+p.commission:CIBLE_LBL[p.cible])}</span></div><span class="badge ${p.actif?'bg':'bn'}">${p.actif?'Actif':'En pause'}</span></div>
    <div class="li-sub">${escapeHtml(p.texte)}<br>${(p.jours||[]).map(j=>JOURS_LBL[j]).join(', ')} à ${escapeHtml(p.heure)}${p.dernierEnvoi?' • dernier envoi le '+frDate(p.dernierEnvoi):''}</div>
    <div class="actions"><button class="btn-xs b-y" onclick="pgBasculer('${p.id}')">${p.actif?'Mettre en pause':'Réactiver'}</button><button class="btn-xs b-del" onclick="pgSupprimer('${p.id}')">Supprimer</button></div></div>`).join('')
    : `<div class="empty">Aucun message programmé. Exemple : un rappel chaque samedi à 8 h pour tous les membres.</div>`;
}
function pgBasculer(id){ const p=DB.programmes.find(x=>x.id===id); if(!p) return; p.actif=!p.actif; saveDB(); renderProgrammes(); }
function pgSupprimer(id){ if(!confirm('Supprimer ce message programmé ?')) return; removeRecord('programmes',id); saveDB(); renderProgrammes(); }
function renderHistorique(){
  const q=normName(document.getElementById('nt-q').value), fl=document.getElementById('nt-fl').value;
  let list=DB.messages.slice().sort((a,b)=>((b.ts||0)-(a.ts||0)) || (b.date+b.heure).localeCompare(a.date+a.heure));
  if(q) list=list.filter(m=>normName(m.nom).includes(q)||normName(m.texte).includes(q));
  if(fl==='nonlu') list=list.filter(m=>(!m.cible||m.cible==='personne') && !m.lu);
  if(fl==='annonce') list=list.filter(m=>m.cible && m.cible!=='personne');
  if(fl==='auto') list=list.filter(m=>m.type==='document' || !m.type);
  const total=list.length;
  document.getElementById('nt-hist').innerHTML = total ? list.slice(0,150).map(m=>{
    const annonce=m.cible && m.cible!=='personne';
    const etat = annonce ? `<span class="badge bn">Lu par ${(m.luPar||[]).length}</span>` : (m.lu?'<span class="badge bg">Lu</span>':'<span class="badge by">Non lu</span>');
    const wa=waLink(m.tel, m.texte);
    return `<div class="list-item"><div class="li-top"><div class="li-name">${escapeHtml(m.nom)} <span class="hint">— ${escapeHtml(m.titre||'Commission Exposé')}</span></div>${etat}</div>
      <div class="li-sub" style="color:var(--INK);">${escapeHtml(m.texte)}</div>
      <div class="li-sub">${frDate(m.date)} à ${escapeHtml(m.heure||'')}${m.type==='programme'?' • programmé':''}${annonce?' • annonce':''}</div>
      <div class="actions">${wa?`<a class="pill-link" href="${wa}" target="_blank">WhatsApp</a>`:''}<button class="btn-xs b-del" onclick="msgSupprimer('${m.id}')">Supprimer</button></div></div>`;
  }).join('') + (total>150?`<div class="empty">${total-150} message(s) plus anciens — affinez la recherche.</div>`:'') : `<div class="empty">Aucun message</div>`;
}
function msgSupprimer(id){ if(!confirm('Supprimer ce message ?')) return; removeRecord('messages',id); saveDB(); renderHistorique(); }
function renderModeles(){
  const el=document.getElementById('nt-modeles');
  if(el.contains(document.activeElement)) return;
  const m=reglages().modeles||{};
  el.innerHTML=Object.keys(MODELES_LBL).map(k=>`<div class="fg"><label>${MODELES_LBL[k]}</label><textarea rows="2" onchange="rgModele('${k}',this.value)">${escapeHtml(m[k]||REGLAGES_DEFAUT.modeles[k])}</textarea>
    <div style="text-align:right;margin-top:4px;"><button class="btn-xs b-y" onclick="rgModele('${k}',null)">Rétablir le texte d'origine</button></div></div>`).join('');
}
function rgModele(k,v){
  DB.reglages.modeles[k] = (v===null || !String(v).trim()) ? REGLAGES_DEFAUT.modeles[k] : String(v).trim();
  saveDB(); if(v===null){ document.activeElement && document.activeElement.blur(); renderModeles(); } toast('Modèle enregistré','ok');
}

/* ================= ALERTES EN DIRECT (dépôts, pointages) ================= */
window.onActivite = function(a){
  const main=document.getElementById('ad-main'); if(!main || main.classList.contains('hidden')) return;
  const t = a.type==='expose' ? 'Nouvel exposé déposé' : a.type==='rapport' ? (a.statut==='definitif'?'Rapport définitif déposé':'Nouveau rapport de stage déposé') : 'Arrivée pointée';
  const b = a.type==='presence' ? `${a.nom} — ${a.motif||''}` : `${a.nom} — n° ${a.numero}`;
  ding(a.type!=='presence');
  bandeau(t, b, ()=>adSwitch(a.type==='expose'?'expose':a.type==='rapport'?'rapport':'membres'));
  notifSysteme(t, b);
};
window.onNotif = function(m){ if(currentAdminTab==='notif') setTimeout(renderNotif, 300); };
function activerAlertesBureau(){
  if(!('Notification' in window)) return;
  Notification.requestPermission().then(()=>{ majBoutonAlertes(); if(Notification.permission==='granted') toast('Alertes du bureau activées','ok'); });
}
function majBoutonAlertes(){
  const b=document.getElementById('ad-alertes-btn'); if(!b) return;
  b.classList.toggle('hidden', !('Notification' in window) || Notification.permission!=='default');
}
majBoutonAlertes();
