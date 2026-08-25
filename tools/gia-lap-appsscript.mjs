/* Mô phỏng Apps Script đủ để chạy thật backend/*.gs trong Node. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'backend') + path.sep;

export function dungMoiTruong() {
  /* ---- Sheet ---- */
  class Sheet {
    constructor(name){ this.name=name; this.rows=[]; }
    getName(){ return this.name; }
    getLastRow(){ return this.rows.length; }
    getLastColumn(){ return this.rows.length ? this.rows[0].length : 0; }
    setFrozenRows(){ return this; }
    autoResizeColumns(){ return this; }
    setRowHeight(){ return this; }
    setRowHeights(){ return this; }
    setColumnWidth(){ return this; }
    setColumnWidths(){ return this; }
    hideColumns(){ return this; }
    getMaxColumns(){ return this.getLastColumn()||26; }
    getMaxRows(){ return Math.max(this.rows.length,1000); }
    insertColumnsAfter(){ return this; }
    deleteColumns(){ return this; }
    getDataRange(){ return this.getRange(1,1,Math.max(this.rows.length,1),this.getLastColumn()||1); }
    sort(){ return this; }
    setTabColor(){ return this; }
    activate(){ return this; }
    getFilter(){ return null; }
    protect(){ return { setDescription(){return this;}, removeEditors(){return this;}, addEditor(){return this;}, setWarningOnly(){return this;} }; }
    appendRow(r){ this.rows.push(r.slice()); return this; }
    getRange(r,c,nr=1,nc=1){
      const sh=this;
      return {
        getValues(){ const o=[]; for(let i=0;i<nr;i++){ const row=sh.rows[r-1+i]||[]; const line=[];
            for(let j=0;j<nc;j++) line.push(row[c-1+j]===undefined?'':row[c-1+j]); o.push(line);} return o; },
        getValue(){ const row=sh.rows[r-1]||[]; return row[c-1]===undefined?'':row[c-1]; },
        setValues(v){ for(let i=0;i<v.length;i++){ while(sh.rows.length<r-1+i+1) sh.rows.push([]);
            const row=sh.rows[r-1+i]; for(let j=0;j<v[i].length;j++) row[c-1+j]=v[i][j]; } return this; },
        setValue(v){ while(sh.rows.length<r) sh.rows.push([]); sh.rows[r-1][c-1]=v; return this; },
        setFontWeight(){ return this; }, setBackground(){ return this; },
        setFontColor(){ return this; }, setBorder(){ return this; }, setFontSize(){ return this; },
        setFontFamily(){ return this; }, setVerticalAlignment(){ return this; },
        merge(){ return this; }, setNote(){ return this; }, clearContent(){ return this; },
        setNumberFormat(){ return this; }, setDataValidation(){ return this; },
        setWrap(){ return this; }, setHorizontalAlignment(){ return this; },
      };
    }
    deleteRow(n){ this.rows.splice(n-1,1); }
    clear(){ this.rows=[]; return this; }
  }
  class SS {
    constructor(id,name){ this.id=id; this.name=name; this.sheets=[]; }
    getId(){ return this.id; } getName(){ return this.name; }
    getUrl(){ return 'https://sheet/'+this.id; }
    getSheets(){ return this.sheets; }
    getSheetByName(n){ return this.sheets.find(s=>s.getName()===n)||null; }
    insertSheet(n){ const s=new Sheet(n); this.sheets.push(s); return s; }
    deleteSheet(s){ this.sheets=this.sheets.filter(x=>x!==s); }
  }
  const kho = {};
  globalThis.SpreadsheetApp = {
    _kho: kho,
    openById: id => kho[id] || (kho[id] = new SS(id, 'SS-'+id)),
    getActiveSpreadsheet: () => null,
    create: n => { const id='SS_'+Object.keys(kho).length; const s=new SS(id,n); kho[id]=s; return s; },
    newDataValidation: () => { const v={ requireValueInList:()=>v, setAllowInvalid:()=>v,
      setHelpText:()=>v, requireNumberBetween:()=>v, requireDate:()=>v, build:()=>({}) }; return v; },
  };

  /* ---- các dịch vụ khác ---- */
  const props = {};
  globalThis.PropertiesService = { getScriptProperties: () => ({
    getProperty: k => (k in props ? props[k] : null),
    setProperty: (k,v)=>{ props[k]=String(v); }, deleteProperty: k=>{ delete props[k]; },
    getProperties: ()=>({...props}) }) };
  globalThis._props = props;

  const cache = {};
  globalThis.CacheService = { getScriptCache: () => ({
    get: k => cache[k] ?? null, put: (k,v)=>{ cache[k]=v; }, remove: k=>{ delete cache[k]; } }) };

  globalThis.LockService = { getScriptLock: () => ({ tryLock: () => true, releaseLock(){} }) };
  globalThis.Logger = { log: () => {} };
  globalThis.ContentService = { createTextOutput: t => ({ _t:t, setMimeType(){ return this; }, getContent(){ return this._t; } }),
    MimeType: { JSON: 'json' } };

  globalThis.Utilities = {
    getUuid: () => crypto.randomUUID(),
    computeDigest: (_alg, val, _charset) => Array.from(crypto.createHash('sha256')
      .update(typeof val === 'string' ? Buffer.from(val,'utf8') : Buffer.from(val)).digest())
      .map(b => b > 127 ? b - 256 : b),
    DigestAlgorithm: { SHA_256: 'sha256' },
    Charset: { UTF_8: 'utf8', US_ASCII: 'ascii' },
    base64Encode: v => Buffer.from(typeof v==='string'?Buffer.from(v,'utf8'):Buffer.from(v.map(b=>b<0?b+256:b))).toString('base64'),
    base64Decode: s => Array.from(Buffer.from(s,'base64')).map(b=>b>127?b-256:b),
    newBlob: (bytes, type, name) => ({ _b:bytes, getBytes:()=>bytes, getContentType:()=>type, getName:()=>name }),
    formatDate: (d, _tz, f) => {
      const p=n=>String(n).padStart(2,'0');
      if (f==='yyyy-MM-dd') return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
      return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
    },
    sleep: () => {},
  };

  const drive = {};
  const thuMuc = {};
  globalThis._drive = drive;
  function folder(id, ten) {
    if (thuMuc[id]) return thuMuc[id];
    const f = {
      _con: {},
      getId: () => id, getName: () => ten, getUrl: () => 'https://drive/folder/' + id,
      createFile: blob => { const fid = 'FILE_' + (Object.keys(drive).length + 1);
        drive[fid] = { blob, folder: id }; return { getId: () => fid, getUrl: () => 'https://drive/' + fid }; },
      getFoldersByName: n => { const c = f._con[n];
        return { hasNext: () => !!c, next: () => c }; },
      createFolder: n => { const c = folder(id + '/' + n, n); f._con[n] = c; return c; },
      setSharing: () => f,
    };
    thuMuc[id] = f; return f;
  }
  globalThis._thuMuc = thuMuc;
  globalThis.DriveApp = {
    getFolderById: id => thuMuc[id] || folder(id, id),
    getFileById: id => { if (!drive[id]) throw new Error('không có file ' + id);
      return { getBlob: () => drive[id].blob, getId: () => id, setSharing: () => {} }; },
    getRootFolder: () => folder('ROOT', 'Drive của tôi'),
    getFoldersByName: n => folder('ROOT', 'Drive của tôi').getFoldersByName(n),
    createFolder: n => folder('ROOT', 'Drive của tôi').createFolder(n),
    Access: { PRIVATE: 'PRIVATE', ANYONE_WITH_LINK: 'ANYONE_WITH_LINK' },
    Permission: { VIEW: 'VIEW', NONE: 'NONE' },
  };
  globalThis.Session = { getScriptTimeZone: () => 'Asia/Ho_Chi_Minh', getActiveUser: () => ({ getEmail: () => 'chu@tkd.vn' }) };
  globalThis.MailApp = { sendEmail: () => {} };
  globalThis.GmailApp = { sendEmail: () => {} };
  globalThis.Maps = undefined;
  globalThis.UrlFetchApp = { fetch: () => ({ getContentText: () => '{}' }) };

  for (const f of ['Sheets.gs','Auth.gs','Api_DangKy.gs','Api_HeThong.gs','Setup.gs']) {
    (0,eval)(fs.readFileSync(DIR+f,'utf8'));
  }
  return { props, drive, kho };
}

export function goi(params) {
  const out = globalThis.doPost({ parameter: { ...params } });
  return JSON.parse(out.getContent());
}
