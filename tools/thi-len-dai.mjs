#!/usr/bin/env node
/* =============================================================
   SINH CÁC TRANG THI LÊN ĐAI TỪ data/thi-len-dai.json
       node tools/thi-len-dai.mjs

   Nguồn nội dung: Quy định thi thăng cấp, đẳng của Liên đoàn Taekwondo
   Việt Nam (QĐ 152/2025/QĐ-VTF). Sửa nội dung thì sửa tệp JSON rồi chạy
   lại script này, không sửa tay các tệp HTML vì lần chạy sau sẽ ghi đè.

   Script ghi:
     1. thi-len-dai-cap-*.html — một trang cho mỗi cấp trong levels[]
     2. thi-len-dai.html       — phần <main> và thẻ meta của trang tổng
     3. kien-thuc.html         — thanh lộ trình cấp đai
     4. Mọi trang .html        — danh sách "Thi lên đai theo cấp" ở sơ đồ
                                 chân trang, dòng mô tả ở menu con

   Thanh điều hướng và chân trang của trang cấp đai lấy từ trang tổng
   thi-len-dai.html, nên menu đổi ở đâu thì trang cấp đai đổi theo.
   Thêm cấp mới nhớ khai địa chỉ trong tools/sitemap.mjs rồi chạy nó.
   ============================================================= */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Phải dùng fileURLToPath: đường dẫn dự án có dấu cách.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GOC = 'https://taekwondokids.vn/';
const doc = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const ghi = (f, s) => fs.writeFileSync(path.join(ROOT, f), s);

const D = JSON.parse(doc('data/thi-len-dai.json'));
// showVideos: false — tạm ẩn mọi video (và ảnh bìa video ở thẻ cấp) nhưng vẫn giữ mã trong JSON
const L = D.showVideos === false ? D.levels.map(l => ({ ...l, youtube: null, image: null })) : D.levels;
const SRC = D.source;

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* Màu đai: đai có vạch dựng bằng gradient — vạch nằm ở đầu đai, giống đai thật. */
function nenDai(l) {
  if (!l.stripes) return l.beltBase;
  const parts = [`${l.beltBase} 0 58%`];
  let x = 58;
  for (let i = 0; i < l.stripes; i++) {
    parts.push(`${l.stripeColor} ${x}% ${x + 5}%`, `${l.beltBase} ${x + 5}% ${x + 9}%`);
    x += 9;
  }
  parts.push(`${l.beltBase} ${x}% 100%`);
  return `linear-gradient(90deg, ${parts.join(', ')})`;
}

const nhanQuyen = l => l.poomsae || 'Kỹ thuật căn bản';
const soPhan = l => l.blocks.length;
const moTa = l => l.poomsae
  ? `Nội dung thi lên cấp ${l.cap} – ${l.beltName} theo quy định của Liên đoàn Taekwondo Việt Nam: kỹ thuật căn bản, bài quyền ${l.poomsae} và đối luyện${l.sparring ? ` (song đấu ${l.sparring})` : ''}.${l.youtube ? ' Kèm video hướng dẫn.' : ''}`
  : `Nội dung thi lên cấp ${l.cap} – ${l.beltName} theo quy định của Liên đoàn Taekwondo Việt Nam: kỹ thuật tấn, đấm, đỡ, đá căn bản và thuật ngữ Taekwondo.`;

/* ---------- các khối dùng chung ---------- */

function thangDai(hienTai, thut = '    ') {
  const o = L.map(l => `${thut}<a class="belt-step" href="${l.id}.html"${l.cap === hienTai ? ' aria-current="page"' : ''}>
${thut}  <span class="belt-bar" style="background:${nenDai(l)}"></span>
${thut}  <span class="lv">Cấp ${l.cap}</span>
${thut}  <span class="nm">${esc(l.beltName)}</span>
${thut}  <span class="pm">${esc(nhanQuyen(l))}</span>
${thut}</a>`);
  return `<div class="belt-ladder">\n${o.join('\n')}\n${thut.slice(2)}</div>`;
}

const ghiChuNguon = `<div class="source-note">
      <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
      <p><strong>Về giáo trình này.</strong> Nội dung thi lấy theo ${esc(SRC.name)}
      (ban hành kèm ${esc(SRC.decision)} ngày ${esc(SRC.date)}, ${esc(SRC.basis.charAt(0).toLowerCase() + SRC.basis.slice(1))}).
      Đơn vị tổ chức có thể bổ sung nội dung thể lực, công phá phù hợp với từng cấp đai —
      hãy hỏi huấn luyện viên trực tiếp của con để nắm chính xác nội dung kỳ thi sắp tới.</p>
    </div>`;

