/* ============================================================
   COMMISSION EXPOSÉ — Interface Administration
   Dépend de core.js (modèle de données partagé)
   ============================================================ */

function adAuth(){
  if(document.getElementById('ad-code').value.trim()!==ADMIN_CODE){ toast('Code incorrect','ko'); return; }
  document.getElementById('ad-auth').classList.add('hidden');
  document.getElementById('ad-main').classList.remove('hidden');
  adSwitch('membres');
}
let currentAdminTab='membres';
function adSwitch(tab){
  currentAdminTab=tab;
  ['membres','expose','rapport','config','seances','export'].forEach(t=>{
    document.getElementById('ad-tab-'+t).classList.toggle('on', t===tab);
    document.getElementById('ad-'+t).classList.toggle('hidden', t!==tab);
  });
  if(tab==='membres'){ renderAdMembres(); renderAdMembresAlertes(); renderAdMembresBilan(); }
  if(tab==='expose') renderAdDocs('expose');
  if(tab==='rapport') renderAdDocs('rapport');
  if(tab==='config'){ renderAdMembresManage(); renderAdCreneaux(); renderAdMotifs(); renderAdEglises(); renderAdCommissions(); renderAdBiblio(); renderAdMeditations(); renderAdQuiz(); }
  if(tab==='seances'){ renderAdSeances(); renderAdSeancesAlertes(); renderEgliseStats(); fillSortieEgliseSelect(); renderAdSorties(); addThemeRow('se-themes-list'); }
  if(tab==='export'){ fillExportYears(); }
}
window.onRemoteUpdate = function(){
  const mainVisible = document.getElementById('ad-main') && !document.getElementById('ad-main').classList.contains('hidden');
  if(mainVisible) adSwitch(currentAdminTab);
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
    if(absences>=SEUIL_ABSENCES_DIMANCHE) alertes.push(`⚠ ${escapeHtml(m.nom)} n'a pointé aucune présence lors de ${absences} dimanche(s) ce mois-ci.`);
    if(niveauAlerte(m.financier)) alertes.push(`⚠ Situation financière ${m.financier.toLowerCase()} signalée pour ${escapeHtml(m.nom)}.`);
    if(niveauAlerte(m.spirituel)) alertes.push(`⚠ Situation spirituelle ${m.spirituel.toLowerCase()} signalée pour ${escapeHtml(m.nom)}.`);
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
      <td style="text-align:left;">${escapeHtml(m.nom)}${m.lieu?'<br><span style=\"font-size:10px;color:var(--MUT);\">'+escapeHtml(m.lieu)+'</span>':''}</td>
      <td>${w.nb} / ${w.heures.toFixed(1)}h</td>
      <td>${mo.nb} / ${mo.heures.toFixed(1)}h</td>
      <td>${sa.absences>=SEUIL_ABSENCES_DIMANCHE?'<span style="color:var(--RED);font-weight:700;">':''}${sa.absences}/${sa.total}${sa.absences>=SEUIL_ABSENCES_DIMANCHE?' ⚠</span>':''}</td>
      <td><span class="badge ${niveauBadgeClass(m.financier)}">${escapeHtml(m.financier||'Moyen')}</span></td>
      <td><span class="badge ${niveauBadgeClass(m.spirituel)}">${escapeHtml(m.spirituel||'Moyen')}</span></td>
    </tr>`;
  }).join('')}</tbody></table>` : `<div class="empty">Aucun membre enregistré</div>`;
}

