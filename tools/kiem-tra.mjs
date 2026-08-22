#!/usr/bin/env node
/* =============================================================
   KIỂM TRA WEBSITE TRƯỚC KHI ĐẨY LÊN
       node tools/kiem-tra.mjs

   Bắt đúng những lớp lỗi đã từng xảy ra thật trên dự án này:
     1. Thẻ HTML lệch  — sinh ra khi thay thanh điều hướng bằng regex
     2. Ngoặc CSS lệch — sinh ra khi sửa tệp CSS bằng script
     3. Tệp tham chiếu không tồn tại
     4. Thanh điều hướng không giống nhau giữa các trang
     5. Thuộc tính width/height của <img> sai tỉ lệ so với ảnh thật
        (chính là lỗi làm logo ở chân trang bị bóp thành hình vuông)
   ============================================================= */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Phải dùng fileURLToPath: đường dẫn dự án có dấu cách, nếu lấy .pathname
// thì dấu cách thành %20 và Node không tìm thấy thư mục.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VOID = new Set(['area','base','br','col','embed','hr','img','input','link','meta','source','track','wbr']);

let loi = 0, canh = 0;
const KO = m => { console.log(`  ✗ ${m}`); loi++; };
const NB = m => { console.log(`  ! ${m}`); canh++; };
const OK = m => console.log(`  ✓ ${m}`);

const trang = fs.readdirSync(ROOT)
  .filter(f => f.endsWith('.html') && !f.startsWith('index.original') && !f.startsWith('_'));
const css = fs.readdirSync(path.join(ROOT, 'assets/css')).filter(f => f.endsWith('.css'));

/* ---------- 1. Thẻ HTML ---------- */
console.log('\n[1] Cân bằng thẻ HTML');
for (const f of trang) {
  const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const i = s.indexOf('<body'), j = s.lastIndexOf('</body>');
  if (i < 0 || j < 0) { KO(`${f}: thiếu thẻ <body>`); continue; }
  const body = s.slice(i, j).replace(/<script\b[\s\S]*?<\/script>/g, '');
  const stack = [];
  let sai = null;
  for (const m of body.matchAll(/<(\/?)([a-zA-Z][\w-]*)([^>]*)>/g)) {
    const [, dong, ten, attrs] = m;
    const tag = ten.toLowerCase();
    if (VOID.has(tag) || attrs.trimEnd().endsWith('/')) continue;
    if (dong) {
      if (stack.at(-1) === tag) stack.pop();
      else if (!sai) sai = `đóng </${tag}> nhưng đang mở <${stack.at(-1) ?? '—'}>`;
    } else stack.push(tag);
  }
  const con = stack.filter(t => t !== 'body');
  if (sai) KO(`${f}: ${sai}`);
  else if (con.length) KO(`${f}: còn mở ${con.join(', ')}`);
}
if (!loi) OK(`${trang.length} trang cân bằng`);

/* ---------- 2. Ngoặc CSS ---------- */
console.log('\n[2] Cân bằng ngoặc CSS');
{
  let xau = 0;
  for (const f of css) {
    const s = fs.readFileSync(path.join(ROOT, 'assets/css', f), 'utf8');
    let d = 0, min = 0;
    for (const c of s) { if (c === '{') d++; else if (c === '}') { d--; if (d < min) min = d; } }
    if (d !== 0 || min < 0) { KO(`${f}: lệch ${d}, có lúc âm ${min}`); xau++; }
  }
  if (!xau) OK(`${css.length} tệp CSS cân bằng`);
}