/* ---------- 1. trang từng cấp ---------- */

const tong = doc('thi-len-dai.html');
const linkHead = tong.slice(tong.indexOf('<link rel="icon"'), tong.indexOf('<script type="application/ld+json">'));
// Gán lại sau khi đã vá trang tổng (xem phần ghi ở cuối)
let dauNav = '', sauMain = '';

function trangCap(l, i) {
  const truoc = L[i - 1], sau = L[i + 1];
  const tieuDe = `${l.title} | Taekwondo Kids Việt Nam`;
  const anh = l.image ? GOC + l.image : `${GOC}assets/img/thi-len-dai/cap-7.jpg`;
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: l.title,
    description: moTa(l),
    provider: { '@type': 'Organization', name: 'Taekwondo Kids Việt Nam', url: GOC },
    inLanguage: 'vi',
    hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'onsite', courseWorkload: 'PT1H' },
  };

  const facts = [
    `<span class="belt-fact"><i class="fa-solid fa-arrow-right-arrow-left" aria-hidden="true"></i>
        ${esc(l.fromBelt)} → <strong>${esc(l.beltName)}</strong></span>`,
    l.poomsae && `<span class="belt-fact"><i class="fa-solid fa-scroll" aria-hidden="true"></i>
        ${esc(l.poomsaeVi)} · <strong>${esc(l.poomsae)}</strong></span>`,
    `<span class="belt-fact"><i class="fa-solid fa-hourglass-half" aria-hidden="true"></i>
        Tập tối thiểu <strong>${esc(l.minTime)}</strong></span>`,
    `<span class="belt-fact"><i class="fa-solid fa-child" aria-hidden="true"></i>
        <strong>${esc(l.minAge)}</strong> (tính theo năm)</span>`,
    `<span class="belt-fact"><i class="fa-solid fa-hand-back-fist" aria-hidden="true"></i>
        Song đấu: <strong>${l.sparring ? esc(l.sparring) : 'không thi'}</strong></span>`,
    l.youtube && `<span class="belt-fact"><i class="fa-brands fa-youtube" aria-hidden="true"></i>
        Có video hướng dẫn</span>`,
  ].filter(Boolean).join('\n      ');

  const video = l.youtube ? `
<section style="padding:48px 0 0">
  <div class="container" style="max-width:900px">
    <button type="button" class="video-facade" data-yt="${esc(l.youtube)}"
            aria-label="Phát video hướng dẫn bài thi lên cấp ${l.cap}">
      <img src="${esc(l.image)}"
           alt="Video hướng dẫn bài thi lên cấp ${l.cap} – ${esc(l.beltName)}" decoding="async">
      <span class="vf-btn"><span><i class="fa-solid fa-play" aria-hidden="true"></i></span></span>
      <span class="vf-cap">Video hướng dẫn · ${esc(l.title)}</span>
    </button>
    <p class="video-note">Video quay theo giáo trình trước đây của trung tâm, dùng để ôn bài quyền và kỹ thuật.
      Nội dung thi chính thức theo quy định mới ở ngay bên dưới.</p>
  </div>
</section>
` : '';

  const khoi = l.blocks.map((b, k) => `      <div class="curri-item">
        <span class="curri-num"><i class="fa-solid ${esc(b.icon)}" aria-hidden="true"></i></span>
        <div>
          <h3>${k + 1}. ${esc(b.title)}</h3>
          ${b.text ? `<p>${esc(b.text)}</p>` : ''}
          ${b.items.length ? `<ul class="curri-sub">${b.items.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
        </div>
      </div>`).join('\n');

  const nutCap = (c, cls, nhan, mui) => c
    ? `<a class="${cls}" href="${c.id}.html">
        ${mui === 'trai' ? '<i class="fa-solid fa-arrow-left" aria-hidden="true"></i>\n        ' : ''}<span><span class="ln-lbl">${nhan}</span><span class="ln-nm">${esc(c.shortTitle)}</span></span>${mui === 'phai' ? '\n        <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>' : ''}
      </a>`
    : '<span></span>';

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(tieuDe)}</title>

<meta name="description" content="${esc(moTa(l))}">
<meta name="author" content="Taekwondo Kids Việt Nam">
<meta name="theme-color" content="#0047AB">
<link rel="canonical" href="${GOC}${l.id}.html">

<meta property="og:type" content="article">
<meta property="og:site_name" content="Taekwondo Kids Việt Nam">
<meta property="og:title" content="${esc(tieuDe)}">
<meta property="og:description" content="${esc(moTa(l))}">
<meta property="og:image" content="${anh}">
<meta property="og:locale" content="vi_VN">
<meta property="og:url" content="${GOC}${l.id}.html">
<meta name="twitter:card" content="summary_large_image">

${linkHead}<script type="application/ld+json">
${JSON.stringify(ld, null, 2)}
</script>
</head>
${dauNav}<main id="main" class="page-top">
<!-- Sinh bằng: node tools/thi-len-dai.mjs — sửa data/thi-len-dai.json rồi chạy lại. -->

<section class="belt-hero" style="--belt:${l.beltColor};--band:${nenDai(l)}">
  <div class="container">
    <nav class="crumbs" aria-label="Đường dẫn">
      <a href="index.html">Trang chủ</a><span class="sep">/</span>
      <a href="kien-thuc.html">Kiến thức</a><span class="sep">/</span>
      <a href="thi-len-dai.html">Chương trình thi lên đai</a><span class="sep">/</span>
      <span aria-current="page">Cấp ${l.cap}</span>
    </nav>
    <span class="band"></span>
    <h1>Bài thi lên cấp ${l.cap}<br>${esc(l.beltName)}</h1>
    ${l.beltAlt ? `<p class="belt-alt">Theo quy định, có thể dùng ${esc(l.beltName)} ${esc(l.beltAlt)}.</p>\n    ` : ''}<div class="belt-facts">
      ${facts}
    </div>
  </div>
</section>
${video}
<section style="padding:52px 0 0">
  <div class="container" style="max-width:900px">
    <h2 class="sec-title" style="font-size:clamp(24px,3vw,34px);margin-bottom:24px">Nội dung <span class="accent">bài thi</span></h2>
    <div class="curri">
${khoi}
    </div>

    <div class="level-nav">
      ${nutCap(truoc, 'prev', 'Cấp trước đó', 'trai')}
      ${nutCap(sau, 'next', 'Cấp tiếp theo', 'phai')}
    </div>
  </div>
</section>

<section style="padding:56px 0 100px">
  <div class="container" style="max-width:900px">
    ${ghiChuNguon}
    <p class="video-note" style="text-align:left;margin-top:14px">Điều kiện dự thi, lịch thi theo quý và cách chấm điểm:
      <a href="thi-len-dai.html#quy-dinh">xem ở trang tổng</a>.</p>
    <h2 class="sec-title" style="font-size:clamp(22px,2.6vw,30px);margin:56px 0 18px">Toàn bộ <span class="accent">lộ trình</span></h2>
    ${thangDai(l.cap, '    ')}
    <div class="article-cta" style="margin-top:48px">
      <h3>Chưa học Taekwondo? Bắt đầu từ buổi học thử miễn phí</h3>
      <p>7 cơ sở tại Hà Nội, TP.HCM và Quảng Ninh — huấn luyện viên quốc tế, giáo án riêng theo từng độ tuổi.</p>
      <div class="cta-row">
        <a href="index.html#locations" class="btn-register" style="width:auto;padding:14px 30px">Đăng ký học thử</a>
        <a href="tel:0978931747" class="share-btn" style="background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.3);color:#fff">
          <i class="fa-solid fa-phone" aria-hidden="true"></i> 097 893 1747</a>
      </div>
    </div>
  </div>
</section>
</main>${sauMain}`;
}

/* ---------- 2. trang tổng ---------- */

function mainTong() {
  const the = L.map(l => {
    const media = l.image
      ? `<span class="lc-media">
          <img src="${esc(l.image)}" alt="" loading="lazy" decoding="async">
          <span class="lc-play"><i class="fa-solid fa-circle-play" aria-hidden="true"></i></span>
        </span>`
      : `<span class="lc-media no-img">
          <span class="lc-beltbig" style="background:${nenDai(l)}"></span>
        </span>`;
    const tom = l.poomsae
      ? `Bài quyền <strong>${esc(l.poomsae)}</strong> · song đấu: ${l.sparring ? esc(l.sparring) : 'không'}${l.youtube ? ' · có video' : ''}.`
      : `Tấn, đấm, đỡ, đá căn bản và <strong>thuật ngữ</strong> tiếng Hàn.`;
    return `      <a class="level-card" href="${l.id}.html">
        ${media}
        <span class="lc-body">
          <span class="lc-belt"><span class="dot" style="background:${nenDai(l)}"></span>${esc(l.fromBelt)} → ${esc(l.beltName)}</span>
          <h3>Bài thi lên cấp ${l.cap}</h3>
          <p>${tom} ${esc(l.minAge)}, tập tối thiểu ${esc(l.minTime)}.</p>
          <span class="lc-go">Xem nội dung bài thi <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></span>
        </span>
      </a>`;
  }).join('\n');

  const dongBang = [
    `<tr><td><strong>Cấp ${D.entry.cap}</strong></td><td><span class="belt-swatch" style="background:#FFFFFF"></span>${esc(D.entry.beltName)} (nhập môn)</td><td>—</td><td>Từ 6 tuổi</td></tr>`,
    ...L.map(l => `<tr><td><a href="${l.id}.html"><strong>Thi lên cấp ${l.cap}</strong></a></td><td><span class="belt-swatch" style="background:${nenDai(l)}"></span>${esc(l.beltName)}${l.beltAlt ? ` <span class="muted">${esc(l.beltAlt)}</span>` : ''}</td><td>${esc(l.minTime)}</td><td>${esc(l.minAge)}<br><span class="muted">${esc(l.ageNote)}</span></td></tr>`),
  ].join('\n            ');

  const quy = D.quarters.map(q => `<div class="quarter"><span class="q-nm">${esc(q.name)}</span><span class="q-rg">${esc(q.range)}</span></div>`).join('\n        ');
  const tuNgu = D.entry.terms.map(([r, k, v]) => `<li><strong>${esc(r)}</strong> (${esc(k)}) – ${esc(v)}</li>`).join('');

  return `<main id="main" class="page-top">
<!-- Phần nội dung chính sinh bằng: node tools/thi-len-dai.mjs — sửa data/thi-len-dai.json rồi chạy lại. -->

<section class="page-hero">
  <div class="container">
    <nav class="crumbs" aria-label="Đường dẫn">
      <a href="index.html">Trang chủ</a><span class="sep">/</span>
      <a href="kien-thuc.html">Kiến thức</a><span class="sep">/</span>
      <span aria-current="page">Chương trình thi lên đai</span>
    </nav>
    <h1>Chương trình <span class="accent">thi lên đai</span></h1>
    <p>Nội dung thi từ cấp ${L[0].cap} đến cấp ${L[L.length - 1].cap} theo Quy định thi thăng cấp, đẳng mới của
       Liên đoàn Taekwondo Việt Nam (${esc(SRC.decision)}, ngày ${esc(SRC.date)}).
       Võ sinh và phụ huynh xem trước ở nhà để chuẩn bị cho kỳ thi thăng cấp.</p>
  </div>
</section>

<section style="padding:56px 0 40px">
  <div class="container">
    <h2 class="sec-title" style="font-size:clamp(24px,3vw,34px);margin-bottom:20px">Lộ trình <span class="accent">${L.length} cấp thi</span></h2>
    ${thangDai(null, '    ')}
  </div>
</section>

<section style="padding:24px 0 60px">
  <div class="container">
    <div class="level-grid">
${the}
    </div>
  </div>
</section>

<section id="quy-dinh" style="padding:0 0 40px">
  <div class="container">
    <h2 class="sec-title" style="font-size:clamp(24px,3vw,34px);margin-bottom:8px">Điều kiện <span class="accent">dự thi</span></h2>
    <p class="sec-desc" style="margin:0 0 24px">Võ sinh phải tập đủ thời gian tối thiểu và đạt độ tuổi quy định mới được dự thi.
      Tuổi tính theo năm; dòng in nghiêng là kỳ thi sớm nhất theo lộ trình chuẩn trong năm.</p>
    <div class="rule-table-wrap">
      <table class="rule-table">
        <thead><tr><th>Cấp dự thi</th><th>Màu đai</th><th>Thời gian tối thiểu</th><th>Độ tuổi</th></tr></thead>
        <tbody>
            ${dongBang}
        </tbody>
      </table>
    </div>
  </div>
</section>

<section style="padding:20px 0 40px">
  <div class="container">
    <h2 class="sec-title" style="font-size:clamp(24px,3vw,34px);margin-bottom:8px">Bốn kỳ thi <span class="accent">mỗi năm</span></h2>
    <p class="sec-desc" style="margin:0 0 24px">Mỗi câu lạc bộ được tổ chức hoặc tham gia tối đa bốn kỳ thi thăng cấp một năm.
      Võ sinh không dự thi hoặc thi chưa đạt sẽ thi lại ở kỳ sau.</p>
    <div class="quarter-grid">
        ${quy}
    </div>
  </div>
</section>

<section style="padding:20px 0 40px">
  <div class="container">
    <h2 class="sec-title" style="font-size:clamp(24px,3vw,34px);margin-bottom:24px">Bài thi <span class="accent">gồm những gì</span></h2>
    <div class="info-grid">
      <div class="info-card">
        <h3><i class="fa-solid fa-hand-fist" aria-hidden="true"></i> Kỹ thuật căn bản</h3>
        <p>Tấn, đấm, đỡ, đá theo từng cấp; từ cấp 4 thêm ba nguyên tắc phát lực (bình thường, liên tục, nhanh).
           Giám khảo đồng thời xem tố chất thể lực, sự tập trung, chiều cao, cân nặng.</p>
      </div>
      <div class="info-card">
        <h3><i class="fa-solid fa-scroll" aria-hidden="true"></i> Bài quyền</h3>
        <p>Từ cấp 7 đến cấp 1, mỗi cấp một bài Taegeuk (1 đến 7). Chấm thuộc quyền, kỹ thuật chính xác,
           biên độ, hướng nhìn, thăng bằng, tiếng hét, nhịp điệu và phong cách trình bày.</p>
      </div>
      <div class="info-card">
        <h3><i class="fa-solid fa-people-arrows" aria-hidden="true"></i> Đối luyện</h3>
        <p>Phân thế bài quyền và tự vệ cơ bản. Song đấu bắt đầu từ cấp 4: 2 hiệp × 30 giây (cấp 4),
           2 hiệp × 45 giây (cấp 3), 2 hiệp × 1 phút (cấp 2 và cấp 1).</p>
      </div>
      <div class="info-card">
        <h3><i class="fa-solid fa-dumbbell" aria-hidden="true"></i> Thể lực, công phá</h3>
        <p>Không bắt buộc. Đơn vị tổ chức có thể bổ sung nội dung thể lực, công phá phù hợp với từng cấp đai.</p>
      </div>
    </div>
  </div>
</section>

<section style="padding:20px 0 40px">
  <div class="container">
    <h2 class="sec-title" style="font-size:clamp(24px,3vw,34px);margin-bottom:24px">Chấm điểm &amp; <span class="accent">trang phục</span></h2>
    <div class="info-grid">
      <div class="info-card">
        <h3><i class="fa-solid fa-clipboard-check" aria-hidden="true"></i> Cách tính đạt</h3>
        <ul class="curri-sub">
          <li>Mỗi phần thi tối đa 100 điểm, giám khảo chấm trực tuyến, phần mềm tự tổng hợp.</li>
          <li>Đạt khi điểm trung bình từ 70 trở lên và không có 2/3 số giám khảo cho dưới 70.</li>
          <li>Phần kỹ thuật, đối luyện phải đạt; phần công phá, thể lực (nếu có) không bị điểm liệt (0 điểm).</li>
          <li>Kết quả chỉ được công nhận khi kỳ thi đăng ký trực tuyến với Liên đoàn. Võ sinh đạt được cấp thẻ chứng nhận theo mẫu thống nhất toàn quốc.</li>
        </ul>
      </div>
      <div class="info-card">
        <h3><i class="fa-solid fa-shirt" aria-hidden="true"></i> Trang phục &amp; bảo hộ</h3>
        <ul class="curri-sub">
          <li>Võ phục trắng cổ chữ V, cổ áo màu trắng (từ đai đỏ cấp 1 trở xuống).</li>
          <li>Phù hiệu Liên đoàn địa phương bên ngực phải, phù hiệu CLB bên ngực trái; tên đơn vị phía sau lưng.</li>
          <li>Bảng tên dưới phù hiệu (cấp 8 đến cấp 1): nền xanh dương, chữ trắng.</li>
          <li>Bảo hộ: áo giáp, mũ bảo vệ đầu, bảo vệ hạ bộ (ban tổ chức cung cấp); bảo vệ răng, cẳng tay, ống quyển (tự trang bị); bao tay, bảo vệ bàn chân khuyến khích dùng.</li>
        </ul>
      </div>
    </div>
  </div>
</section>

<section style="padding:20px 0 40px">
  <div class="container">
    <div class="info-card">
      <h3><i class="fa-solid fa-seedling" aria-hidden="true"></i> Cấp ${D.entry.cap} – ${esc(D.entry.beltName)} nhập môn</h3>
      <p>${esc(D.entry.text)}</p>
      <ul class="curri-sub">${D.entry.items.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
      <p style="margin-top:16px"><strong>Thuật ngữ làm quen:</strong></p>
      <ul class="term-inline">${tuNgu}</ul>
    </div>
  </div>
</section>

<section style="padding:20px 0 100px">
  <div class="container">
    ${ghiChuNguon}
  </div>
</section>
</main>`;
}

function trangTong(s) {
  const tieuDe = `Chương trình thi lên đai Taekwondo | Cấp ${L[0].cap} đến cấp ${L[L.length - 1].cap} theo quy định VTF`;
  const mt = `Nội dung thi thăng cấp Taekwondo từ cấp ${L[0].cap} đến cấp ${L[L.length - 1].cap} theo quy định mới của Liên đoàn Taekwondo Việt Nam: kỹ thuật căn bản, bài quyền Taegeuk, đối luyện, điều kiện độ tuổi và lịch thi theo quý.`;
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Chương trình thi thăng cấp Taekwondo Kids Việt Nam',
    itemListElement: L.map((l, i) => ({ '@type': 'ListItem', position: i + 1, name: l.title, url: `${GOC}${l.id}.html` })),
  };
  s = s.replace(/<title>[^<]*<\/title>/, `<title>${esc(tieuDe)}</title>`)
       .replace(/(<meta name="description" content=")[^"]*/, `$1${esc(mt)}`)
       .replace(/(<meta property="og:title" content=")[^"]*/, `$1${esc(tieuDe)}`)
       .replace(/(<meta property="og:description" content=")[^"]*/, `$1${esc(mt)}`)
       .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, `<script type="application/ld+json">\n${JSON.stringify(ld, null, 2)}\n</script>`);
  return s.slice(0, s.indexOf('<main')) + mainTong() + s.slice(s.indexOf('</main>') + '</main>'.length);
}

