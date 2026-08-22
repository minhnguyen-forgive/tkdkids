/* =============================================================
   API ĐĂNG KÝ TƯ VẤN — Api_DangKy.gs
   Dán vào Apps Script như một FILE MỚI. Không sửa code cũ.
   Xử lý action 'dangKyTuVan' gửi từ popup cơ sở và form trang chủ.
   ============================================================= */

var SHEET_DANGKY = 'DangKyTuVan';

var HEADERS_DANGKY = [
  'id', 'thoiGian', 'coSoQuanTam', 'tenPhuHuynh', 'soDienThoai', 'email',
  'soVoSinh', 'dsVoSinh', 'nguon', 'trangThai', 'nguoiXuLy', 'ghiChu'
];

/** Bộ định tuyến cho các action mới. Trả null nếu không phải việc của file này. */
function routeNewActions_(e) {
  var action = e && e.parameter ? e.parameter.action : '';
  switch (action) {
    case 'dangKyTuVan':     return apiDangKyTuVan_(e.parameter);
    case 'listDangKyTuVan': return apiListDangKyTuVan_(e.parameter);
    case 'capNhatTrangThaiDangKy': return apiCapNhatTrangThaiDangKy_(e.parameter);
    default: return null;
  }
}

/* ---------- Ghi nhận một đăng ký tư vấn ---------- */
function apiDangKyTuVan_(p) {
  var tenPhuHuynh = String(p.tenPhuHuynh || '').trim();
  var soDienThoai = String(p.soDienThoai || '').replace(/\D/g, '').replace(/^84/, '0');
  var email = String(p.email || '').trim();

  if (tenPhuHuynh.length < 2) return fail_('Vui lòng nhập họ tên phụ huynh.');
  if (!/^0(3|5|7|8|9)\d{8}$/.test(soDienThoai)) return fail_('Số điện thoại không hợp lệ.');
  if (email && !/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(email)) return fail_('Email không hợp lệ.');

  var dsVoSinh = [];
  try {
    dsVoSinh = JSON.parse(p.dsVoSinh || '[]');
  } catch (err) {
    return fail_('Danh sách võ sinh không đọc được.');
  }
  if (!dsVoSinh.length) return fail_('Vui lòng nhập thông tin ít nhất một võ sinh.');
  if (dsVoSinh.length > 5) return fail_('Mỗi lần đăng ký tối đa 5 võ sinh.');

  // Làm sạch dữ liệu võ sinh trước khi ghi
  var clean = [];
  for (var i = 0; i < dsVoSinh.length; i++) {
    var hoTen = String(dsVoSinh[i].hoTen || '').trim();
    var ngaySinh = String(dsVoSinh[i].ngaySinh || '').substring(0, 10);
    if (hoTen.length < 2) return fail_('Họ tên võ sinh thứ ' + (i + 1) + ' chưa hợp lệ.');
    clean.push({ hoTen: hoTen, ngaySinh: ngaySinh });
  }

  var id = SHEETS_.newId();

  SHEETS_.withLock(function () {
    // Chống gửi trùng: cùng SĐT + cùng cơ sở trong vòng 5 phút thì bỏ qua
    var sh = SHEETS_.sheet(SHEET_DANGKY, HEADERS_DANGKY);
    var lastRow = sh.getLastRow();
    if (lastRow > 1) {
      var checkFrom = Math.max(2, lastRow - 20);   // chỉ soi 20 dòng cuối
      var map = SHEETS_.headerMap(sh);
      var recent = sh.getRange(checkFrom, 1, lastRow - checkFrom + 1, sh.getLastColumn()).getValues();
      var fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
      for (var r = recent.length - 1; r >= 0; r--) {
        var row = recent[r];
        if (String(row[map['soDienThoai']]) !== soDienThoai) continue;
        if (String(row[map['coSoQuanTam']]) !== String(p.coSoQuanTam || '')) continue;
        var t = row[map['thoiGian']];
        var when = (t instanceof Date) ? t : new Date(String(t).replace(' ', 'T'));
        if (when && when > fiveMinAgo) { id = String(row[map['id']]); return; }
      }
    }

    SHEETS_.appendRow(SHEET_DANGKY, HEADERS_DANGKY, {
      id: id,
      thoiGian: SHEETS_.now(),
      coSoQuanTam: String(p.coSoQuanTam || ''),
      tenPhuHuynh: tenPhuHuynh,
      soDienThoai: soDienThoai,
      email: email,
      soVoSinh: clean.length,
      dsVoSinh: JSON.stringify(clean),
      nguon: String(p.nguon || 'form_trangchu'),
      trangThai: 'Mới',
      nguoiXuLy: '',
      ghiChu: ''
    });
  });

  notifyNewLead_(tenPhuHuynh, soDienThoai, email, clean, String(p.coSoQuanTam || ''));
  return ok_({ id: id, soVoSinh: clean.length });
}