/* ---------- 3. Tệp tham chiếu ---------- */
console.log('\n[3] Tệp được tham chiếu');
{
  const thieu = new Set();
  for (const f of trang) {
    const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
    for (const m of s.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const u = m[1];
      if (/^(https?:|tel:|mailto:|#|data:|javascript:)/.test(u)) continue;
      const p = u.split('#')[0].split('?')[0];
      if (p && !fs.existsSync(path.join(ROOT, p))) thieu.add(`${f} → ${u}`);
    }
  }
  thieu.size ? [...thieu].forEach(KO) : OK('không thiếu tệp nào');
}

/* ---------- 4. Thanh điều hướng đồng nhất ---------- */
console.log('\n[4] Thanh điều hướng giống nhau giữa các trang');
{
  const lay = s => {
    const i = s.indexOf('<ul class="nav-links">');
    const j = s.indexOf('<div class="nav-right">');
    return i < 0 || j < 0 ? null
      : s.slice(i, j).replace(/href="(?:index\.html)?#/g, 'href="#').replace(/\s+/g, ' ').trim();
  };
  const map = new Map();
  for (const f of trang) {
    const v = lay(fs.readFileSync(path.join(ROOT, f), 'utf8'));
    if (v === null) continue;                       // app.html không dùng thanh này
    if (!map.has(v)) map.set(v, []);
    map.get(v).push(f);
  }
  if (map.size <= 1) OK(`${[...map.values()].flat().length} trang dùng chung một thanh điều hướng`);
  else {
    const nhom = [...map.entries()].sort((a, b) => b[1].length - a[1].length);
    KO(`có ${map.size} phiên bản thanh điều hướng khác nhau:`);
    nhom.forEach(([, fs_], i) => console.log(`      nhóm ${i + 1} (${fs_.length}): ${fs_.join(', ')}`));
  }
}

/* ---------- 5. Tỉ lệ ảnh khai trong thẻ <img> ---------- */
console.log('\n[5] Tỉ lệ width/height của <img> so với ảnh thật');
{
  /* Đọc kích thước thật từ phần đầu tệp PNG/JPEG, không cần thư viện ngoài */
  const kichThuoc = fp => {
    const b = fs.readFileSync(fp);
    if (b.length > 24 && b.toString('hex', 0, 8) === '89504e470d0a1a0a')       // PNG
      return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
    if (b[0] === 0xFF && b[1] === 0xD8) {                                       // JPEG
      let o = 2;
      while (o < b.length - 9) {
        if (b[o] !== 0xFF) { o++; continue; }
        const mk = b[o + 1];
        if (mk >= 0xC0 && mk <= 0xCF && ![0xC4, 0xC8, 0xCC].includes(mk))
          return { h: b.readUInt16BE(o + 5), w: b.readUInt16BE(o + 7) };
        o += 2 + b.readUInt16BE(o + 2);
      }
    }
    return null;
  };
  let xet = 0, xau = 0;
  for (const f of trang) {
    const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
    for (const m of s.matchAll(/<img[^>]*>/g)) {
      const tag = m[0];
      const src = tag.match(/src="([^"]+)"/)?.[1];
      const w = +(tag.match(/\bwidth="(\d+)"/)?.[1] || 0);
      const h = +(tag.match(/\bheight="(\d+)"/)?.[1] || 0);
      if (!src || !w || !h || /^(https?:|data:)/.test(src)) continue;
      const fp = path.join(ROOT, src.split('?')[0]);
      if (!fs.existsSync(fp)) continue;
      const kt = kichThuoc(fp);
      if (!kt) continue;
      xet++;
      const lech = Math.abs((w / h) / (kt.w / kt.h) - 1);
      if (lech > 0.02) {
        KO(`${f}: ${src} khai ${w}x${h} (tỉ lệ ${(w / h).toFixed(2)}) nhưng ảnh thật ` +
           `${kt.w}x${kt.h} (tỉ lệ ${(kt.w / kt.h).toFixed(2)}) — méo ảnh nếu CSS không ghi đè, ` +
           `và luôn gây giật bố cục khi ảnh tải xong`);
        xau++;
      }
    }
  }
  if (!xau) OK(`${xet} thẻ <img> khai đúng tỉ lệ`);
}

console.log(`\n${loi ? `✗ ${loi} lỗi` : '✓ không có lỗi'}${canh ? `, ${canh} cảnh báo` : ''}\n`);
process.exit(loi ? 1 : 0);