/* ---------- 3, 4. khối dùng chung ở các trang khác ---------- */

const dsChanTrang = `<p class="sitemap-col-title">Thi lên đai theo cấp</p>
        <ul class="footer-list">
${L.map(l => `          <li><a href="${l.id}.html">${esc(l.shortTitle)}</a></li>`).join('\n')}
        </ul>`;
const MO_TA_MENU = `Cấp ${L[0].cap} đến cấp ${L[L.length - 1].cap} · theo quy định VTF`;

function vaChung(s) {
  return s
    .replace(/<p class="sitemap-col-title">Thi lên đai theo cấp<\/p>\s*<ul class="footer-list">[\s\S]*?<\/ul>/, dsChanTrang)
    .replace(/(<a href="thi-len-dai.html">Chương trình thi lên đai\s*<span class="sub-desc">)[^<]*/, `$1${MO_TA_MENU}`);
}

/* ---------- ghi ---------- */

const tongMoi = vaChung(trangTong(tong));
ghi('thi-len-dai.html', tongMoi);

// Trang cấp đai lấy nav/chân trang từ bản trang tổng đã vá
dauNav = tongMoi.slice(tongMoi.indexOf('<body>'), tongMoi.indexOf('<main'));
sauMain = tongMoi.slice(tongMoi.indexOf('</main>') + '</main>'.length);
L.forEach((l, i) => ghi(`${l.id}.html`, trangCap(l, i)));

// Hàm thay thế (chứ không phải chuỗi) để ký tự $ trong nội dung không bị hiểu là mẫu
let kt = doc('kien-thuc.html');
kt = kt.replace(/<div class="belt-ladder">[\s\S]*?\n    <\/div>/, () => thangDai(null, '      '))
       .replace(/(Lộ trình <span class="accent">)[^<]*/, `$1${L.length} cấp thi`);
ghi('kien-thuc.html', kt);

const khac = fs.readdirSync(ROOT).filter(f => f.endsWith('.html') && f !== 'thi-len-dai.html'
  && !L.some(l => `${l.id}.html` === f) && !f.startsWith('index.original'));
for (const f of khac) {
  const s = doc(f), m = vaChung(s);
  if (m !== s) ghi(f, m);
}

console.log(`✓ Đã sinh ${L.length} trang cấp đai, trang tổng, lộ trình ở kien-thuc.html và chân trang ${khac.length} trang khác.`);
