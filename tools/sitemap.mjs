#!/usr/bin/env node
/* =============================================================
   SINH SITEMAP.XML VÀ ROBOTS.TXT
       node tools/sitemap.mjs           — ghi ra tệp
       node tools/sitemap.mjs --kiem    — chỉ kiểm, không ghi (dùng trước khi đẩy)

   Sơ đồ trang ở chân trang là cho người xem; tệp này là cho máy tìm kiếm.
   Sinh bằng script chứ không viết tay: thêm bài viết hay album mới chỉ cần
   chạy lại, khỏi phải nhớ sửa thêm một tệp XML nữa.

   Gồm ba nhóm địa chỉ:
     1. Trang tĩnh — trang chủ, kiến thức, 7 trang cấp đai, thuật ngữ,
        tin tức, thư viện
     2. Bài viết   — bai-viet.html?id=... cho từng bài trong data/tin-tuc.json
     3. Album ảnh  — album.html?id=...   cho từng album trong data/album.json

   Không đưa vào: app.html (hệ thống quản trị nội bộ), các tệp sao lưu, và
   hai trang bai-viet.html / album.html khi không có tham số id (mở trần thì
   chưa có nội dung gì).

   lastmod lấy theo thứ tự ưu tiên:
     - bài viết / album: trường date của chính nó
     - trang danh sách (tin tức, thư viện): ngày updated của tệp dữ liệu
     - còn lại: ngày commit cuối của tệp HTML trong git (không có git thì
       lấy ngày sửa tệp)
   ============================================================= */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Phải dùng fileURLToPath: đường dẫn dự án có dấu cách, nếu lấy .pathname
// thì dấu cách thành %20 và Node không tìm thấy thư mục.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GOC = 'https://taekwondokids.vn/';
const CHI_KIEM = process.argv.includes('--kiem');

/* Trang tĩnh, xếp theo thứ tự người xem thường đi. Trang chủ để địa chỉ gốc
   chứ không phải index.html, trùng với thẻ canonical của chính nó. */
const TRANG_TINH = [
  { tep: 'index.html',                            loc: '' },
  { tep: 'kien-thuc.html' },
  { tep: 'thi-len-dai.html' },
  { tep: 'thi-len-dai-cap-7-dai-vang.html' },
  { tep: 'thi-len-dai-cap-6-dai-xanh-la.html' },
  { tep: 'thi-len-dai-cap-5-dai-xanh-duong.html' },
  { tep: 'thi-len-dai-cap-4-dai-do.html' },
  { tep: 'thi-len-dai-cap-3-dai-do.html' },
  { tep: 'thi-len-dai-cap-2-dai-do.html' },
  { tep: 'thi-len-dai-cap-1-dai-do.html' },
  { tep: 'thuat-ngu-taekwondo.html' },
  { tep: 'tin-tuc.html',  ngayTu: 'data/tin-tuc.json' },
  { tep: 'thu-vien.html', ngayTu: 'data/album.json' },
];

/* Cố tình không đưa vào sitemap — liệt kê ra đây để khi thêm trang mới mà
   quên khai báo thì script báo ngay, chứ không im lặng bỏ sót. */
const BO_QUA = new Set([
  'app.html',                   // hệ thống quản trị, cần đăng nhập
  'bai-viet.html',              // vỏ trang, chỉ có nội dung khi có ?id=
  'album.html',                 // vỏ trang, chỉ có nội dung khi có ?id=
  'index.original.backup.html', // bản sao lưu
]);

let canh = 0;
const CANH = m => { console.log(`  ! ${m}`); canh++; };

/* ---------- ngày tháng ---------- */

const ngayGit = tep => {
  try {
    const r = execFileSync('git', ['log', '-1', '--format=%cs', '--', tep],
      { cwd: ROOT, encoding: 'utf8' }).trim();
    if (r) return r;
  } catch { /* không có git, hoặc tệp chưa commit */ }
  return fs.statSync(path.join(ROOT, tep)).mtime.toISOString().slice(0, 10);
};

