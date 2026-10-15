/* ============================================================
   COMMISSION EXPOSÉ — Interface "Suivi"
   Destinée aux étudiants (installable sur leur téléphone).
   Dépend de core.js (modèle de données partagé)
   ============================================================ */

function goHome(){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on'));
  document.getElementById('s-home').classList.add('on');
}
function goScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on'));
  document.getElementById(id).classList.add('on');
}

/* ================= MON SUIVI (statuts + notifications) ================= */
const STATUT_INFO = {
  depose:       {lbl:'Déposé — en attente de correction', cls:'bn'},
  en_correction:{lbl:'En cours de correction', cls:'by'},
  corrige_complet:{lbl:'Corrigé — complet, à récupérer', cls:'bg'},
  corrige_partiel:{lbl:'Corrigé — partiel, à récupérer', cls:'by'},
  retire:       {lbl:'Retiré', cls:'bg'},
  clos:         {lbl:'Clôturé — rapport définitif reçu', cls:'bn'},
  definitif:    {lbl:'Rapport définitif — enregistré', cls:'bg'}
};
function openSuivi(){
  goScreen('s-suivi');
  document.getElementById('su-s').value='';
  document.getElementById('su-docs').innerHTML = `<div class="empty">Tapez votre nom pour voir le suivi de vos dépôts</div>`;
  document.getElementById('su-messages').innerHTML = '';
}
function renderSuivi(){
  const q=normName(document.getElementById('su-s').value);
  const docsEl=document.getElementById('su-docs');
  const msgEl=document.getElementById('su-messages');
  if(!q){
    docsEl.innerHTML = `<div class="empty">Tapez votre nom pour voir le suivi de vos dépôts</div>`;
    msgEl.innerHTML='';
    return;
  }
  const matchName = n => normName(n).includes(q);
  const mesExposes = DB.expositions.filter(x=>matchName(x.etudiantNom));
  const mesRapports = DB.rapports.filter(x=>matchName(x.etudiantNom) || matchName(x.responsable&&x.responsable.nom) || matchName(x.mandataire&&x.mandataire.nom));
  const tous = [
    ...mesExposes.map(x=>({...x, type:'Exposé'})),
    ...mesRapports.map(x=>({...x, type:'Rapport de stage'}))
  ].sort((a,b)=>b.tsDepot-a.tsDepot);

  docsEl.innerHTML = tous.length ? tous.map(x=>{
    const info = STATUT_INFO[x.statut] || {lbl:x.statut, cls:'bn'};
    return `<div class="list-item" style="border:1px solid var(--LINE);border-radius:10px;margin-bottom:8px;">
      <div class="li-top"><div class="li-name">${escapeHtml(x.type)} — ${x.numero}</div><span class="badge ${info.cls}">${info.lbl}</span></div>
      <div class="li-sub">${x.source==='liste officielle'?'Enregistré depuis la liste officielle':'Déposé le '+frDate(x.dateDepot)+(x.heureDepot?' à '+x.heureDepot:'')}${x.commission?' • '+escapeHtml(x.commission):''}${x.dateCorrection?' • Corrigé le '+frDate(x.dateCorrection):''}${x.dateRetrait?' • Retiré le '+frDate(x.dateRetrait):''}</div>
      ${x.commentaire ? `<div class="note-box ${x.statut==='corrige_complet'||x.statut==='retire'?'complet':'partiel'}" style="margin-top:8px;"><div class="note-lbl">Remarques du correcteur</div><div class="note-txt">${escapeHtml(x.commentaire)}</div></div>` : ''}
    </div>`;
  }).join('') : `<div class="empty"><div class="eico">📭</div><p>Aucun exposé ou rapport trouvé pour ce nom</p></div>`;

  const mine = DB.messages.filter(m=>matchName(m.nom)).sort((a,b)=>(b.date+b.heure).localeCompare(a.date+a.heure));
  msgEl.innerHTML = mine.length ? mine.map(m=>{
    const link=waLink(m.tel, m.texte);
    return `<div class="list-item">
      <div class="li-top" style="cursor:pointer;" onclick="markMessageRead('${m.id}')"><div class="li-name">${escapeHtml(m.nom)}</div>${m.lu?'':'<span class="badge by">Nouveau</span>'}</div>
      <div class="li-sub">${escapeHtml(m.texte)}</div>
      <div class="hint" style="margin-top:4px;">${m.date} à ${m.heure}</div>
      ${link ? `<a href="${link}" target="_blank" class="btn-sm btn-g" style="margin-top:8px;display:inline-block;text-decoration:none;">📲 Envoyer via WhatsApp</a>` : ''}
    </div>`;
  }).join('') : `<div class="empty"><div class="eico">🔔</div><p>Aucune notification pour ce nom</p></div>`;
}
function markMessageRead(id){
  const m=DB.messages.find(x=>x.id===id); if(!m || m.lu) return;
  m.lu=true; saveDB(); renderSuivi();
}

/* ================= SOURCE VASES D'HONNEUR (bibliothèque) ================= */
function openBibliotheque(){
  goScreen('s-biblio');
  biblioSwitch('Classe 1');
}
function biblioSwitch(classe){
  ['1','2','3'].forEach(n=>document.getElementById('bib-tab-'+n).classList.toggle('on', classe==='Classe '+n));
  const list=(DB.bibliotheque||[]).filter(b=>b.classe===classe);
  document.getElementById('bib-list').innerHTML = list.length ? list.map(b=>`
    <div class="list-item"><div class="li-top"><div class="li-name">${escapeHtml(b.titre)}</div><span class="badge bn">${escapeHtml(b.type||'Livre')}</span></div>
    <div class="li-sub">${b.auteur?'Auteur : '+escapeHtml(b.auteur):''}${b.lien?'<br>'+escapeHtml(b.lien):''}</div></div>`).join('')
    : `<div class="empty"><div class="eico">📖</div><p>Aucune source enregistrée pour cette classe pour le moment</p></div>`;
}

/* ================= INIT ================= */
window.onRemoteUpdate = function(){
  updateSyncBadge();
  if(document.getElementById('s-suivi').classList.contains('on')) renderSuivi();
};
