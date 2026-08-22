#!/usr/bin/env node
/* =============================================================
   NHẬP BÀI VIẾT VÀ ẢNH TỪ FANPAGE FACEBOOK

   Facebook đã chặn hoàn toàn việc đọc nội dung Trang bằng cách tải trang web
   (trả về lỗi 400) và cũng chặn Graph API nếu không có mã truy cập. Vì vậy
   cách duy nhất còn dùng được là Graph API kèm Page Access Token do chính
   quản trị viên Trang tạo ra.

   CÁCH LẤY MÃ (làm một lần, mất khoảng 5 phút):
     1. Vào  https://developers.facebook.com/tools/explorer/
     2. Ô "Meta App": chọn hoặc tạo một ứng dụng bất kỳ (loại Business).
     3. Ô "User or Page": chọn  Page Access Token  ->  chọn Fanpage Taekwondo Kids.
     4. Ô "Permissions": thêm  pages_read_engagement  và  pages_read_user_content
     5. Bấm  Generate Access Token, đăng nhập và cấp quyền.
     6. Sao chép chuỗi mã dài hiện ra.

   CHẠY:
     FB_TOKEN='dán_mã_vào_đây' node tools/nhap-tu-facebook.mjs
     FB_TOKEN='...' node tools/nhap-tu-facebook.mjs --so-bai 25 --thu           # --thu = chạy thử, không ghi tệp

   Mã truy cập thường chỉ sống khoảng 1–2 giờ. Hết hạn thì lấy mã mới,
   KHÔNG lưu mã vào tệp trong repo (repo đang để công khai).
   ============================================================= */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const TOKEN = process.env.FB_TOKEN || '';
const PAGE  = process.env.FB_PAGE || 'TaekwondoKids.VietNam';
const API   = 'https://graph.facebook.com/v21.0';

const args   = process.argv.slice(2);
const DRYRUN = args.includes('--thu');
const LIMIT  = Number(args[args.indexOf('--so-bai') + 1]) || 20;

// fileURLToPath chứ không phải .pathname — đường dẫn dự án có dấu cách
const ROOT   = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMGDIR = path.join(ROOT, 'assets/img/tin-tuc');
const THUMB  = path.join(ROOT, 'assets/img/tin-tuc-thumb');
const NEWS   = path.join(ROOT, 'data/tin-tuc.json');
const ALBUM  = path.join(ROOT, 'data/album.json');

if (!TOKEN) {
  console.error('\n✗ Thiếu mã truy cập.\n  Chạy lại theo dạng:  FB_TOKEN=\'mã_của_bạn\' node tools/nhap-tu-facebook.mjs\n');
  console.error('  Xem phần hướng dẫn lấy mã ở đầu tệp này.\n');
  process.exit(1);
}

/* ---------- tiện ích ---------- */

const KHONG_DAU = s => s
  .replace(/Đ/g, 'D').replace(/đ/g, 'd')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const slug = s => KHONG_DAU(s)
  .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 60);

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function graph(pathname, params = {}) {
  const u = new URL(API + pathname);
  u.searchParams.set('access_token', TOKEN);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const r = await fetch(u);
  const j = await r.json();
  if (j.error) throw new Error(`Graph API: ${j.error.message} (mã ${j.error.code})`);
  return j;
}

async function taiAnh(url, ten) {
  const dich = path.join(IMGDIR, ten);
  if (fs.existsSync(dich)) return ten;                 // đã tải ở lần chạy trước
  const r = await fetch(url);
  if (!r.ok) throw new Error(`tải ảnh lỗi HTTP ${r.status}`);
  const tam = dich + '.tam';
  fs.writeFileSync(tam, Buffer.from(await r.arrayBuffer()));
  // Nén về đúng mức đang dùng cho toàn bộ ảnh trên web: 1400px / chất lượng 50
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '50', '-Z', '1400', tam, '--out', dich], { stdio: 'ignore' });
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '48', '-Z', '560',  tam, '--out', path.join(THUMB, ten)], { stdio: 'ignore' });
  fs.unlinkSync(tam);
  return ten;
}

/** Đoạn văn Facebook là chữ thuần, xuống dòng bằng \n — dựng lại thành <p>. */
function thanhHTML(message) {
  return String(message || '')
    .split(/\n{2,}/)
    .map(k => k.trim())
    .filter(Boolean)
    .map(k => `<p>${esc(k).replace(/\n/g, '<br>')}</p>`)
    .join('\n');
}

/* ---------- chạy ---------- */

