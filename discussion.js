/* ============================================================
   COMMISSION EXPOSÉ — Module « Discussion » (partagé)
   Utilisé par : Suivi (étudiants), Modérateurs, Jury, Espace Correcteur, Administration.
   - Discuter avec n'importe qui (annuaire sans doublons)
   - Joindre des photos / PDF / documents
   - Envoyer un JUSTIFICATIF : il reste « en attente » jusqu'à la décision de
     l'Administration (accepté / refusé + commentaire), comme dans Sha'ah
   - Temps réel : bandeau + son à la réception, notification push si abonné
   Dépend de core.js
   ============================================================ */
const Discussion = {
  el:null, moi:'', autre:null, opts:{}, pieces:[], brouillon:'', envoiEnCours:false,

  monter(el, moi, opts){
    this.el = typeof el==='string' ? document.getElementById(el) : el;
    this.moi = moi; this.opts = opts||{}; this.autre = this.opts.ouvrir || null;
    this.pieces=[]; this.brouillon='';
    this.rendre();
  },
  visible(){ return this.el && this.el.offsetParent!==null; },
  rendre(){
    if(!this.el || !this.moi) return;
    if(this.autre) this.rendreFil(); else this.rendreListe();
  },

  /* ---------- Liste des conversations ---------- */
  rendreListe(){
    const fils=filsDe(this.moi);
    this.el.innerHTML = `
      <div class="card"><div class="card-b">
        <div class="fg" style="margin-bottom:6px;"><label>Nouvelle discussion</label>
          <input type="text" class="disc-cherche" placeholder="Tapez un nom (Administration, un membre, un modérateur…)" autocomplete="off"></div>
        <div class="pick-list hidden disc-res"></div>
        ${this.opts.raccourcis!==false ? `<button class="btn-sm btn-g" style="margin-top:8px;" data-autre="${escapeHtml(ADMIN_NOM)}">Écrire à l'Administration</button>` : ''}
      </div></div>
      <div class="card">${fils.length ? fils.map(f=>`
        <div class="list-item li-item" data-autre="${escapeHtml(f.autre)}">
          <div class="li-top"><div class="li-name">${escapeHtml(f.autre)}</div>${f.nonLus?`<span class="count-pill">${f.nonLus}</span>`:''}</div>
          <div class="li-sub">${f.dernier.justificatif?'<b>Justificatif</b> — ':''}${escapeHtml((f.dernier.texte||(f.dernier.pieces||[]).map(p=>p.nom).join(', ')).slice(0,90))}</div>
          <div class="hint">${frDate(f.dernier.date)} à ${escapeHtml(f.dernier.heure||'')}</div>
        </div>`).join('') : `<div class="empty">Aucune discussion pour le moment</div>`}</div>`;
    const inp=this.el.querySelector('.disc-cherche'), res=this.el.querySelector('.disc-res');
    inp.addEventListener('input', ()=>{
      const q=normName(inp.value);
      if(q.length<2){ res.classList.add('hidden'); res.innerHTML=''; return; }
      const l=annuaire().filter(p=>cleNom(p.nom)!==cleNom(this.moi) && normName(p.nom+' '+p.role).includes(q)).slice(0,25);
      res.classList.remove('hidden');
      res.innerHTML = l.length ? l.map(p=>`<div class="pick-item" data-autre="${escapeHtml(p.nom)}"><div style="flex:1;"><div class="pk-name">${escapeHtml(p.nom)}</div><div class="pk-sub">${escapeHtml(p.role)}</div></div></div>`).join('') : `<div class="empty">Personne trouvée</div>`;
    });
    this.el.querySelectorAll('[data-autre]').forEach(x=>x.addEventListener('click', ()=>this.ouvrir(x.dataset.autre)));
    res.onclick = e=>{ const t=e.target.closest('[data-autre]'); if(t) this.ouvrir(t.dataset.autre); };
  },

  ouvrir(autre){
    this.autre=autre; this.pieces=[]; this.brouillon='';
    if(marquerFilLu(this.moi, autre)) saveDB();
    this.rendreFil(true);
    if(typeof this.opts.onChange==='function') this.opts.onChange();
  },
  fermer(){ this.autre=null; this.rendreListe(); if(typeof this.opts.onChange==='function') this.opts.onChange(); },

  /* ---------- Conversation ---------- */
  rendreFil(complet){
    if(complet || !this.el.querySelector('.disc-fil')){
      const role=(annuaire().find(p=>cleNom(p.nom)===cleNom(this.autre))||{}).role||'';
      this.el.innerHTML = `
        <div class="card"><div class="card-b" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <button class="btn-sm btn-ghost disc-retour">Toutes les discussions</button>
          <div style="flex:1;min-width:160px;"><div style="font-weight:800;">${escapeHtml(this.autre)}</div><div class="hint">${escapeHtml(role)}</div></div>
        </div></div>
        <div class="card"><div class="disc-fil"></div></div>
        <div class="card"><div class="card-b">
          <div class="fg" style="margin-bottom:8px;"><textarea class="disc-texte" rows="2" placeholder="Votre message..."></textarea></div>
          <div class="disc-pieces mini-pills" style="margin-bottom:8px;"></div>
          <label class="chk-row" style="margin-bottom:8px;"><input type="checkbox" class="disc-justif"><span class="chk-txt">C'est un justificatif (absence, retard, dépôt…) — l'Administration l'acceptera ou le refusera</span></label>
          <div class="fg hidden disc-motif-wrap" style="margin-bottom:8px;"><input type="text" class="disc-motif" placeholder="Motif du justificatif (ex : absence du samedi 25 pour maladie)"></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <label class="btn-sm btn-ghost" style="position:relative;overflow:hidden;cursor:pointer;">Joindre une photo ou un document<input type="file" class="disc-fichier" accept="image/*,application/pdf,.doc,.docx,.txt" style="position:absolute;inset:0;opacity:0;cursor:pointer;"></label>
            <button class="btn-sm btn-g disc-envoyer" style="flex:1;">Envoyer</button>
          </div>
        </div></div>`;
      this.el.querySelector('.disc-retour').onclick=()=>this.fermer();
      const ta=this.el.querySelector('.disc-texte'); ta.value=this.brouillon; ta.oninput=()=>{ this.brouillon=ta.value; };
      const cj=this.el.querySelector('.disc-justif'); cj.onchange=()=>this.el.querySelector('.disc-motif-wrap').classList.toggle('hidden',!cj.checked);
      this.el.querySelector('.disc-fichier').onchange=e=>this.joindre(e.target);
      this.el.querySelector('.disc-envoyer').onclick=()=>this.envoyer();
      this.majPieces();
    }
    this.majMessages();
  },
  majMessages(){
    const box=this.el.querySelector('.disc-fil'); if(!box) return;
    const l=messagesFil(this.moi, this.autre);
    const piece = p => /^image\//.test(p.type||'') ? `<a href="${escapeHtml(p.url)}" target="_blank"><img src="${escapeHtml(p.url)}" alt="" style="max-width:180px;max-height:180px;border-radius:12px;display:block;margin-top:6px;"></a>` : `<a class="pill-link" style="margin-top:6px;" href="${escapeHtml(p.url)}" target="_blank">${escapeHtml(p.nom||'Document')}</a>`;
    const etat = c => !c.justificatif ? '' : `<div style="margin-top:6px;"><span class="badge ${c.statut==='acceptee'?'bg':c.statut==='refusee'?'br':'by'}">${c.statut==='acceptee'?'Justificatif accepté':c.statut==='refusee'?'Justificatif refusé':'Justificatif en attente'}</span>${c.decision?`<div class="hint" style="margin-top:4px;">Réponse : ${escapeHtml(c.decision)}</div>`:''}
      ${this.opts.admin && c.statut==='en_attente' && cleNom(c.a)===cleNom(this.moi) ? `<div class="actions"><button class="btn-xs b-ok" data-dec="acceptee" data-id="${c.id}">Accepter</button><button class="btn-xs b-del" data-dec="refusee" data-id="${c.id}">Refuser</button></div>`:''}</div>`;
    box.innerHTML = l.length ? `<div class="disc-bulles">${l.map(c=>{
      const moi=cleNom(c.de)===cleNom(this.moi);
      return `<div class="bulle ${moi?'moi':''}">
        ${c.demande?`<div class="badge by" style="margin-bottom:4px;">Demande : ${escapeHtml(c.demande)}</div>`:''}
        ${c.justificatif?`<div class="hint" style="font-weight:800;color:inherit;opacity:.85;">Justificatif${c.motif?' — '+escapeHtml(c.motif):''}</div>`:''}
        ${c.texte?`<div>${escapeHtml(c.texte).replace(/\n/g,'<br>')}</div>`:''}
        ${(c.pieces||[]).map(piece).join('')}
        ${etat(c)}
        <div class="bulle-h">${moi?'Vous':escapeHtml(c.de)} — ${frDate(c.date)} ${escapeHtml(c.heure||'')}${moi?(c.lu?' — lu':' — envoyé'):''}</div>
      </div>`; }).join('')}</div>` : `<div class="empty">Écrivez le premier message à ${escapeHtml(this.autre)}.</div>`;
    box.querySelectorAll('[data-dec]').forEach(b=>b.onclick=()=>this.decider(b.dataset.id, b.dataset.dec));
    box.scrollTop=box.scrollHeight;
    const fin=box.querySelector('.bulle:last-child'); if(fin && this.visible()) fin.scrollIntoView({block:'nearest'});
  },
  majPieces(){
    const z=this.el.querySelector('.disc-pieces'); if(!z) return;
    z.innerHTML=this.pieces.map((p,i)=>`<span>${escapeHtml(p.nom)} <a class="pill-link" style="background:var(--REDP);color:var(--RED);" href="javascript:void(0)" data-rm="${i}">Retirer</a></span>`).join('') + (this.envoiEnCours?'<span>Envoi du fichier…</span>':'');
    z.querySelectorAll('[data-rm]').forEach(a=>a.onclick=()=>{ this.pieces.splice(+a.dataset.rm,1); this.majPieces(); });
  },
  async joindre(input){
    const f=input.files[0]; input.value=''; if(!f) return;
    this.envoiEnCours=true; this.majPieces();
    try{ const p=await envoyerFichier(f); if(!this.pieces.some(x=>x.url===p.url)) this.pieces.push(p); }
    catch(e){ toast(e.message,'ko'); }
    this.envoiEnCours=false; this.majPieces();
  },
  envoyer(){
    if(this.envoiEnCours){ toast('Patientez : le fichier est en cours d\'envoi','ko'); return; }
    const texte=(this.el.querySelector('.disc-texte').value||'').trim();
    const justif=this.el.querySelector('.disc-justif').checked;
    const motif=(this.el.querySelector('.disc-motif').value||'').trim();
    if(!texte && !this.pieces.length){ toast('Écrivez un message ou joignez un fichier','ko'); return; }
    if(justif && !motif){ toast('Indiquez le motif du justificatif','ko'); return; }
    // pas deux fois le même message d'affilée
    const der=messagesFil(this.moi,this.autre).slice(-1)[0];
    if(der && cleNom(der.de)===cleNom(this.moi) && der.texte===texte && !this.pieces.length && (Date.now()-der.ts)<60000){ toast('Message déjà envoyé','ko'); return; }
    envoyerChat(this.moi, this.autre, texte, this.pieces.slice(), justif?{justificatif:true, motif}:{});
    saveDB();
    this.pieces=[]; this.brouillon='';
    this.rendreFil(true);
    toast(justif?'Justificatif envoyé à '+this.autre:'Message envoyé','ok');
  },
  decider(id, dec){
    const c=DB.chats.find(x=>x.id===id); if(!c) return;
    const com=prompt(dec==='acceptee'?'Commentaire (facultatif) :':'Motif du refus :','')||'';
    if(dec==='refusee' && !com.trim()){ toast('Indiquez le motif du refus','ko'); return; }
    c.statut=dec; c.decision=com.trim(); c.decisionPar=this.moi; c.decisionTs=Date.now();
    envoyerChat(this.moi, c.de, `Votre justificatif « ${c.motif||''} » est ${dec==='acceptee'?'ACCEPTÉ':'REFUSÉ'}.${com.trim()?' '+com.trim():''}`, [], {reponseA:c.id});
    saveDB(); this.majMessages(); toast(dec==='acceptee'?'Justificatif accepté':'Justificatif refusé','ok');
  },

  /* ---------- Temps réel ---------- */
  surNouveau(c){
    if(!this.moi || cleNom(c.a)!==cleNom(this.moi)) return false;
    if(!DB.chats.some(x=>x.id===c.id)) DB.chats.push(c);
    const ouvert = this.autre && cleNom(this.autre)===cleNom(c.de) && this.visible();
    if(ouvert){ c.lu=true; const x=DB.chats.find(y=>y.id===c.id); if(x) x.lu=true; saveDB(); this.majMessages(); }
    else { ding(); bandeau('Message de '+c.de, c.justificatif?'Justificatif : '+(c.motif||''):(c.texte||'Pièce jointe'), ()=>{ if(typeof this.opts.montrer==='function') this.opts.montrer(); this.ouvrir(c.de); }); notifSysteme('Message de '+c.de, c.texte||'Pièce jointe'); if(this.visible() && !this.autre) this.rendreListe(); }
    return true;
  },
  apresSync(){ if(!this.visible()) return; if(this.autre){ if(marquerFilLu(this.moi,this.autre)) saveDB(); this.majMessages(); } else this.rendreListe(); }
};
