/* ============================================================
   COMMISSION EXPOSÉ — Moteur d'export Word (.docx) et Excel (.xlsx)
   Génère de vrais fichiers Office, sans connexion Internet ni
   bibliothèque externe (fonctionne hors-ligne sur le réseau local).

   Un "rapport" est décrit une seule fois (modèle) puis rendu en :
     - Word  : buildDocx(model)  -> Uint8Array
     - Excel : buildXlsx(model)  -> Uint8Array
     - HTML  : buildHtml(model)  -> string (aperçu / impression PDF)

   Modèle :
   {
     title, subtitle, landscape:bool, fileName,
     sections:[{ heading, note, pageBreak:bool,
                 columns:[{label, width(cm), align:'left'|'center'}],
                 rows:[[...valeurs]], total:[...] }],
     sheets:[{ name, title, columns:[{label,width(chars),align}], rows, total }]  // Excel
   }
   ============================================================ */

(function(root){

/* ---------------- ZIP (méthode "store", sans compression) ---------------- */
const CRC_TABLE = (()=>{ const t=new Uint32Array(256); for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c = c&1 ? 0xEDB88320^(c>>>1) : c>>>1; t[n]=c>>>0; } return t; })();
function crc32(buf){ let c=0xFFFFFFFF; for(let i=0;i<buf.length;i++) c = CRC_TABLE[(c^buf[i])&0xFF]^(c>>>8); return (c^0xFFFFFFFF)>>>0; }
const enc = new TextEncoder();

function zip(files){ // files: [{name, data:string|Uint8Array}]
  const d=new Date();
  const dosTime = (d.getHours()<<11)|(d.getMinutes()<<5)|(Math.floor(d.getSeconds()/2));
  const dosDate = ((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate();
  const chunks=[]; const central=[]; let offset=0;
  for(const f of files){
    const nameB=enc.encode(f.name);
    const data= typeof f.data==='string' ? enc.encode(f.data) : f.data;
    const crc=crc32(data);
    const lh=new DataView(new ArrayBuffer(30));
    lh.setUint32(0,0x04034b50,true); lh.setUint16(4,20,true); lh.setUint16(6,0x0800,true); lh.setUint16(8,0,true);
    lh.setUint16(10,dosTime,true); lh.setUint16(12,dosDate,true); lh.setUint32(14,crc,true);
    lh.setUint32(18,data.length,true); lh.setUint32(22,data.length,true); lh.setUint16(26,nameB.length,true); lh.setUint16(28,0,true);
    chunks.push(new Uint8Array(lh.buffer), nameB, data);
    const ch=new DataView(new ArrayBuffer(46));
    ch.setUint32(0,0x02014b50,true); ch.setUint16(4,20,true); ch.setUint16(6,20,true); ch.setUint16(8,0x0800,true); ch.setUint16(10,0,true);
    ch.setUint16(12,dosTime,true); ch.setUint16(14,dosDate,true); ch.setUint32(16,crc,true);
    ch.setUint32(20,data.length,true); ch.setUint32(24,data.length,true); ch.setUint16(28,nameB.length,true);
    ch.setUint16(30,0,true); ch.setUint16(32,0,true); ch.setUint16(34,0,true); ch.setUint16(36,0,true); ch.setUint32(38,0,true); ch.setUint32(42,offset,true);
    central.push(new Uint8Array(ch.buffer), nameB);
    offset += 30+nameB.length+data.length;
  }
  const cdSize=central.reduce((s,a)=>s+a.length,0);
  const end=new DataView(new ArrayBuffer(22));
  end.setUint32(0,0x06054b50,true); end.setUint16(8,files.length,true); end.setUint16(10,files.length,true);
  end.setUint32(12,cdSize,true); end.setUint32(16,offset,true);
  const all=[...chunks,...central,new Uint8Array(end.buffer)];
  const out=new Uint8Array(all.reduce((s,a)=>s+a.length,0)); let p=0;
  for(const a of all){ out.set(a,p); p+=a.length; }
  return out;
}

function x(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,''); }

/* ============================ WORD (.docx) ============================ */
const GREEN='0D3B2E', GREEN_LIGHT='E2F2EC', ZEBRA='F6F7F3';
const cmToTw = cm => Math.round(cm*567);

function wRun(text,o){
  o=o||{};
  let rpr='';
  if(o.bold) rpr+='<w:b/>';
  if(o.italic) rpr+='<w:i/>';
  if(o.color) rpr+=`<w:color w:val="${o.color}"/>`;
  if(o.size) rpr+=`<w:sz w:val="${o.size}"/><w:szCs w:val="${o.size}"/>`;
  return `<w:r>${rpr?'<w:rPr>'+rpr+'</w:rPr>':''}<w:t xml:space="preserve">${x(text)}</w:t></w:r>`;
}
function wPara(text,o){
  o=o||{};
  let ppr='';
  if(o.pageBreak) ppr+='<w:pageBreakBefore/>';
  if(o.keepNext) ppr+='<w:keepNext/>';
  ppr+=`<w:spacing w:before="${o.before||0}" w:after="${o.after==null?60:o.after}"/>`;
  if(o.align) ppr+=`<w:jc w:val="${o.align==='center'?'center':o.align}"/>`;
  if(o.border) ppr+=`<w:pBdr><w:bottom w:val="single" w:sz="12" w:space="2" w:color="${GREEN}"/></w:pBdr>`;
  return `<w:p><w:pPr>${ppr}</w:pPr>${text===''?'':wRun(text,o)}</w:p>`;
}
function wCell(text,width,o){
  o=o||{};
  const shd = o.fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${o.fill}"/>` : '';
  const lines=String(text==null?'':text).split('\n');
  const paras=lines.map(l=>`<w:p><w:pPr><w:spacing w:before="20" w:after="20"/><w:jc w:val="${o.align==='center'?'center':(o.align==='right'?'right':'left')}"/></w:pPr>${wRun(l,{bold:o.bold,color:o.color,size:o.size||18})}</w:p>`).join('');
  return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${shd}<w:vAlign w:val="center"/></w:tcPr>${paras}</w:tc>`;
}
function wTable(cols,rows,total,maxWidthTw){
  let widths=cols.map(c=>cmToTw(c.width||3));
  const sum=widths.reduce((a,b)=>a+b,0);
  if(sum>maxWidthTw){ const k=maxWidthTw/sum; widths=widths.map(w=>Math.floor(w*k)); }
  const tw=widths.reduce((a,b)=>a+b,0);
  const b=`w:val="single" w:sz="4" w:space="0" w:color="9AA8A2"`;
  let xml=`<w:tbl><w:tblPr><w:tblW w:w="${tw}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders><w:top ${b}/><w:left ${b}/><w:bottom ${b}/><w:right ${b}/><w:insideH ${b}/><w:insideV ${b}/></w:tblBorders><w:tblCellMar><w:left w:w="70" w:type="dxa"/><w:right w:w="70" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${widths.map(w=>`<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>`;
  xml+=`<w:tr><w:trPr><w:tblHeader/><w:cantSplit/></w:trPr>${cols.map((c,i)=>wCell(c.label,widths[i],{bold:true,fill:GREEN,color:'FFFFFF',align:'center'})).join('')}</w:tr>`;
  rows.forEach((r,ri)=>{
    xml+=`<w:tr><w:trPr><w:cantSplit/></w:trPr>${cols.map((c,i)=>wCell(r[i],widths[i],{align:c.align,fill:ri%2?ZEBRA:null})).join('')}</w:tr>`;
  });
  if(total) xml+=`<w:tr><w:trPr><w:cantSplit/></w:trPr>${cols.map((c,i)=>wCell(total[i],widths[i],{bold:true,fill:GREEN_LIGHT,align:c.align})).join('')}</w:tr>`;
  xml+='</w:tbl>';
  return xml;
}

function buildDocx(m){
  const land=!!m.landscape;
  const pgW = land?16838:11906, pgH = land?11906:16838, mar=850;
  const usable = pgW - 2*mar;
  let body='';
  body+=wPara(m.title,{bold:true,size:32,color:GREEN,after:40});
  if(m.subtitle) body+=wPara(m.subtitle,{italic:true,size:18,color:'647871',after:200,border:true});
  (m.sections||[]).forEach((s,i)=>{
    if(s.heading) body+=wPara(s.heading,{bold:true,size:24,color:GREEN,before:i===0||s.pageBreak?0:240,after:80,keepNext:true,pageBreak:!!s.pageBreak});
    if(s.note) body+=wPara(s.note,{italic:true,size:18,color:'647871',after:80,keepNext:true});
    if(s.columns){
      if(s.rows && s.rows.length) body+=wTable(s.columns,s.rows,s.total,usable);
      else body+=wPara(s.empty||'Aucune donnée.',{italic:true,size:18,color:'647871'});
      body+=wPara('',{after:60});
    }
  });
  const sect=`<w:sectPr><w:footerReference w:type="default" r:id="rIdFooter"/><w:pgSz w:w="${pgW}" w:h="${pgH}"${land?' w:orient="landscape"':''}/><w:pgMar w:top="${mar}" w:right="${mar}" w:bottom="${mar}" w:left="${mar}" w:header="425" w:footer="425" w:gutter="0"/></w:sectPr>`;
  const NS='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  const doc=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>${body}${sect}</w:body></w:document>`;
  const footer=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr ${NS}><w:p><w:pPr><w:jc w:val="center"/></w:pPr>${wRun("Académie Vases d'Honneur — Commission Exposé   •   Page ",{size:16,color:'647871'})}<w:fldSimple w:instr=" PAGE "><w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:t>1</w:t></w:r></w:fldSimple>${wRun(' / ',{size:16,color:'647871'})}<w:fldSimple w:instr=" NUMPAGES "><w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:t>1</w:t></w:r></w:fldSimple></w:p></w:ftr>`;
  const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/><w:sz w:val="20"/><w:szCs w:val="20"/><w:lang w:val="fr-FR"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="60" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style></w:styles>`;
  const ct=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`;
  const rels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`;
  const docRels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>`;
  const now=new Date().toISOString().replace(/\.\d+Z$/,'Z');
  const core=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${x(m.title)}</dc:title><dc:creator>Commission Exposé</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`;
  return zip([
    {name:'[Content_Types].xml',data:ct},{name:'_rels/.rels',data:rels},
    {name:'word/document.xml',data:doc},{name:'word/styles.xml',data:styles},
    {name:'word/footer1.xml',data:footer},{name:'word/_rels/document.xml.rels',data:docRels},
    {name:'docProps/core.xml',data:core}
  ]);
}

/* ============================ EXCEL (.xlsx) ============================ */
function colLetter(n){ let s=''; n++; while(n>0){ const m=(n-1)%26; s=String.fromCharCode(65+m)+s; n=Math.floor((n-1)/26); } return s; }
function safeSheetName(n,used){
  let s=String(n||'Feuille').replace(/[\[\]:*?\/\\]/g,' ').replace(/'/g,'’').trim().slice(0,31)||'Feuille';
  let base=s, k=2; while(used.has(s.toLowerCase())){ const suf=' ('+k+++')'; s=base.slice(0,31-suf.length)+suf; }
  used.add(s.toLowerCase()); return s;
}
// styles : 0 défaut, 1 en-tête, 2 cellule texte, 3 titre, 4 sous-titre, 5 ligne de section, 6 cellule centrée, 7 total
const XLSX_STYLES=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="5"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="15"/><color rgb="FF0D3B2E"/><name val="Calibri"/><family val="2"/></font><font><i/><sz val="10"/><color rgb="FF647871"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><color rgb="FF0D3B2E"/><name val="Calibri"/><family val="2"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0D3B2E"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE2F2EC"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FF9AA8A2"/></left><right style="thin"><color rgb="FF9AA8A2"/></right><top style="thin"><color rgb="FF9AA8A2"/></top><bottom style="thin"><color rgb="FF9AA8A2"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="8"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="4" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="4" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

function xCell(ref,v,style){
  if(v===null||v===undefined||v==='') return `<c r="${ref}" s="${style}"/>`;
  if(typeof v==='number' && isFinite(v)) return `<c r="${ref}" s="${style}"><v>${v}</v></c>`;
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${x(v)}</t></is></c>`;
}
function buildSheetXml(sh,landscape){
  const cols=sh.columns, nc=cols.length, last=colLetter(nc-1);
  let r=0; const rows=[]; const merges=[];
  const addRow=(cells,ht)=>{ r++; rows.push(`<row r="${r}"${ht?` ht="${ht}" customHeight="1"`:''}>${cells(r)}</row>`); return r; };
  addRow(rr=>xCell('A'+rr,sh.title||'',3),24); merges.push(`A1:${last}1`);
  addRow(rr=>xCell('A'+rr,sh.subtitle||'',4)); merges.push(`A2:${last}2`);
  const headerRow=addRow(rr=>cols.map((c,i)=>xCell(colLetter(i)+rr,c.label,1)).join(''),30);
  (sh.rows||[]).forEach(row=>{
    if(row && row.__section){ const rr=addRow(rr=>xCell('A'+rr,row.__section,5)+cols.slice(1).map((c,i)=>xCell(colLetter(i+1)+rr,'',5)).join('')); merges.push(`A${rr}:${last}${rr}`); return; }
    addRow(rr=>cols.map((c,i)=>xCell(colLetter(i)+rr,row[i],c.align==='center'?6:2)).join(''));
  });
  if(sh.total) addRow(rr=>cols.map((c,i)=>xCell(colLetter(i)+rr,sh.total[i],7)).join(''));
  const lastRow=Math.max(r,headerRow+1);
  const hasSections=(sh.rows||[]).some(x=>x&&x.__section);
  return {headerRow, xml:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:${last}${lastRow}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="${headerRow}" topLeftCell="A${headerRow+1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${cols.map((c,i)=>`<col min="${i+1}" max="${i+1}" width="${c.width||15}" customWidth="1"/>`).join('')}</cols><sheetData>${rows.join('')}</sheetData>${(!hasSections && (sh.rows||[]).length)?`<autoFilter ref="A${headerRow}:${last}${headerRow+sh.rows.length}"/>`:''}<mergeCells count="${merges.length}">${merges.map(m=>`<mergeCell ref="${m}"/>`).join('')}</mergeCells><printOptions horizontalCentered="1"/><pageMargins left="0.4" right="0.4" top="0.5" bottom="0.6" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="${landscape?'landscape':'portrait'}" fitToWidth="1" fitToHeight="0"/><headerFooter><oddFooter>&amp;L&amp;8Académie Vases d'Honneur — Commission Exposé&amp;R&amp;8Page &amp;P / &amp;N</oddFooter></headerFooter></worksheet>`};
}
function buildXlsx(m){
  const used=new Set();
  const sheets=(m.sheets||[]).map(s=>Object.assign({},s,{name:safeSheetName(s.name,used)}));
  const files=[]; const defs=[];
  sheets.forEach((s,i)=>{
    const {xml,headerRow}=buildSheetXml(Object.assign({subtitle:m.subtitle},s), s.landscape!=null?s.landscape:m.landscape);
    files.push({name:`xl/worksheets/sheet${i+1}.xml`,data:xml});
    defs.push(`<definedName name="_xlnm.Print_Titles" localSheetId="${i}">'${s.name}'!$${headerRow}:$${headerRow}</definedName>`);
  });
  const wb=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>${sheets.map((s,i)=>`<sheet name="${x(s.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets><definedNames>${defs.join('')}</definedNames></workbook>`;
  const wbRels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((s,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rIdS" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  const ct=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((s,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`;
  const rels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  return zip([{name:'[Content_Types].xml',data:ct},{name:'_rels/.rels',data:rels},{name:'xl/workbook.xml',data:wb},{name:'xl/_rels/workbook.xml.rels',data:wbRels},{name:'xl/styles.xml',data:XLSX_STYLES},...files]);
}

/* ============================ HTML (aperçu / PDF) ============================ */
function buildHtml(m){
  let h=`<div class="rep-title">${x(m.title)}</div>`;
  if(m.subtitle) h+=`<div class="rep-sub">${x(m.subtitle)}</div>`;
  (m.sections||[]).forEach(s=>{
    if(s.heading) h+=`<div class="rep-h2"${s.pageBreak?' style="page-break-before:always;"':''}>${x(s.heading)}</div>`;
    if(s.note) h+=`<div class="rep-sub">${x(s.note)}</div>`;
    if(s.columns){
      if(!s.rows||!s.rows.length){ h+=`<div class="rep-sub">${x(s.empty||'Aucune donnée.')}</div>`; return; }
      h+=`<table class="rep-table"><thead><tr>${s.columns.map(c=>`<th>${x(c.label)}</th>`).join('')}</tr></thead><tbody>`;
      h+=s.rows.map(r=>`<tr>${s.columns.map((c,i)=>`<td style="text-align:${c.align==='center'?'center':'left'};">${x(r[i]).replace(/\n/g,'<br>')}</td>`).join('')}</tr>`).join('');
      if(s.total) h+=`<tr>${s.columns.map((c,i)=>`<td style="font-weight:700;background:var(--GRNP);text-align:${c.align==='center'?'center':'left'};">${x(s.total[i])}</td>`).join('')}</tr>`;
      h+='</tbody></table>';
    }
  });
  return h;
}

const MIME_DOCX='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const MIME_XLSX='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const api={zip,crc32,buildDocx,buildXlsx,buildHtml,MIME_DOCX,MIME_XLSX};
if(typeof module!=='undefined' && module.exports) module.exports=api;
else Object.assign(root,{OfficeExport:api});
})(typeof window!=='undefined'?window:this);