console.log(`\n▸ Đang đọc fanpage ${PAGE} …`);

const page = await graph(`/${PAGE}`, { fields: 'id,name' });
console.log(`  Trang: ${page.name} (id ${page.id})`);

const feed = await graph(`/${page.id}/published_posts`, {
  limit: LIMIT,
  fields: 'id,created_time,message,permalink_url,full_picture,attachments{title,media_type,subattachments{media},media}',
});

const posts = (feed.data || []).filter(p => (p.message || '').trim().length > 80);
console.log(`  Lấy được ${feed.data?.length || 0} bài, trong đó ${posts.length} bài đủ dài để đăng.\n`);

const news   = JSON.parse(fs.readFileSync(NEWS, 'utf8'));
const albums = JSON.parse(fs.readFileSync(ALBUM, 'utf8'));
const daCo   = new Set(news.articles.map(a => a.id));

let themBai = 0, themAlbum = 0, themAnh = 0;

for (const p of posts) {
  const dong1  = (p.message || '').split('\n')[0].trim().slice(0, 110);
  const tieuDe = dong1.replace(/[#*]/g, '').trim();
  const id     = slug(tieuDe) || slug(p.id);
  if (daCo.has(id)) { console.log(`  – bỏ qua (đã có): ${tieuDe.slice(0, 55)}`); continue; }

  const ngay = p.created_time.slice(0, 10);
  const nam  = Number(ngay.slice(0, 4));

  // Gom tất cả ảnh của bài: ảnh bìa + các ảnh trong bộ sưu tập
  const urls = [];
  if (p.full_picture) urls.push(p.full_picture);
  for (const at of p.attachments?.data || []) {
    if (at.media?.image?.src) urls.push(at.media.image.src);
    for (const sub of at.subattachments?.data || []) {
      if (sub.media?.image?.src) urls.push(sub.media.image.src);
    }
  }
  const duyNhat = [...new Set(urls)];

  const anh = [];
  for (let i = 0; i < duyNhat.length; i++) {
    const ten = `${id}${i === 0 ? '-bia' : '-' + i}.jpg`;
    try {
      if (!DRYRUN) await taiAnh(duyNhat[i], ten);
      anh.push(ten); themAnh++;
    } catch (e) {
      console.log(`    ! ảnh ${i + 1} lỗi: ${e.message}`);
    }
  }

  const bia = anh[0] || '';
  news.articles.unshift({
    id, title: tieuDe, date: ngay, category: 'Tin tức',
    excerpt: (p.message || '').replace(/\s+/g, ' ').slice(0, 190).trim() + '…',
    cover:      bia ? `assets/img/tin-tuc/${bia}` : '',
    coverThumb: bia ? `assets/img/tin-tuc-thumb/${bia}` : '',
    readMinutes: Math.max(2, Math.round((p.message || '').split(/\s+/).length / 200)),
    body: thanhHTML(p.message) +
          (p.permalink_url ? `\n<p><a href="${esc(p.permalink_url)}" target="_blank" rel="noopener">Xem bài gốc trên Facebook</a></p>` : ''),
  });
  daCo.add(id); themBai++;

  // Từ 3 ảnh trở lên thì tạo luôn một album ảnh cho sự kiện đó
  if (anh.length >= 3) {
    albums.albums.unshift({
      id, year: nam, title: tieuDe, place: '', date: ngay,
      cover: `assets/img/tin-tuc-thumb/${bia}`, articleId: id,
      photos: anh.map(t => ({
        src: `assets/img/tin-tuc/${t}`, thumb: `assets/img/tin-tuc-thumb/${t}`, caption: '',
      })),
    });
    themAlbum++;
  }
  console.log(`  + ${tieuDe.slice(0, 55)}  (${anh.length} ảnh)`);
}

if (DRYRUN) {
  console.log(`\n▸ CHẠY THỬ — chưa ghi gì. Sẽ thêm ${themBai} bài, ${themAlbum} album, ${themAnh} ảnh.\n`);
} else if (themBai) {
  news.updated = albums.updated = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(NEWS,  JSON.stringify(news,   null, 2));
  fs.writeFileSync(ALBUM, JSON.stringify(albums, null, 2));
  console.log(`\n✓ Đã thêm ${themBai} bài, ${themAlbum} album, ${themAnh} ảnh.`);
  console.log('  Mở lại tin-tuc.html để xem, sửa lại tiêu đề / chuyên mục trong data/tin-tuc.json nếu cần.\n');
} else {
  console.log('\n▸ Không có bài mới nào.\n');
}
