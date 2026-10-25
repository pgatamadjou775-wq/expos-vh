/* ============================================================
   COMMISSION EXPOSÉ — Interface Étudiant / Membres
   ("Bienvenue à l'Académie")
   Dépend de core.js (modèle de données partagé)
   ============================================================ */

/* ================= NAVIGATION ================= */
function goHome(){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on'));
  document.getElementById('s-home').classList.add('on');
}
function goScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on'));
  document.getElementById(id).classList.add('on');
}
function tickClock(){
  const d=new Date();
  const jours=['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  const mois=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  document.getElementById('home-date').textContent = jours[d.getDay()]+' '+d.getDate()+' '+mois[d.getMonth()]+' '+d.getFullYear();
  document.getElementById('home-time').textContent = pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds());
}
function currentJour(){
  const d=new Date().getDay();
  return d===6 ? 'Samedi' : 'Dimanche';
}

/* ================= THEME ROWS (dynamic list) ================= */
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

/* ================= LIEU DE DÉPÔT (liste des centres / églises + "Autre") ================= */
function fillLieuSelect(prefix){
  const sel=document.getElementById(prefix+'-lieu');
  sel.innerHTML = uniq(DB.eglises).map(n=>`<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('')
    + `<option value="__autre__">Autre (mon église/centre n'est pas dans la liste)</option>`;
}
function toggleLieuAutre(prefix){
  const sel=document.getElementById(prefix+'-lieu');
  document.getElementById(prefix+'-lieu-autre-wrap').classList.toggle('hidden', sel.value!=='__autre__');
}
function resetLieu(prefix){
  fillLieuSelect(prefix);
  document.getElementById(prefix+'-lieu-autre-wrap').classList.add('hidden');
  document.getElementById(prefix+'-lieu-autre').value='';
}
function getLieu(prefix){
  const sel=document.getElementById(prefix+'-lieu');
  if(sel.value==='__autre__'){
    const v=document.getElementById(prefix+'-lieu-autre').value.trim();
    return v || 'Autre (non précisé)';
  }
  return sel.value;
}
/* ================= LISTE OFFICIELLE : recherche du nom + responsable automatique ================= */
let rpRespAuto='';   // dernier responsable rempli automatiquement (pour ne pas écraser une saisie manuelle)
function rpNomSearch(){
  const q=normName(document.getElementById('rp-nom').value);
  const list=document.getElementById('rp-nom-list');
  document.getElementById('rp-nom-info').textContent='';
  if(q.length<2){ list.classList.add('hidden'); list.innerHTML=''; return; }
  const res=DB.etudiants.filter(e=>normName(e.nom).includes(q)).slice(0,25);
  list.classList.remove('hidden');
  list.innerHTML = res.length ? res.map(e=>`<div class="pick-item" onclick="rpNomPick('${e.id}')"><div class="av">${initials(e.nom)}</div><div style="flex:1;"><div class="pk-name">${escapeHtml(e.nom)}</div><div class="pk-sub">${escapeHtml(e.commission||'')} • Resp. : ${escapeHtml(e.responsable||commissionResponsable(e.commission)||'—')}</div></div>${rapportDefinitifDe(e.nom)?'<span class="badge bg">Définitif</span>':''}</div>`).join('')
    : `<div class="empty">Nom absent de la liste — continuez en le saisissant en entier.</div>`;
}
function rpNomPick(id){
  const e=DB.etudiants.find(x=>x.id===id); if(!e) return;
  document.getElementById('rp-nom').value=e.nom;
  const list=document.getElementById('rp-nom-list'); list.classList.add('hidden'); list.innerHTML='';
  const sel=document.getElementById('rp-commission');
  if(e.commission && Array.from(sel.options).some(o=>o.value===e.commission)) sel.value=e.commission;
  const resp=e.responsable||commissionResponsable(e.commission);
  if(resp){ document.getElementById('rp-resp-nom').value=resp; rpRespAuto=resp; }
  const def=rapportDefinitifDe(e.nom);
  document.getElementById('rp-nom-info').innerHTML = def ? `Rapport définitif déjà enregistré (n° ${escapeHtml(def.numero)}).` : `Commission : <b>${escapeHtml(e.commission||'—')}</b>`;
}
function exNomSearch(){
  const q=normName(document.getElementById('ex-nom').value);
  const list=document.getElementById('ex-nom-list');
  if(q.length<2){ list.classList.add('hidden'); list.innerHTML=''; return; }
  const res=DB.etudiants.filter(e=>normName(e.nom).includes(q)).slice(0,25);
  if(!res.length){ list.classList.add('hidden'); list.innerHTML=''; return; }
  list.classList.remove('hidden');
  list.innerHTML = res.map(e=>`<div class="pick-item" onclick="exNomPick('${e.id}')"><div class="av">${escapeHtml(initials(e.nom))}</div><div style="flex:1;"><div class="pk-name">${escapeHtml(e.nom)}</div><div class="pk-sub">${escapeHtml(e.commission||'')}</div></div></div>`).join('');
}
function exNomPick(id){
  const e=DB.etudiants.find(x=>x.id===id); if(!e) return;
  document.getElementById('ex-nom').value=e.nom;
  const list=document.getElementById('ex-nom-list'); list.classList.add('hidden'); list.innerHTML='';
}
function rpCommissionChange(){
  const inp=document.getElementById('rp-resp-nom');
  const resp=commissionResponsable(document.getElementById('rp-commission').value);
  if(!inp.value.trim() || inp.value.trim()===rpRespAuto){ inp.value=resp; rpRespAuto=resp; }
}
function rpPhaseInfo(){
  document.getElementById('rp-phase-info').classList.toggle('hidden', document.getElementById('rp-phase').value!=='Dépôt définitif');
}

function fillCommissionSelect(prefix){
  const sel=document.getElementById(prefix+'-commission');
  sel.innerHTML = DB.commissions.length
    ? uniq(DB.commissions, c=>normName(c.nom)).map(c=>`<option value="${escapeHtml(c.nom)}">${escapeHtml(c.nom)}</option>`).join('')
    : `<option value="">Aucune commission configurée</option>`;
}

/* ================= PHOTO UPLOAD (générique) ================= */
const photoStore = { ex:[], rp:[] };
function renderPhotoGrid(key, gridId){
  const grid=document.getElementById(gridId);
  const photos=photoStore[key];
  grid.innerHTML = photos.map((src,i)=>`<div class="photo-thumb"><img src="${src}"><button class="rm" onclick="removePhoto('${key}','${gridId}',${i})">×</button></div>`).join('')
    + `<label class="photo-add">Ajouter une photo<input type="file" accept="image/*" capture="environment" onchange="addPhoto('${key}','${gridId}',this)"></label>`;
}
function addPhoto(key, gridId, input){
  const file=input.files[0]; if(!file) return;
  toast('Préparation de la photo…','ok');
  compressImage(file,1280,0.72).then(dataUrl=>{
    photoStore[key].push(dataUrl);
    renderPhotoGrid(key, gridId);
    if(key==='ex') exToggleChk(); else if(key==='rp') rpToggleChk();
  }).catch(()=>toast('Impossible de lire cette photo','ko'));
}
function removePhoto(key, gridId, i){
  photoStore[key].splice(i,1);
  renderPhotoGrid(key, gridId);
  if(key==='ex') exToggleChk(); else if(key==='rp') rpToggleChk();
}

/* ================= NOTIFICATIONS (messages destinés à l'appli "Suivi") ================= */
// Message automatique à l'étudiant, au responsable et au mandataire (une seule fois par personne)
function notifyDoc(x, cle, vars){
  const type = x.numero && String(x.numero).startsWith('EXP') ? 'exposé' : 'rapport';
  const v=Object.assign({nom:x.etudiantNom, numero:x.numero, type, date:frDate(x.dateDepot), heure:x.heureDepot||''}, vars||{});
  const texte = modele(cle, v);
  const titres={depotExpose:'Exposé reçu',depotRapport:'Rapport reçu',depotDefinitif:'Rapport définitif reçu',enCorrection:'En cours de correction',correctionTerminee:'Correction terminée',retrait:'Retrait confirmé'};
  const dest=[[x.etudiantNom,x.tel]];
  if(x.responsable && x.responsable.nom) dest.push([x.responsable.nom, x.responsable.tel]);
  if(x.mandataire && x.mandataire.nom) dest.push([x.mandataire.nom, x.mandataire.tel]);
  uniq(dest, d=>cleNom(d[0])).forEach(([nom,tel])=>sendMessage(nom, texte, tel, {titre:titres[cle]||'Commission Exposé', type:'document'}));
}

/* ================================================================
   MODULE 1 — POINTAGE D'ARRIVÉE DES MEMBRES DE LA COMMISSION
   ================================================================ */
let prSelMembre=null;
function openPresence(){
  goScreen('s-presence');
  document.getElementById('pr-search').classList.remove('hidden');
  document.getElementById('pr-form').classList.add('hidden');
  document.getElementById('pr-success').classList.add('hidden');
  document.getElementById('pr-s').value='';
  prFilter();
}
function prFilter(){
  const q=normName(document.getElementById('pr-s').value);
  const list=document.getElementById('pr-list');
  const membres = DB.membres.filter(m=>normName(m.nom).includes(q));
  list.innerHTML = membres.length ? membres.map(m=>`<div class="pick-item" onclick="prSelect('${m.id}')"><div class="av">${escapeHtml(initials(m.nom))}</div><div><div class="pk-name">${escapeHtml(m.nom)}</div></div></div>`).join('')
    : `<div class="empty"><p>Aucun membre trouvé</p></div>`;
}
function prSelect(id){
  remplirListes();
  prSelMembre = DB.membres.find(m=>m.id===id);
  if(!prSelMembre) return;
  document.getElementById('pr-search').classList.add('hidden');
  document.getElementById('pr-form').classList.remove('hidden');
  document.getElementById('pr-who').innerHTML=`<div class="av" style="width:44px;height:44px;">${initials(prSelMembre.nom)}</div><div><div style="font-weight:700;font-size:15px;">${prSelMembre.nom}</div><div class="hint">Arrivée à ${nowTimeStr()}</div></div>`;
  document.getElementById('pr-jour').value = currentJour();
  prFillCreneaux();
  prRenderMotifs();
}
function prFillCreneaux(){
  const jour=document.getElementById('pr-jour').value;
  const sel=document.getElementById('pr-creneau');
  const list = DB.creneaux.filter(c=>c.jour===jour);
  sel.innerHTML = list.map(c=>`<option value="${c.id}">${c.label}</option>`).join('');
}
function prRenderMotifs(){
  const c=document.getElementById('pr-motifs');
  const motifs = DB.motifsPresence && DB.motifsPresence.length ? DB.motifsPresence : ['Permanence'];
  c.innerHTML = motifs.map((m,i)=>`<div class="chip ${i===0?'sel':''}" data-m="${escapeHtml(m)}" onclick="prPickMotif(this)"><span class="dot"></span>${escapeHtml(m)}</div>`).join('');
  document.getElementById('pr-extra').classList.add('hidden');
}
function prPickMotif(el){
  document.querySelectorAll('#pr-motifs .chip').forEach(c=>c.classList.remove('sel'));
  el.classList.add('sel');
  const m=el.dataset.m;
  document.getElementById('pr-extra').classList.toggle('hidden', m==='Permanence');
  document.getElementById('pr-themes-wrap').classList.toggle('hidden', m==='Présentation de la méthodologie');
  document.getElementById('pr-salle-wrap').classList.toggle('hidden', m!=='Présentation de la méthodologie');
  if(m==='Présentation de la méthodologie') prCheckSalle();
}
function findSessionForToday(classe){
  return DB.sessions.find(s=>s.classe===classe && s.dateProgrammee===todayStr() && s.statut==='programmee');
}
function prCheckSalle(){
  const motifEl=document.querySelector('#pr-motifs .chip.sel');
  if(!motifEl || motifEl.dataset.m!=='Présentation de la méthodologie') return;
  const classe=document.getElementById('pr-classe').value;
  const session=findSessionForToday(classe);
  const info=document.getElementById('pr-salle-info');
  const row=document.getElementById('pr-valid-row');
  if(session){
    const presentateurs=(session.presentateurs||[]).map(p=>p.nom).join(', ')||'—';
    info.className='note-box complet';
    info.innerHTML=`<div class="note-lbl">Séance programmée aujourd'hui</div><div class="note-txt">Passage n°${session.numero} — Salle : <b>${escapeHtml(session.salle||'—')}</b> — ${classe}<br>Présentateur(s) prévu(s) : ${escapeHtml(presentateurs)}</div>`;
    row.classList.remove('hidden');
  } else {
    info.className='note-box partiel';
    info.innerHTML=`<div class="note-lbl">ℹ Aucune séance programmée</div><div class="note-txt">Aucune présentation de méthodologie n'est programmée aujourd'hui pour ${classe}.</div>`;
    row.classList.add('hidden');
    document.getElementById('pr-valid-meth').checked=false;
  }
}
function confirmArrivee(){
  if(!prSelMembre){ goHome(); return; }
  const motifEl=document.querySelector('#pr-motifs .chip.sel');
  const motif = motifEl ? motifEl.dataset.m : 'Permanence';
  const jour=document.getElementById('pr-jour').value;
  const creneauId=document.getElementById('pr-creneau').value;
  const creneau=DB.creneaux.find(c=>c.id===creneauId);
  const classe = motif==='Permanence'?'':document.getElementById('pr-classe').value;
  const rec={
    id:nid(), membreId:prSelMembre.id, membreNom:prSelMembre.nom,
    date:todayStr(), jour, creneauId, creneauLabel:creneau?creneau.label:'',
    motif, classe,
    themes: (motif==='Permanence'||motif==='Présentation de la méthodologie')?'':document.getElementById('pr-themes').value.trim(),
    heureArrivee: nowTimeStr(), tsArrivee: nowFull(), heureDepart:'', tsDepart:0,
    dureeMin:0, statut:'present'
  };
  DB.presences.push(rec);

  let extraMsg='';
  if(motif==='Présentation de la méthodologie'){
    const session=findSessionForToday(classe);
    const valide=document.getElementById('pr-valid-meth').checked;
    if(session && valide){
      session.statut='presentee';
      session.presentateur=prSelMembre.nom;
      session.dateValidation=todayStr();
      session.compteRendu=document.getElementById('pr-compte-rendu').value.trim();
      extraMsg = ' — Présentation effectuée (compte-rendu transmis à l\'administration pour validation finale)';
    } else if(session && !valide){
      extraMsg = ' — Séance programmée non encore validée.';
    }
  }
  saveDB();
  document.getElementById('pr-form').classList.add('hidden');
  document.getElementById('pr-success').classList.remove('hidden');
  document.getElementById('pr-suc-title').textContent='Arrivée enregistrée';
  document.getElementById('pr-suc-sub').textContent=`${prSelMembre.nom} — ${jour} ${creneau?creneau.label:''} — ${motif}${extraMsg}`;
  toast('Présence enregistrée','ok');
}

/* ================================================================
   MODULE 2 — DÉPÔT / RETRAIT DES EXPOSÉS
   ================================================================ */
function remplirListes(){
  const r=reglages();
  fillSelect('ex-classe', r.classes); fillSelect('pr-classe', r.classes);
  fillSelect('ex-phase', r.phasesExpose); fillSelect('rp-phase', r.phasesRapport);
}
function openExpose(){
  goScreen('s-expose'); remplirListes();
  photoStore.ex=[];
  document.getElementById('ex-nom').value=''; document.getElementById('ex-tel').value=''; document.getElementById('ex-moderateur').value='';
  document.getElementById('ex-nom-classe').value='';
  document.getElementById('ex-nom-list').classList.add('hidden');
  document.getElementById('ex-themes-list').innerHTML=''; addThemeRow('ex-themes-list');
  document.getElementById('ex-chk').checked=false; document.getElementById('ex-chk').disabled=true;
  resetLieu('ex');
  renderPhotoGrid('ex','ex-photos'); exToggleChk();
  exSwitch('deposer');
  document.getElementById('ex-success').classList.add('hidden');
}
function exSwitch(mode){
  document.getElementById('ex-tab-d').classList.toggle('on', mode==='deposer');
  document.getElementById('ex-tab-r').classList.toggle('on', mode==='retirer');
  document.getElementById('ex-deposer').classList.toggle('hidden', mode!=='deposer');
  document.getElementById('ex-retirer').classList.toggle('hidden', mode!=='retirer');
  document.getElementById('ex-retrait-detail').classList.add('hidden');
  document.getElementById('ex-success').classList.add('hidden');
  if(mode==='retirer'){ document.getElementById('ex-r-s').value=''; renderExRetrait(); }
  else { document.getElementById('ex-retirer').classList.add('hidden'); document.getElementById('ex-deposer').classList.remove('hidden'); }
}
function exToggleChk(){
  const ok = photoStore.ex.length>0;
  const chk=document.getElementById('ex-chk');
  chk.disabled = !ok;
  document.getElementById('ex-chk-row').classList.toggle('locked', !ok);
  if(!ok) chk.checked=false;
  exToggleBtn();
}
function exToggleBtn(){
  document.getElementById('ex-btn').disabled = !document.getElementById('ex-chk').checked;
}
function confirmDepotExpose(){
  const nom=document.getElementById('ex-nom').value.trim();
  if(!nom){ toast('Le nom de l\'étudiant est requis','ko'); return; }
  if(!document.getElementById('ex-moderateur').value.trim()){ toast('Le nom du modérateur est requis','ko'); return; }
  if(!photoStore.ex.length){ toast('Ajoutez au moins une photo de couverture','ko'); return; }
  DB.compteurs.expose++;
  const numero = 'EXP-'+todayStr().replace(/-/g,'')+'-'+String(DB.compteurs.expose).padStart(3,'0');
  const rec={
    id:nid(), numero, etudiantNom:nom, tel:document.getElementById('ex-tel').value.trim(), classe:document.getElementById('ex-classe').value,
    nomClasse:document.getElementById('ex-nom-classe').value.trim(),
    phase:document.getElementById('ex-phase').value, moderateur:document.getElementById('ex-moderateur').value.trim(),
    lieu:getLieu('ex'),
    themes:getThemes('ex-themes-list'), photos:photoStore.ex.slice(),
    statut:'depose', correcteur:'', commentaire:'', commentaireBrouillon:'', niveauCorrection:'',
    dateDepot: todayStr(), heureDepot: nowTimeStr(), tsDepot: nowFull(), dateCorrection:'', dateRetrait:''
  };
  DB.expositions.push(rec);
  notifyDoc(rec, 'depotExpose');
  saveDB();
  document.getElementById('ex-deposer').classList.add('hidden');
  document.getElementById('ex-success').classList.remove('hidden');
  document.getElementById('ex-suc-title').textContent='Dépôt confirmé';
  document.getElementById('ex-suc-sub').textContent=`${nom} — n° ${numero} — ${rec.phase}`;
  toast('Exposé déposé','ok');
}
function renderExRetrait(){
  const q=normName(document.getElementById('ex-r-s').value);
  const list=document.getElementById('ex-r-list');
  let d=DB.expositions.filter(x=>x.statut==='corrige_complet'||x.statut==='corrige_partiel');
  if(q) d=d.filter(x=>normName(x.etudiantNom).includes(q)||normName(x.numero).includes(q));
  d.sort((a,b)=>b.tsDepot-a.tsDepot);
  list.innerHTML = d.length ? d.map(x=>`<div class="pick-item" onclick="openExRetraitDetail('${x.id}')"><div class="av">${escapeHtml(initials(x.etudiantNom))}</div><div style="flex:1;"><div class="pk-name">${escapeHtml(x.etudiantNom)}</div><div class="pk-sub">${x.numero} • ${x.classe} • ${x.phase}</div></div><span class="badge ${x.statut==='corrige_complet'?'bg':'by'}">${x.statut==='corrige_complet'?'Complet':'Partiel'}</span></div>`).join('')
    : `<div class="empty"><p>Aucun exposé corrigé disponible pour ce nom</p></div>`;
}
function openExRetraitDetail(id){
  const x=DB.expositions.find(e=>e.id===id); if(!x) return;
  document.getElementById('ex-retirer').classList.add('hidden');
  const box=document.getElementById('ex-retrait-detail');
  box.classList.remove('hidden');
  box.innerHTML=`
    <div class="card"><div class="card-b">
      <div style="font-weight:700;font-size:15px;">${escapeHtml(x.etudiantNom)}</div>
      <div class="hint" style="margin-bottom:10px;">${x.numero} • ${x.classe} • ${x.phase}${x.lieu?' • '+escapeHtml(x.lieu):''}</div>
      <div class="note-box ${x.statut==='corrige_complet'?'complet':'partiel'}">
        <div class="note-lbl">${x.statut==='corrige_complet'?'Complètement corrigé':'Partiellement corrigé'}</div>
        <div class="note-txt">${x.commentaire ? escapeHtml(x.commentaire) : 'Aucune remarque particulière de la commission.'}</div>
      </div>
      <label class="chk-row"><input type="checkbox" id="ex-r-chk" onchange="document.getElementById('ex-r-btn').disabled=!this.checked"><span class="chk-txt">Je confirme avoir récupéré mon document corrigé.</span></label>
      <button class="btn btn-y" id="ex-r-btn" disabled onclick="confirmRetraitExpose('${x.id}')">Valider le retrait</button>
      <button class="btn btn-ghost" onclick="exSwitch('retirer')">Annuler</button>
    </div></div>`;
}
function confirmRetraitExpose(id){
  const x=DB.expositions.find(e=>e.id===id); if(!x) return;
  x.statut='retire'; x.dateRetrait=todayStr();
  notifyDoc(x, 'retrait');
  saveDB();
  document.getElementById('ex-retrait-detail').classList.add('hidden');
  document.getElementById('ex-success').classList.remove('hidden');
  document.getElementById('ex-suc-title').textContent='Retrait confirmé';
  document.getElementById('ex-suc-sub').textContent=`${x.etudiantNom} a récupéré l'exposé n° ${x.numero}`;
  toast('Retrait enregistré','ok');
}

/* ================================================================
   MODULE 3 — RAPPORT DE STAGE (pas de champ classe)
   ================================================================ */
function openRapport(){
  goScreen('s-rapport'); remplirListes();
  photoStore.rp=[];
  document.getElementById('rp-nom').value=''; document.getElementById('rp-tel').value='';
  document.getElementById('rp-resp-nom').value=''; document.getElementById('rp-resp-tel').value='';
  document.getElementById('rp-mand-nom').value=''; document.getElementById('rp-mand-tel').value='';
  document.getElementById('rp-nom-list').classList.add('hidden'); document.getElementById('rp-nom-info').textContent='';
  document.getElementById('rp-phase').selectedIndex=0; rpPhaseInfo(); rpRespAuto='';
  document.getElementById('rp-chk').checked=false; document.getElementById('rp-chk').disabled=true;
  resetLieu('rp'); fillCommissionSelect('rp'); rpCommissionChange();
  renderPhotoGrid('rp','rp-photos'); rpToggleChk();
  rpSwitch('deposer');
  document.getElementById('rp-success').classList.add('hidden');
}
function rpSwitch(mode){
  document.getElementById('rp-tab-d').classList.toggle('on', mode==='deposer');
  document.getElementById('rp-tab-r').classList.toggle('on', mode==='retirer');
  document.getElementById('rp-deposer').classList.toggle('hidden', mode!=='deposer');
  document.getElementById('rp-retirer').classList.toggle('hidden', mode!=='retirer');
  document.getElementById('rp-retrait-detail').classList.add('hidden');
  document.getElementById('rp-success').classList.add('hidden');
  if(mode==='retirer'){ document.getElementById('rp-r-s').value=''; renderRpRetrait(); }
  else { document.getElementById('rp-retirer').classList.add('hidden'); document.getElementById('rp-deposer').classList.remove('hidden'); }
}
function rpToggleChk(){
  const ok = photoStore.rp.length>0;
  const chk=document.getElementById('rp-chk');
  chk.disabled = !ok;
  document.getElementById('rp-chk-row').classList.toggle('locked', !ok);
  if(!ok) chk.checked=false;
  rpToggleBtn();
}
function rpToggleBtn(){
  document.getElementById('rp-btn').disabled = !document.getElementById('rp-chk').checked;
}
function confirmDepotRapport(){
  const nom=document.getElementById('rp-nom').value.trim();
  const respNom=document.getElementById('rp-resp-nom').value.trim();
  const respTel=document.getElementById('rp-resp-tel').value.trim();
  if(!nom){ toast('Le nom de l\'étudiant est requis','ko'); return; }
  if(!photoStore.rp.length){ toast('Ajoutez au moins une photo de couverture','ko'); return; }
  // Le numéro n'est exigé que si le responsable n'est pas celui de la liste officielle (numéros non communiqués)
  const respOfficiel = respNom && normName(respNom)===normName(commissionResponsable(document.getElementById('rp-commission').value));
  if(!respNom || (!respTel && !respOfficiel)){ toast('Le nom et le numéro du responsable de la commission sont requis','ko'); return; }
  const phase=document.getElementById('rp-phase').value;
  const definitif = phase==='Dépôt définitif';
  const mandNom=document.getElementById('rp-mand-nom').value.trim();
  const mandTel=document.getElementById('rp-mand-tel').value.trim();
  const infos={
    etudiantNom:nom, tel:document.getElementById('rp-tel').value.trim(),
    phase,
    responsable:{nom:respNom, tel:respTel},
    mandataire: mandNom ? {nom:mandNom, tel:mandTel} : null,
    commission:document.getElementById('rp-commission').value,
    lieu:getLieu('rp'),
    dateDepot: todayStr(), heureDepot: nowTimeStr(), tsDepot: nowFull()
  };
  let rec;
  const existant = definitif ? rapportDefinitifDe(nom) : null;
  if(existant){
    // définitif déjà enregistré (liste officielle) : on complète la fiche au lieu de créer un doublon
    Object.assign(existant, infos, {photos:(existant.photos||[]).concat(photoStore.rp)});
    rec=existant;
  } else {
    DB.compteurs.rapport++;
    const numero = 'STG-'+todayStr().replace(/-/g,'')+'-'+String(DB.compteurs.rapport).padStart(3,'0');
    rec=Object.assign({id:nid(), numero, photos:photoStore.rp.slice(), statut: definitif?'definitif':'depose', correcteur:'', commentaire:'', commentaireBrouillon:'', dateCorrection:'', dateRetrait:''}, infos);
    DB.rapports.push(rec);
  }
  if(definitif){
    notifyDoc(rec, 'depotDefinitif');
  } else {
    notifyDoc(rec, 'depotRapport');
  }
  saveDB();
  document.getElementById('rp-deposer').classList.add('hidden');
  document.getElementById('rp-success').classList.remove('hidden');
  document.getElementById('rp-suc-title').textContent = definitif ? 'Rapport définitif enregistré' : 'Dépôt confirmé';
  document.getElementById('rp-suc-sub').textContent=`${nom} — n° ${rec.numero} — ${rec.phase}` + (definitif ? ' — ce rapport ne passe pas en correction.' : '');
  toast(definitif ? 'Rapport définitif enregistré' : 'Rapport déposé — le responsable de commission et le mandataire ont été notifiés','ok');
}
function renderRpRetrait(){
  const q=normName(document.getElementById('rp-r-s').value);
  const list=document.getElementById('rp-r-list');
  let d=DB.rapports.filter(x=>x.statut==='corrige_complet'||x.statut==='corrige_partiel');
  if(q) d=d.filter(x=>normName(x.etudiantNom).includes(q)||normName(x.numero).includes(q));
  d.sort((a,b)=>b.tsDepot-a.tsDepot);
  list.innerHTML = d.length ? d.map(x=>`<div class="pick-item" onclick="openRpRetraitDetail('${x.id}')"><div class="av">${escapeHtml(initials(x.etudiantNom))}</div><div style="flex:1;"><div class="pk-name">${escapeHtml(x.etudiantNom)}</div><div class="pk-sub">${x.numero} • ${x.phase}</div></div><span class="badge ${x.statut==='corrige_complet'?'bg':'by'}">${x.statut==='corrige_complet'?'Complet':'Partiel'}</span></div>`).join('')
    : `<div class="empty"><p>Aucun rapport corrigé disponible pour ce nom</p></div>`;
}
function openRpRetraitDetail(id){
  const x=DB.rapports.find(e=>e.id===id); if(!x) return;
  document.getElementById('rp-retirer').classList.add('hidden');
  const box=document.getElementById('rp-retrait-detail');
  box.classList.remove('hidden');
  box.innerHTML=`
    <div class="card"><div class="card-b">
      <div style="font-weight:700;font-size:15px;">${escapeHtml(x.etudiantNom)}</div>
      <div class="hint" style="margin-bottom:10px;">${x.numero} • ${x.phase}${x.lieu?' • '+escapeHtml(x.lieu):''}</div>
      <div class="note-box ${x.statut==='corrige_complet'?'complet':'partiel'}">
        <div class="note-lbl">${x.statut==='corrige_complet'?'Complètement corrigé':'Partiellement corrigé'}</div>
        <div class="note-txt">${x.commentaire ? escapeHtml(x.commentaire) : 'Aucune remarque particulière de la commission.'}</div>
      </div>
      <label class="chk-row"><input type="checkbox" id="rp-r-chk" onchange="document.getElementById('rp-r-btn').disabled=!this.checked"><span class="chk-txt">Je confirme avoir récupéré mon rapport corrigé.</span></label>
      <button class="btn btn-y" id="rp-r-btn" disabled onclick="confirmRetraitRapport('${x.id}')">Valider le retrait</button>
      <button class="btn btn-ghost" onclick="rpSwitch('retirer')">Annuler</button>
    </div></div>`;
}
function confirmRetraitRapport(id){
  const x=DB.rapports.find(e=>e.id===id); if(!x) return;
  x.statut='retire'; x.dateRetrait=todayStr();
  notifyDoc(x, 'retrait');
  saveDB();
  document.getElementById('rp-retrait-detail').classList.add('hidden');
  document.getElementById('rp-success').classList.remove('hidden');
  document.getElementById('rp-suc-title').textContent='Retrait confirmé';
  document.getElementById('rp-suc-sub').textContent=`${x.etudiantNom} a récupéré le rapport n° ${x.numero}`;
  toast('Retrait enregistré','ok');
}

/* ================================================================
   MODULE 4 — ESPACE CORRECTEUR (accès par code)
   ================================================================ */
let corUser=null; let corType='expose';
function openCorrection(){
  goScreen('s-correction');
  document.getElementById('cor-auth').classList.remove('hidden');
  document.getElementById('cor-main').classList.add('hidden');
  document.getElementById('cor-detail').classList.add('hidden');
  document.getElementById('cor-nom').value=''; document.getElementById('cor-code').value='';
  document.getElementById('cor-nom-list').innerHTML='';
  corUser=null;
}
function corFilterNom(){
  const q=normName(document.getElementById('cor-nom').value);
  const list=document.getElementById('cor-nom-list');
  if(!q){ list.innerHTML=''; return; }
  const res=DB.membres.filter(m=>normName(m.nom).includes(q));
  list.innerHTML=res.map(m=>`<div class="pick-item" onclick="corPick('${m.id}')"><div class="av">${initials(m.nom)}</div><div class="pk-name">${m.nom}</div></div>`).join('') || `<div class="empty">Aucun membre trouvé</div>`;
}
function corPick(id){
  const m=DB.membres.find(x=>x.id===id);
  document.getElementById('cor-nom').value=m.nom;
  document.getElementById('cor-nom-list').innerHTML='';
  corUser=m;
}
function corAuth(){
  const nomVal=document.getElementById('cor-nom').value.trim();
  const code=document.getElementById('cor-code').value.trim();
  const m = (corUser && corUser.nom===nomVal ? DB.membres.find(x=>x.id===corUser.id) : null) || DB.membres.find(x=>normName(x.nom)===normName(nomVal));
  if(!m || String(m.code)!==code){ toast('Nom ou code incorrect','ko'); return; }
  corUser=m;
  document.getElementById('cor-auth').classList.add('hidden');
  document.getElementById('cor-main').classList.remove('hidden');
  document.getElementById('cor-who').textContent=m.nom;
  corSwitch('expose');
}
function corLogout(){ corUser=null; goHome(); }
function corSwitch(type){
  corType=type;
  document.getElementById('cor-tab-e').classList.toggle('on', type==='expose');
  document.getElementById('cor-tab-r').classList.toggle('on', type==='rapport');
  renderCorLists();
}
function corDB(){ return corType==='expose' ? DB.expositions : DB.rapports; }
// Un rapport de stage définitif (ou dont l'étudiant a déjà son définitif) n'apparaît plus en correction
function corVisible(x){
  if(corType!=='rapport') return true;
  if(x.statut==='definitif' || x.phase==='Dépôt définitif') return false;
  return !rapportDefinitifDe(x.etudiantNom);
}
function renderCorLists(){
  if(!corUser) return;
  const data=corDB();
  const mine=data.filter(x=>x.statut==='en_correction' && x.correcteur===corUser.nom && corVisible(x));
  const dispo=data.filter(x=>x.statut==='depose' && corVisible(x));
  const mineEl=document.getElementById('cor-mine'), dispoEl=document.getElementById('cor-dispo');
  mineEl.innerHTML = mine.length ? mine.map(x=>`<div class="pick-item" onclick="corOpenFinaliser('${x.id}')"><div class="av">${escapeHtml(initials(x.etudiantNom))}</div><div style="flex:1;"><div class="pk-name">${escapeHtml(x.etudiantNom)}</div><div class="pk-sub">${x.numero} • ${x.classe||''} • ${x.phase}${x.commentaireBrouillon?' • brouillon enregistré':''}</div></div><span class="badge by">En cours</span></div>`).join('') : `<div class="empty">Aucune correction en cours</div>`;
  dispoEl.innerHTML = dispo.length ? dispo.map(x=>`<div class="pick-item"><div class="av">${escapeHtml(initials(x.etudiantNom))}</div><div style="flex:1;"><div class="pk-name">${escapeHtml(x.etudiantNom)}</div><div class="pk-sub">${x.numero} • ${x.classe||''} • ${x.phase} • déposé ${x.dateDepot}</div></div><button class="btn-sm btn-g" onclick="corPrendre('${x.id}')">Prendre</button></div>`).join('') : `<div class="empty">Aucun document disponible pour le moment</div>`;
}
function corPrendre(id){
  const x=corDB().find(d=>d.id===id); if(!x) return;
  if(x.statut!=='depose'){ toast('Ce document a déjà été pris par un autre correcteur','ko'); renderCorLists(); return; }
  x.statut='en_correction'; x.correcteur=corUser.nom; x.tsDebutCorrection=nowFull();
  notifyDoc(x, 'enCorrection');
  saveDB(); renderCorLists(); toast('Document pris en correction','ok');
}
function corOpenFinaliser(id){
  const x=corDB().find(d=>d.id===id); if(!x) return;
  document.getElementById('cor-main').classList.add('hidden');
  const box=document.getElementById('cor-detail');
  box.classList.remove('hidden');
  box.innerHTML=`
    <div class="card"><div class="card-b">
      <div style="font-weight:700;font-size:15px;">${escapeHtml(x.etudiantNom)}</div>
      <div class="hint" style="margin-bottom:12px;">${x.numero} • ${x.classe||''} • ${x.phase}</div>
      ${x.photos && x.photos.length ? `<div class="photo-grid">${x.photos.map(p=>`<a class="photo-thumb" href="${escapeHtml(p)}" target="_blank"><img src="${escapeHtml(p)}"></a>`).join('')}</div>` : ''}
      ${x.themes && x.themes.length ? `<div class="hint" style="margin-bottom:10px;">Thèmes : ${x.themes.map(escapeHtml).join(', ')}</div>` : ''}
      <div class="fg"><label>Résultat de la correction</label>
        <div class="chips">
          <div class="chip sel" data-v="corrige_complet" onclick="corPickResult(this)"><span class="dot"></span>Complètement corrigé</div>
          <div class="chip" data-v="corrige_partiel" onclick="corPickResult(this)"><span class="dot"></span>Partiellement corrigé</div>
        </div>
      </div>
      <div class="fg"><label>Commentaire / remarques (envoyées automatiquement à l'étudiant)</label><textarea id="cor-comment" rows="3" placeholder="Remarques de la commission...">${escapeHtml(x.commentaireBrouillon||'')}</textarea></div>
      <button class="btn btn-y" onclick="corFinaliser('${x.id}')">Enregistrer la correction (terminée)</button>
      <button class="btn btn-ghost" onclick="corSaveDraft('${x.id}')">Enregistrer et continuer plus tard</button>
      <button class="btn btn-ghost" onclick="corSwitch(corType)">Annuler</button>
    </div></div>`;
}
function corSaveDraft(id){
  const x=corDB().find(d=>d.id===id); if(!x) return;
  x.commentaireBrouillon = document.getElementById('cor-comment').value.trim();
  saveDB();
  document.getElementById('cor-detail').classList.add('hidden');
  document.getElementById('cor-main').classList.remove('hidden');
  renderCorLists();
  toast('Brouillon enregistré — vous pourrez continuer cette correction plus tard','ok');
}
function corPickResult(el){
  document.querySelectorAll('#cor-detail .chip').forEach(c=>c.classList.remove('sel'));
  el.classList.add('sel');
}
function corFinaliser(id){
  const x=corDB().find(d=>d.id===id);
  if(!x){ toast('Document introuvable (supprimé ?)','ko'); corSwitch(corType); return; }
  const resEl=document.querySelector('#cor-detail .chip.sel');
  x.statut = resEl ? resEl.dataset.v : 'corrige_complet';
  x.commentaire = document.getElementById('cor-comment').value.trim();
  x.dateCorrection = todayStr();
  const remarque = x.commentaire ? ` Remarques du correcteur : ${x.commentaire}` : '';
  notifyDoc(x, 'correctionTerminee', {remarques: x.commentaire ? ' Remarques du correcteur : '+x.commentaire : ''});
  saveDB();
  document.getElementById('cor-detail').classList.add('hidden');
  document.getElementById('cor-main').classList.remove('hidden');
  renderCorLists();
  toast('Correction enregistrée — l\'étudiant a reçu la notification et les remarques','ok');
}

/* ================= INIT ================= */
tickClock(); setInterval(tickClock,1000);
/* Textes d'accueil personnalisables */
function appliquerAccueil(){
  const a=reglages().accueil||{};
  const set=(id,v)=>{ const el=document.getElementById(id); if(el && v) el.textContent=v; };
  set('acc-badge',a.badge); set('acc-t1',a.titre1); set('acc-t2',a.titre2);
}
appliquerAccueil(); remplirListes();
/* Temps réel : l'Espace Correcteur est prévenu à chaque nouveau dépôt */
window.onActivite = function(a){
  if(!corUser || document.getElementById('cor-main').classList.contains('hidden')) return;
  if(a.type!=='expose' && a.type!=='rapport') return;
  if(a.type==='rapport' && (a.statut==='definitif' || a.phase===PHASE_DEFINITIVE)) return;
  syncNow();   // la liste « Disponibles pour correction » se met à jour tout de suite
  ding(true);
  bandeau(a.type==='expose'?'Nouvel exposé à corriger':'Nouveau rapport à corriger', `${a.nom} — n° ${a.numero}`, ()=>corSwitch(a.type));
};
addThemeRow('ex-themes-list');

window.onRemoteUpdate = function(){
  appliquerAccueil();
  if(document.getElementById('s-presence').classList.contains('on') && !document.getElementById('pr-search').classList.contains('hidden')) prFilter();
  if(document.getElementById('s-expose').classList.contains('on') && !document.getElementById('ex-retirer').classList.contains('hidden')) renderExRetrait();
  if(document.getElementById('s-rapport').classList.contains('on') && !document.getElementById('rp-retirer').classList.contains('hidden')) renderRpRetrait();
  if(!document.getElementById('cor-main').classList.contains('hidden')) renderCorLists();
  updateSyncBadge();
};