/* ---------- Gửi email báo có khách đăng ký ---------- */
function notifyNewLead_(ten, sdt, email, dsVoSinh, coSo) {
  try {
    var to = PropertiesService.getScriptProperties().getProperty('EMAIL_NHAN_LEAD');
    if (!to) return;   // Chưa cấu hình thì bỏ qua, không làm hỏng luồng đăng ký

    var rows = dsVoSinh.map(function (v, i) {
      return '<tr><td style="padding:6px 12px;border:1px solid #ddd">' + (i + 1) +
             '</td><td style="padding:6px 12px;border:1px solid #ddd">' + v.hoTen +
             '</td><td style="padding:6px 12px;border:1px solid #ddd">' + (v.ngaySinh || '—') + '</td></tr>';
    }).join('');

    MailApp.sendEmail({
      to: to,
      subject: '[Đăng ký mới] ' + ten + ' — ' + (coSo || 'Chưa chọn cơ sở') + ' — ' + dsVoSinh.length + ' võ sinh',
      htmlBody:
        '<h3>Có phụ huynh vừa đăng ký</h3>' +
        '<p><b>Phụ huynh:</b> ' + ten + '<br>' +
        '<b>Điện thoại:</b> <a href="tel:' + sdt + '">' + sdt + '</a><br>' +
        '<b>Email:</b> ' + (email || '—') + '<br>' +
        '<b>Cơ sở quan tâm:</b> ' + (coSo || 'Chưa chọn') + '</p>' +
        '<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">' +
        '<tr><th style="padding:6px 12px;border:1px solid #ddd">#</th>' +
        '<th style="padding:6px 12px;border:1px solid #ddd">Võ sinh</th>' +
        '<th style="padding:6px 12px;border:1px solid #ddd">Ngày sinh</th></tr>' + rows + '</table>'
    });
  } catch (err) {
    // Lỗi gửi mail không được phép làm hỏng việc ghi nhận đăng ký
    console.error('Không gửi được email thông báo: ' + err);
  }
}

/* ---------- Lễ tân xem danh sách đăng ký ---------- */
function apiListDangKyTuVan_(p) {
  var coSo = String(p.coSo || '');
  var trangThai = String(p.trangThai || '');

  var rows = SHEETS_.readAll(SHEET_DANGKY, function (r) {
    if (coSo && String(r.coSoQuanTam) !== coSo) return false;
    if (trangThai && String(r.trangThai) !== trangThai) return false;
    return true;
  });

  var out = rows.map(function (r) {
    var ds = [];
    try { ds = JSON.parse(r.dsVoSinh || '[]'); } catch (e) {}
    return {
      id: r.id,
      thoiGian: String(r.thoiGian),
      coSoQuanTam: r.coSoQuanTam,
      tenPhuHuynh: r.tenPhuHuynh,
      soDienThoai: r.soDienThoai,
      email: r.email,
      dsVoSinh: ds,
      nguon: r.nguon,
      trangThai: r.trangThai,
      nguoiXuLy: r.nguoiXuLy,
      ghiChu: r.ghiChu
    };
  }).reverse();    // mới nhất lên đầu

  return ok_({ items: out, total: out.length });
}

/* ---------- Cập nhật trạng thái xử lý lead ---------- */
function apiCapNhatTrangThaiDangKy_(p) {
  var id = String(p.id || '');
  var trangThai = String(p.trangThai || '');
  var HOP_LE = ['Mới', 'Đã liên hệ', 'Đã đăng ký', 'Không quan tâm'];
  if (HOP_LE.indexOf(trangThai) === -1) return fail_('Trạng thái không hợp lệ.');

  var rec = SHEETS_.findRow(SHEET_DANGKY, 'id', id);
  if (!rec) return fail_('Không tìm thấy đăng ký này.');

  SHEETS_.updateRow(SHEET_DANGKY, rec._row, {
    trangThai: trangThai,
    nguoiXuLy: String(p.maNV || ''),
    ghiChu: String(p.ghiChu || rec.ghiChu || '')
  });
  return ok_({ id: id, trangThai: trangThai });
}

/* ---------- Tiện ích trả kết quả ---------- */
function ok_(data) {
  var out = { status: 'success' };
  for (var k in data) out[k] = data[k];
  return out;
}
function fail_(message, code) {
  return { status: 'error', message: message, code: code || '' };
}