const doc = tep => JSON.parse(fs.readFileSync(path.join(ROOT, tep), 'utf8'));

/* ---------- dựng danh sách địa chỉ ---------- */

const dsDiaChi = [];

for (const t of TRANG_TINH) {
  if (!fs.existsSync(path.join(ROOT, t.tep))) { CANH(`không có tệp ${t.tep}`); continue; }
  const ngayTep = ngayGit(t.tep);
  let ngay = ngayTep;
  if (t.ngayTu) {
    const ngayData = doc(t.ngayTu).updated;
    // Trang danh sách đổi theo cả hai: mã trang và dữ liệu. Lấy ngày muộn hơn.
    if (ngayData && ngayData > ngay) ngay = ngayData;
  }
  dsDiaChi.push({ loc: GOC + (t.loc ?? t.tep), lastmod: ngay });
}

const themDsDong = (tepData, khoa, vo, nhan) => {
  const d = doc(tepData);
  const ds = d[khoa] || [];
  const ngayVo = ngayGit(vo);
  for (const it of ds) {
    if (!it.id) { CANH(`${nhan} thiếu id trong ${tepData}`); continue; }
    dsDiaChi.push({
      loc: `${GOC}${vo}?id=${encodeURIComponent(it.id)}`,
      // Ngày đăng của bài. Nếu vỏ trang được sửa muộn hơn thì lấy ngày đó,
      // vì nội dung người xem thấy cũng đổi theo.
      lastmod: (it.date && it.date > ngayVo) ? it.date : (it.date || ngayVo),
    });
  }
  return ds.length;
};

const soBai   = themDsDong('data/tin-tuc.json', 'articles', 'bai-viet.html', 'bài viết');
const soAlbum = themDsDong('data/album.json',   'albums',   'album.html',    'album');

/* ---------- soát trang bị bỏ sót ---------- */

const daKhai = new Set([...TRANG_TINH.map(t => t.tep), ...BO_QUA]);
for (const tep of fs.readdirSync(ROOT).filter(f => f.endsWith('.html')).sort()) {
  if (!daKhai.has(tep)) CANH(`trang ${tep} chưa khai trong tools/sitemap.mjs — thêm vào TRANG_TINH hoặc BO_QUA`);
}

/* ---------- ghi tệp ---------- */

const xmlEsc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<!-- Sinh bằng: node tools/sitemap.mjs — đừng sửa tay, chạy lại script. -->',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...dsDiaChi.map(u => `  <url>\n    <loc>${xmlEsc(u.loc)}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n  </url>`),
  '</urlset>',
  '',
].join('\n');

const robots = [
  '# Sinh bằng: node tools/sitemap.mjs — đừng sửa tay, chạy lại script.',
  'User-agent: *',
  'Allow: /',
  '',
  '# Hệ thống quản trị nội bộ, mở ra cũng phải đăng nhập mới xem được gì',
  'Disallow: /app.html',
  '',
  `Sitemap: ${GOC}sitemap.xml`,
  '',
].join('\n');

const soSanh = (tep, noiDung) => {
  const p = path.join(ROOT, tep);
  const cu = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
  if (cu === noiDung) { console.log(`  = ${tep} không đổi`); return false; }
  if (CHI_KIEM) { CANH(`${tep} đã cũ so với dữ liệu — chạy: node tools/sitemap.mjs`); return true; }
  fs.writeFileSync(p, noiDung);
  console.log(`  ✓ ghi ${tep}`);
  return true;
};

console.log(`\nSitemap: ${dsDiaChi.length} địa chỉ ` +
            `(${TRANG_TINH.length} trang tĩnh, ${soBai} bài viết, ${soAlbum} album)`);
soSanh('sitemap.xml', xml);
soSanh('robots.txt', robots);

console.log(canh ? `\n! ${canh} cảnh báo` : '\n✓ không có cảnh báo');
process.exit(CHI_KIEM && canh ? 1 : 0);