/* ================= EXPOSÉS / RAPPORTS ================= */
function renderAdDocs(kind){
  const data = kind==='expose' ? DB.expositions : DB.rapports;
  const pfx = kind==='expose' ? 'ade' : 'adr';
  const depose=data.filter(x=>x.statut==='depose').length;
  const encours=data.filter(x=>x.statut==='en_correction').length;
  const corrige=data.filter(x=>x.statut==='corrige_complet'||x.statut==='corrige_partiel'||x.statut==='retire').length;
  const retard=data.filter(x=>(x.statut==='depose'||x.statut==='en_correction') && joursDepuis(x.tsDepot)>=RETARD_JOURS).length;
  document.getElementById(pfx+'-depose').textContent=depose;
  document.getElementById(pfx+'-encours').textContent=encours;
  document.getElementById(pfx+'-corrige').textContent=corrige;
  document.getElementById(pfx+'-retard').textContent=retard;
  const listId = kind==='expose' ? 'ad-e-list' : 'ad-r-list';
  const sorted=data.slice().sort((a,b)=>b.tsDepot-a.tsDepot);
  const statutLbl={depose:['Déposé','bn'],en_correction:['En correction','by'],corrige_complet:['Corrigé complet','bg'],corrige_partiel:['Corrigé partiel','by'],retire:['Retiré','bg']};
  document.getElementById(listId).innerHTML = sorted.length ? sorted.map(x=>{
    const [lbl,cls]=statutLbl[x.statut]||['—','bn'];
    const late = (x.statut==='depose'||x.statut==='en_correction') && joursDepuis(x.tsDepot)>=RETARD_JOURS;
    const respTxt = x.responsable ? ` • Resp. commission : ${escapeHtml(x.responsable.nom)} (${escapeHtml(x.responsable.tel||'')})` : '';
    const mandTxt = x.mandataire ? ` • Mandataire : ${escapeHtml(x.mandataire.nom)} (${escapeHtml(x.mandataire.tel||'')})` : '';
    return `<div class="list-item"><div class="li-top"><div class="li-name">${x.etudiantNom}</div><span class="badge ${cls}">${lbl}</span></div><div class="li-sub">${x.numero}${x.classe?' • '+x.classe:''} • ${x.phase}${x.lieu?' • '+escapeHtml(x.lieu):''}${x.commission?' • '+escapeHtml(x.commission):''}<br>Déposé le ${x.dateDepot}${x.correcteur?' • Correcteur : '+x.correcteur:''}${x.dateCorrection?' • Corrigé le '+x.dateCorrection:''}${late?' • <span style="color:var(--RED);font-weight:700;">⚠ En retard</span>':''}${respTxt}${mandTxt}</div></div>`;
  }).join('') : `<div class="empty">Aucun document pour le moment</div>`;
  if(kind==='rapport') renderCommissionBreakdown(kind);
}
function commissionBreakdownRows(kind){
  const data = kind==='expose' ? DB.expositions : DB.rapports;
  return DB.commissions.map(c=>{
    const n = data.filter(x=>x.commission===c.nom).length;
    const pct = c.totalAttendu>0 ? Math.round((n/c.totalAttendu)*100) : null;
    return {nom:c.nom, total:c.totalAttendu, n, pct};
  });
}
function renderCommissionBreakdown(kind){
  const id = kind==='expose' ? 'ad-e-commission' : 'ad-r-commission';
  const el=document.getElementById(id);
  const rows=commissionBreakdownRows(kind);
  const faibles = rows.filter(r=>r.pct!==null && r.pct<SEUIL_COMMISSION_FAIBLE);
  el.innerHTML = (faibles.length ? `<div class="alert-banner">${faibles.map(r=>`⚠ Taux de dépôt faible pour "${escapeHtml(r.nom)}" : ${r.n}/${r.total} (${r.pct}%) — grand écart avec le nombre attendu.`).join('<br>')}</div>` : '')
    + (rows.length ? `<table class="rep-table"><thead><tr><th>Commission</th><th>Total attendu</th><th>Déposés</th><th>%</th></tr></thead><tbody>${rows.map(r=>`<tr><td style="text-align:left;">${escapeHtml(r.nom)}</td><td>${r.total||'—'}</td><td>${r.n}</td><td>${r.pct!==null?r.pct+'%'+(r.pct<SEUIL_COMMISSION_FAIBLE?' ⚠':''):'—'}</td></tr>`).join('')}</tbody></table>` : `<div class="empty">Aucune commission configurée</div>`);
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
        <div class="li-name" style="font-size:13.5px;">${escapeHtml(m.nom)} <span style="font-weight:400;color:var(--MUT);font-size:11.5px;">(code ${escapeHtml(m.code)})</span></div>
        <button class="btn-sm" style="background:var(--REDP);color:var(--RED);" onclick="removeMembre(${i})">🗑</button>
      </div>
      <div class="fg-row">
        <input type="text" value="${escapeHtml(m.lieu||'')}" placeholder="Lieu d'habitation" onchange="updateMembreField(${i},'lieu',this.value)">
        <input type="tel" value="${escapeHtml(m.tel||'')}" placeholder="Numéro (WhatsApp)" onchange="updateMembreField(${i},'tel',this.value)">
      </div>
      <div class="fg-row" style="margin-top:8px;">
        <input type="text" value="${escapeHtml(m.motifAbsence||'')}" placeholder="Motif d'absence (si besoin)" onchange="updateMembreField(${i},'motifAbsence',this.value)">
      </div>
      <div class="fg-row" style="margin-top:8px;">
        <select onchange="updateMembreField(${i},'financier',this.value)">${NIVEAU_OPTIONS.map(n=>`<option value="${n}" ${m.financier===n?'selected':''}>Financier : ${n}</option>`).join('')}</select>
        <select onchange="updateMembreField(${i},'spirituel',this.value)">${NIVEAU_OPTIONS.map(n=>`<option value="${n}" ${m.spirituel===n?'selected':''}>Spirituel : ${n}</option>`).join('')}</select>
      </div>
    </div>`).join('') : `<div class="empty">Aucun membre enregistré</div>`;
}
function updateMembreField(i, field, value){
  DB.membres[i][field]=value; saveDB();
  renderAdMembresAlertes();
}
function addMembre(){
  const nomInp=document.getElementById('ad-mb-new-nom');
  const codeInp=document.getElementById('ad-mb-new-code');
  const telInp=document.getElementById('ad-mb-new-tel');
  const nom=nomInp.value.trim(); const code=codeInp.value.trim();
  if(!nom){ toast('Nom requis','ko'); return; }
  if(!code){ toast('Code personnel requis','ko'); return; }
  DB.membres.push({id:nid(), nom, code, tel:telInp.value.trim(), lieu:'', financier:'Moyen', spirituel:'Moyen', motifAbsence:''});
  saveDB(); nomInp.value=''; codeInp.value=''; telInp.value=''; renderAdMembresManage();
  toast('Membre ajouté','ok');
}
function removeMembre(i){
  if(!confirm('Supprimer ce membre de la commission ?')) return;
  DB.membres.splice(i,1); saveDB(); renderAdMembresManage();
  toast('Membre supprimé','ok');
}

/* ================= CONFIGURATION : MOTIFS DE PRÉSENCE ================= */
function renderAdMotifs(){
  const el=document.getElementById('ad-mo-list');
  el.innerHTML = DB.motifsPresence.length ? DB.motifsPresence.map((m,i)=>`<div class="list-item" style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;"><div class="li-name" style="font-size:13.5px;">${escapeHtml(m)}</div>${DB.motifsPresence.length>1?`<button class="btn-sm" style="background:var(--REDP);color:var(--RED);" onclick="removeMotif(${i})">🗑</button>`:''}</div>`).join('') : `<div class="empty">Aucun motif configuré</div>`;
}
function addMotif(){
  const inp=document.getElementById('ad-mo-new');
  const v=inp.value.trim();
  if(!v){ toast('Nom requis','ko'); return; }
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
  el.innerHTML = DB.eglises.length ? DB.eglises.map((n,i)=>`<div class="list-item" style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;"><div class="li-name" style="font-size:13.5px;">${escapeHtml(n)}</div><button class="btn-sm" style="background:var(--REDP);color:var(--RED);" onclick="removeEglise(${i})">🗑</button></div>`).join('') : `<div class="empty">Aucun lieu configuré</div>`;
}
function addEglise(){
  const inp=document.getElementById('ad-eg-new');
  const v=inp.value.trim();
  if(!v){ toast('Nom requis','ko'); return; }
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
        <div class="li-sub">Total attendu : <input type="number" min="0" value="${c.totalAttendu||0}" style="width:70px;padding:4px 6px;border:1px solid var(--LINE);border-radius:6px;" onchange="updateCommissionTotal(${i}, this.value)"></div>
      </div>
      <button class="btn-sm" style="background:var(--REDP);color:var(--RED);" onclick="removeCommission(${i})">🗑</button>
    </div>`).join('') : `<div class="empty">Aucune commission configurée</div>`;
}
function addCommission(){
  const nomInp=document.getElementById('ad-co-new-nom');
  const totInp=document.getElementById('ad-co-new-total');
  const nom=nomInp.value.trim();
  if(!nom){ toast('Nom requis','ko'); return; }
  DB.commissions.push({id:nid(), nom, totalAttendu: parseInt(totInp.value)||0});
  saveDB(); nomInp.value=''; totInp.value=''; renderAdCommissions();
  toast('Commission ajoutée','ok');
}
function updateCommissionTotal(i, val){
  DB.commissions[i].totalAttendu = parseInt(val)||0;
  saveDB();
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
  el.innerHTML = list.length ? ['Classe 1','Classe 2','Classe 3'].map(cl=>{
    const items=list.filter(b=>b.classe===cl);
    if(!items.length) return '';
    return `<div style="margin-bottom:8px;"><div class="hint" style="font-weight:700;color:var(--GRN);">${cl}</div>${items.map(b=>{
      const idx=list.indexOf(b);
      return `<div class="list-item" style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;"><div><div class="li-name" style="font-size:13px;">${escapeHtml(b.titre)} <span class="badge bn">${escapeHtml(b.type)}</span></div><div class="li-sub">${b.auteur?escapeHtml(b.auteur):''}${b.lien?' • '+escapeHtml(b.lien):''}</div></div><button class="btn-sm" style="background:var(--REDP);color:var(--RED);" onclick="removeBiblio(${idx})">🗑</button></div>`;
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
  DB.bibliotheque.push({id:nid(), classe, type, titre, auteur:auteurInp.value.trim(), lien:lienInp.value.trim(), dateAjout:todayStr()});
  saveDB(); titreInp.value=''; auteurInp.value=''; lienInp.value=''; renderAdBiblio();
  toast('Source ajoutée à la bibliothèque','ok');
}
function removeBiblio(idx){
  if(!confirm('Supprimer cette source ?')) return;
  DB.bibliotheque.splice(idx,1); saveDB(); renderAdBiblio();
  toast('Supprimée','ok');
}

/* ================= CONFIGURATION : CALENDRIER DE MÉDITATION & QUIZ BIBLIQUE ================= */
function renderAdMeditations(){
  const el=document.getElementById('ad-med-list');
  const sorted=DB.meditations.slice().sort((a,b)=>a.date.localeCompare(b.date));
  el.innerHTML = sorted.length ? sorted.map(m=>{
    const idx=DB.meditations.indexOf(m);
    return `<div class="list-item" style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;"><div><div class="li-name" style="font-size:13px;">${escapeHtml(m.classe)} — ${escapeHtml(m.livre)}</div><div class="li-sub">Le ${m.date}</div></div><button class="btn-sm" style="background:var(--REDP);color:var(--RED);" onclick="removeMeditation(${idx})">🗑</button></div>`;
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
  DB.meditations.splice(idx,1); saveDB(); renderAdMeditations();
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
        <button class="btn-sm" style="background:var(--REDP);color:var(--RED);" onclick="removeQuiz(${idx})">🗑</button>
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
  DB.quizBiblique.splice(idx,1); saveDB(); renderAdQuiz();
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
  presentateurs.forEach(p=>sendMessage(p.nom, `Vous êtes programmé(e) pour présenter la méthodologie des exposés en ${classe}, le ${dateProgrammee} — Salle ${salle}.`, p.tel));
  if(session.moderateur1) sendMessage(session.moderateur1.nom, `Un 1er passage de présentation de la méthodologie est programmé pour ${classe} le ${dateProgrammee} — Salle ${salle}.`, session.moderateur1.tel);
  if(session.moderateur2) sendMessage(session.moderateur2.nom, `Un 1er passage de présentation de la méthodologie est programmé pour ${classe} le ${dateProgrammee} — Salle ${salle}.`, session.moderateur2.tel);
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
    const waTag=(tel,texte)=>{ const l=waLink(tel,texte); return l?` <a href="${l}" target="_blank">📲</a>`:''; };
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
      ${s.statut==='presentee' ? `<button class="btn-sm btn-g" style="margin-top:8px;" onclick="validerPresentation('${s.id}')">✅ Valider la présentation</button>` : ''}
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
  el.innerHTML = alertes.length ? `<div class="alert-banner">${alertes.map(s=>`⚠ ${escapeHtml(s.classe)} a fait sa rentrée le ${s.dateReprise} mais n'a toujours pas eu de passage de méthodologie (${joursDepuisStr(s.dateReprise)} jours).`).join('<br>')}</div>` : '';
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
    if(assigne) sendMessage(assigne.nom, `Vous êtes programmé(e) pour la sortie du ${date} à ${eglise}, en tant que ${p.label}.`, assigne.tel);
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
      return `${p.label} : ${escapeHtml(person.nom)} (${escapeHtml(person.tel||'—')})${link?` <a href="${link}" target="_blank">📲</a>`:''}`;
    }).join('<br>');
    return `<div class="list-item" style="border:1px solid var(--LINE);border-radius:10px;">
      <div class="li-top"><div class="li-name">${escapeHtml(v.eglise)}</div><span class="badge ${v.statut==='effectuee'?'bg':'by'}">${v.statut==='effectuee'?'Effectuée':'Programmée'}</span></div>
      <div class="li-sub" style="margin-top:6px;">Le ${v.date}</div>
      <div class="li-sub" style="margin-top:6px;">${postesTxt}</div>
      <div class="fg" style="margin-top:8px;"><label>Procès-verbal (PV) de la sortie</label><textarea rows="2" id="pv-${v.id}" placeholder="Compte-rendu de la sortie...">${escapeHtml(v.pv||'')}</textarea></div>
      <div style="display:flex;gap:8px;">
        <button class="btn-sm btn-g" onclick="savePV('${v.id}')">💾 Enregistrer le PV</button>
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
  const coTable = (rows,titre) => rows.length ? `<div class="rep-h2">${titre}</div><table class="rep-table"><thead><tr><th>Commission</th><th>Total attendu</th><th>Déposés</th><th>%</th></tr></thead><tbody>${rows.map(r=>`<tr><td style="text-align:left;">${escapeHtml(r.nom)}</td><td>${r.total||'—'}</td><td>${r.n}</td><td>${r.pct!==null?r.pct+'%':'—'}</td></tr>`).join('')}</tbody></table>` : '';
  const membresRows = DB.membres.map(m=>{
    const mo=memberMonthStats(m.id);
    return `<tr><td style="text-align:left;">${escapeHtml(m.nom)}</td><td>${mo.nb}</td><td>${mo.heures.toFixed(1)}h</td><td>${escapeHtml(m.financier||'')}</td><td>${escapeHtml(m.spirituel||'')}</td></tr>`;
  }).join('');
  return `
    <div class="rep-title">Académie Vases d'Honneur — Commission Exposé</div>
    <div class="rep-sub">Rapport d'évolution — Année ${year} — généré le ${todayStr()}</div>
    <div class="rep-h2">Synthèse mensuelle</div>
    <table class="rep-table"><thead><tr><th>Mois</th><th>Exposés déposés</th><th>Exposés corrigés</th><th>Rapports déposés</th><th>Rapports corrigés</th><th>Pointages membres</th><th>Heures cumulées</th></tr></thead>
    <tbody>${Array.from({length:12},(_,i)=>rows(i)).join('')}</tbody></table>
    <div class="rep-h2">Totaux annuels</div>
    <table class="rep-table"><thead><tr><th>Exposés déposés</th><th>Exposés corrigés</th><th>Rapports déposés</th><th>Rapports corrigés</th><th>Pointages</th><th>Heures cumulées</th></tr></thead>
    <tbody><tr><td>${totExpD}</td><td>${totExpC}</td><td>${totRapD}</td><td>${totRapC}</td><td>${totPres}</td><td>${totH.toFixed(1)}h</td></tr></tbody></table>
    ${coTable(coRowsRap,'Répartition des rapports de stage par commission')}
    <div class="rep-h2">Situation des membres (ce mois-ci)</div>
    <table class="rep-table"><thead><tr><th>Membre</th><th>Pointages</th><th>Heures</th><th>Financier</th><th>Spirituel</th></tr></thead><tbody>${membresRows}</tbody></table>`;
}
function renderAnnualPreview(){
  const year=document.getElementById('ad-ex-year').value;
  document.getElementById('ad-ex-preview').innerHTML = buildAnnualReportHTML(year);
}
function exportAnnualPDF(){
  const year=document.getElementById('ad-ex-year').value;
  const area=document.getElementById('print-area');
  area.innerHTML = buildAnnualReportHTML(year);
  area.style.display='block';
  window.print();
  setTimeout(()=>{ area.style.display='none'; },500);
}
function exportAnnualWord(){
  const year=document.getElementById('ad-ex-year').value;
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

/* ================= UTILITAIRES PARTAGÉS AVEC LE CÔTÉ ÉTUDIANT ================= */
function addThemeRow(containerId, value){
  const c=document.getElementById(containerId);
  const row=document.createElement('div');
  row.className='theme-row';
  row.innerHTML=`<input type="text" placeholder="Intitulé du thème..." value="${value?escapeHtml(value):''}"><button type="button" onclick="this.parentNode.remove()">✕</button>`;
  c.appendChild(row);
}
function getThemes(containerId){
  return Array.from(document.querySelectorAll('#'+containerId+' input')).map(i=>i.value.trim()).filter(Boolean);
}
