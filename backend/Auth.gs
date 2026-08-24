/* =============================================================
   ĐĂNG NHẬP AN TOÀN — Auth.gs
   Dán vào Apps Script như một FILE MỚI. Không sửa code cũ.

   Sửa ba lỗ hổng của hệ thống đăng nhập hiện tại:

   1. Mật khẩu nằm cùng Sheet dữ liệu, có thể đang là chữ đọc được.
      -> Chuyển sang một Sheet RIÊNG (chỉ chủ sở hữu mở được), và không lưu
         mật khẩu mà lưu chuỗi băm: sha256$1000$muối$hash. Mỗi tài khoản một
         muối riêng nên hai người trùng mật khẩu vẫn ra hai chuỗi khác nhau,
         và băm 1000 vòng để máy dò mật khẩu phải trả giá gấp 1000 lần.

   2. Máy chủ tin vào mã nhân viên do trình duyệt gửi lên, nên sửa một dòng
      trong DevTools là tự phong thành admin.
      -> Đăng nhập xong máy chủ phát một token ngẫu nhiên, mọi lệnh sau đó
         phải kèm token. Cổng xacThuc_ tra token ra chủ nhân thật rồi GHI ĐÈ
         maNV / maPH / vai trò trong tham số, nên trình duyệt gửi gì cũng vô
         nghĩa. Token thô không được lưu ở đâu cả — Sheet chỉ giữ bản băm.

   3. Các lệnh đọc không kiểm gì: gọi getSchedule với mã bịa vẫn ra lịch thật.
      -> Cổng xacThuc_ đứng trước TOÀN BỘ action, kể cả action của script cũ,
         nên không phải sửa code cũ vẫn khoá được.

   CÁCH TRIỂN KHAI — xem docs/TRIEN-KHAI.md bước 6. Ba việc:
     a) Chạy hàm khoiTaoBangTaiKhoan (một lần)
     b) Thêm cổng xacThuc_ vào doPost
     c) Khi mọi người đăng nhập được bằng đường mới thì bật CHE_DO_TOKEN =
        'bat_buoc' để chặn hẳn lệnh không có token
   ============================================================= */

/* Sheet quản lý tài khoản — TÁCH RIÊNG khỏi Sheet dữ liệu.
   Đổi Sheet khác thì đặt Script Property ID_SHEET_TAIKHOAN, không cần sửa file.
   Sheet này KHÔNG được share cho ai ngoài chủ sở hữu: web app chạy bằng quyền
   chủ sở hữu nên script vẫn đọc được, còn nhân viên thì không. */
var AUTH_ID_SHEET_MAC_DINH = '1bQGLL5Xor1pW2GUDSh-0oNq45WffWjgIZuIjsdgy_KY';

var AUTH_SHEET_TK     = 'TaiKhoan';
var AUTH_SHEET_PHIEN  = 'Phien';
var AUTH_SHEET_NHATKY = 'NhatKyDangNhap';

var AUTH_COT_TK = ['id', 'maNV', 'maPH', 'hoTen', 'soDienThoai', 'email', 'vaiTro', 'coSo',
                   'capDai', 'matKhau', 'phaiDoiMatKhau', 'trangThai', 'soLanSai',
                   'khoaDenLuc', 'ngayTao', 'lanDangNhapCuoi'];
var AUTH_COT_PHIEN  = ['tokenHash', 'soDienThoai', 'maNV', 'maPH', 'vaiTro', 'coSo',
                       'taoLuc', 'hetHan', 'thuHoiLuc'];
var AUTH_COT_NHATKY = ['thoiGian', 'soDienThoai', 'action', 'ketQua', 'ghiChu'];

var AUTH_VONG_BAM     = 1000;              // số vòng băm
var AUTH_PHIEN_GIO    = 8;                 // token sống 8 giờ
var AUTH_SAI_TOI_DA   = 5;                 // sai 5 lần thì khoá tạm
var AUTH_KHOA_PHUT    = 15;                // khoá tạm 15 phút

/* Action ai cũng gọi được, không cần token */
var AUTH_ACTION_CONG_KHAI = ['dangNhap', 'dangKyTuVan', 'login_hlv', 'login_parent'];

/* LỖ CÒN LẠI, CÓ CHỦ Ý — đóng ở giai đoạn 2.

   Tài khoản phụ huynh vẫn đăng nhập bằng đường cũ (login_parent), vì danh
   sách con của phụ huynh nằm trong bảng cũ mà đường mới chưa đọc được. Phụ
   huynh do đó không có token, nên hai action họ cần phải tạm mở, kể cả khi
   đã bật CHE_DO_TOKEN=bat_buoc — nếu không thì bảng điều khiển phụ huynh
   trắng trơn ngay sau khi deploy.

   Mở hai action này KHÔNG ảnh hưởng dữ liệu nhân sự: lịch dạy, chấm công,
   lương, duyệt đơn đều đã đóng. Chỗ hở là ai biết mã học viên thì đọc được
   nhận xét của em đó — đúng bằng mức hở hôm nay, không tệ hơn.

   Giai đoạn 2 chuyển hồ sơ võ sinh sang bảng VoSinh (có cột maPH) thì
   dangNhap trả được danh sách con, phụ huynh có token, và xoá hẳn mảng này. */
var AUTH_ACTION_TAM_MO = ['listStudentReviews'];

/* Action chỉ admin và HLV trưởng được gọi. Script cũ đã kiểm một phần, đây là
   lớp chặn thứ hai đặt trước, không phụ thuộc code cũ. */
var AUTH_ACTION_CAP_QUAN_LY = ['listPendingApprovals', 'decideLeaveRequest',
  'listPendingAttendance', 'decideAttendance', 'listPayrollBatch', 'decidePayroll',
  'addCommonEvent', 'deleteCommonEvent', 'taoTaiKhoan', 'datLaiMatKhau',
  'doiVaiTro', 'khoaTaiKhoan', 'danhSachTaiKhoan', 'listDangKyTuVan',
  'capNhatTrangThaiDangKy'];

/* Tài khoản phụ huynh/học viên CHỈ được gọi mấy việc này — danh sách trắng,
   thêm action mới cũng không tự động mở cho họ. */
var AUTH_ACTION_CHO_PHU_HUYNH = ['kiemTraPhien', 'dangXuat', 'doiMatKhau',
  'listStudentReviews', 'updateProfile'];

/* ---------- Sheet ---------- */
function auth_ss_() {
  var id = PropertiesService.getScriptProperties().getProperty('ID_SHEET_TAIKHOAN')
           || AUTH_ID_SHEET_MAC_DINH;
  return SpreadsheetApp.openById(id);
}

function auth_sheet_(ten, cot) {
  var ss = auth_ss_();
  var sh = ss.getSheetByName(ten);
  if (!sh) {
    sh = ss.insertSheet(ten);
    sh.getRange(1, 1, 1, cot.length).setValues([cot]).setFontWeight('bold');
    sh.setFrozenRows(1);
    return sh;
  }
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, cot.length).setValues([cot]).setFontWeight('bold');
    sh.setFrozenRows(1);
    return sh;
  }
  // Bổ sung cột còn thiếu, không đụng vào dữ liệu đã có
  var dangCo = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  for (var i = 0; i < cot.length; i++) {
    if (dangCo.indexOf(cot[i]) === -1) {
      sh.getRange(1, dangCo.length + 1).setValue(cot[i]).setFontWeight('bold');
      dangCo.push(cot[i]);
    }
  }
  return sh;
}

function auth_map_(sh) {
  var h = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var m = {};
  for (var i = 0; i < h.length; i++) m[String(h[i])] = i;
  return m;
}

function auth_them_(ten, cot, obj) {
  var sh = auth_sheet_(ten, cot);
  var m = auth_map_(sh);
  var dong = new Array(sh.getLastColumn()).fill('');
  for (var k in obj) if (m[k] !== undefined) dong[m[k]] = obj[k];
  sh.appendRow(dong);
  return sh.getLastRow();
}

/* ---------- Băm mật khẩu ---------- */
function auth_hex_(bytes) {
  var s = '';
  for (var i = 0; i < bytes.length; i++) {
    var x = (bytes[i] < 0 ? bytes[i] + 256 : bytes[i]).toString(16);
    s += x.length === 1 ? '0' + x : x;
  }
  return s;
}

function auth_sha256_(s) {
  return auth_hex_(Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8));
}

/** Băm nhiều vòng: mỗi vòng băm lại kết quả vòng trước cộng muối. */
function auth_bamNhieuVong_(matKhau, muoi, vong) {
  var h = auth_sha256_(muoi + '|' + matKhau);
  for (var i = 1; i < vong; i++) h = auth_sha256_(h + muoi);
  return h;
}

function auth_taoChuoiBam_(matKhau) {
  var muoi = auth_sha256_(Utilities.getUuid() + Utilities.getUuid()).substring(0, 24);
  return 'sha256$' + AUTH_VONG_BAM + '$' + muoi + '$' +
         auth_bamNhieuVong_(matKhau, muoi, AUTH_VONG_BAM);
}

function auth_kiemChuoiBam_(matKhau, luuTru) {
  var p = String(luuTru || '').split('$');
  if (p.length !== 4 || p[0] !== 'sha256') return false;
  var vong = parseInt(p[1], 10) || AUTH_VONG_BAM;
  // So sánh hết chuỗi rồi mới trả kết quả, không thoát sớm ở ký tự đầu lệch
  var tinh = auth_bamNhieuVong_(matKhau, p[2], vong);
  if (tinh.length !== p[3].length) return false;
  var lech = 0;
  for (var i = 0; i < tinh.length; i++) lech |= (tinh.charCodeAt(i) ^ p[3].charCodeAt(i));
  return lech === 0;
}

/* ---------- Tài khoản ---------- */
function auth_chuanSdt_(s) {
  return String(s || '').replace(/\D/g, '').replace(/^84/, '0');
}

function auth_timTaiKhoan_(sdt) {
  var sh = auth_sheet_(AUTH_SHEET_TK, AUTH_COT_TK);
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return null;
  var m = auth_map_(sh);
  var vals = sh.getRange(2, 1, lastRow - 1, sh.getLastColumn()).getValues();
  for (var i = 0; i < vals.length; i++) {
    if (auth_chuanSdt_(vals[i][m['soDienThoai']]) === sdt) {
      var o = {};
      for (var k in m) o[k] = vals[i][m[k]];
      o._row = i + 2;
      o._map = m;
      o._sheet = sh;
      return o;
    }
  }
  return null;
}

function auth_capNhat_(tk, patch) {
  for (var k in patch) {
    if (tk._map[k] === undefined) continue;
    tk._sheet.getRange(tk._row, tk._map[k] + 1).setValue(patch[k]);
    tk[k] = patch[k];
  }
}

function auth_nhatKy_(sdt, action, ketQua, ghiChu) {
  try {
    auth_them_(AUTH_SHEET_NHATKY, AUTH_COT_NHATKY, {
      thoiGian: new Date(), soDienThoai: sdt || '', action: action || '',
      ketQua: ketQua || '', ghiChu: ghiChu || ''
    });
  } catch (err) { /* ghi nhật ký lỗi thì không được làm hỏng việc chính */ }
}

/* ---------- Phiên đăng nhập ---------- */
function auth_taoPhien_(tk) {
  var token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  var hetHan = new Date(Date.now() + AUTH_PHIEN_GIO * 3600 * 1000);
  var payload = {
    sdt: auth_chuanSdt_(tk.soDienThoai),
    maNV: String(tk.maNV || ''), maPH: String(tk.maPH || ''),
    vaiTro: String(tk.vaiTro || ''), coSo: String(tk.coSo || ''),
    hetHan: hetHan.getTime()
  };
  var tokenHash = auth_sha256_(token);
  CacheService.getScriptCache().put('phien_' + tokenHash, JSON.stringify(payload),
                                    AUTH_PHIEN_GIO * 3600);
  auth_them_(AUTH_SHEET_PHIEN, AUTH_COT_PHIEN, {
    tokenHash: tokenHash, soDienThoai: payload.sdt, maNV: payload.maNV, maPH: payload.maPH,
    vaiTro: payload.vaiTro, coSo: payload.coSo, taoLuc: new Date(), hetHan: hetHan, thuHoiLuc: ''
  });
  return { token: token, hetHan: hetHan };
}

function auth_docPhien_(token) {
  if (!token) return null;
  var tokenHash = auth_sha256_(String(token));
  var cache = CacheService.getScriptCache();
  var raw = cache.get('phien_' + tokenHash);
  if (raw) {
    var p = JSON.parse(raw);
    return p.hetHan > Date.now() ? p : null;
  }
  // Cache hết hạn sớm hơn phiên (VD script vừa deploy lại) thì tra Sheet
  var sh = auth_sheet_(AUTH_SHEET_PHIEN, AUTH_COT_PHIEN);
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return null;
  var m = auth_map_(sh);
  var vals = sh.getRange(2, 1, lastRow - 1, sh.getLastColumn()).getValues();
  for (var i = vals.length - 1; i >= 0; i--) {
    if (String(vals[i][m['tokenHash']]) !== tokenHash) continue;
    if (String(vals[i][m['thuHoiLuc']]).trim()) return null;
    var hh = vals[i][m['hetHan']];
    var hetHan = (hh instanceof Date) ? hh.getTime() : new Date(String(hh)).getTime();
    if (!(hetHan > Date.now())) return null;
    var p2 = {
      sdt: String(vals[i][m['soDienThoai']]), maNV: String(vals[i][m['maNV']]),
      maPH: String(vals[i][m['maPH']]), vaiTro: String(vals[i][m['vaiTro']]),
      coSo: String(vals[i][m['coSo']]), hetHan: hetHan
    };
    cache.put('phien_' + tokenHash, JSON.stringify(p2),
              Math.min(AUTH_PHIEN_GIO * 3600, Math.floor((hetHan - Date.now()) / 1000)));
    return p2;
  }
  return null;
}

function auth_thuHoiPhien_(token) {
  var tokenHash = auth_sha256_(String(token || ''));
  CacheService.getScriptCache().remove('phien_' + tokenHash);
  var sh = auth_sheet_(AUTH_SHEET_PHIEN, AUTH_COT_PHIEN);
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return;
  var m = auth_map_(sh);
  var vals = sh.getRange(2, m['tokenHash'] + 1, lastRow - 1, 1).getValues();
  for (var i = vals.length - 1; i >= 0; i--) {
    if (String(vals[i][0]) === tokenHash) {
      sh.getRange(i + 2, m['thuHoiLuc'] + 1).setValue(new Date());
      return;
    }
  }
}

/* ---------- Trả kết quả ---------- */
function auth_ok_(data) {
  var out = { status: 'success' };
  for (var k in data) out[k] = data[k];
  return out;
}
function auth_fail_(message, code) {
  return { status: 'error', message: message, code: code || '' };
}

/** Đóng gói kết quả thành phản hồi JSON — dùng trong doPost. */
function traJson_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
                       .setMimeType(ContentService.MimeType.JSON);
}

/* =============================================================
   CỔNG BẢO VỆ — gọi ở dòng đầu doPost, TRƯỚC mọi bộ định tuyến.
   Trả null = cho đi tiếp. Trả object = chặn, doPost trả luôn object đó.
   ============================================================= */
function xacThuc_(e) {
  var p = (e && e.parameter) ? e.parameter : {};
  var action = String(p.action || '');
  if (!action) return null;
  if (AUTH_ACTION_CONG_KHAI.indexOf(action) !== -1) return null;
  if (AUTH_ACTION_TAM_MO.indexOf(action) !== -1 && !p.token) return null;

  var batBuoc = String(PropertiesService.getScriptProperties()
                       .getProperty('CHE_DO_TOKEN') || 'canh_bao') === 'bat_buoc';
  var phien = auth_docPhien_(p.token);

  if (!phien) {
    if (!batBuoc) {
      // Giai đoạn chuyển tiếp: vẫn cho đi để trang cũ không sập, nhưng ghi lại
      auth_nhatKy_('', action, 'khong_token', 'CHE_DO_TOKEN=canh_bao nên vẫn cho qua');
      return null;
    }
    return auth_fail_(p.token ? 'Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.'
                              : 'Bạn cần đăng nhập để dùng chức năng này.',
                      p.token ? 'HET_PHIEN' : 'CHUA_DANG_NHAP');
  }

  var vaiTro = String(phien.vaiTro || '').toLowerCase();
  var laPhuHuynh = vaiTro.indexOf('phu_huynh') !== -1 || vaiTro.indexOf('phụ huynh') !== -1;
  var laQuanLy = vaiTro.indexOf('admin') !== -1 || vaiTro.indexOf('quản trị') !== -1 ||
                 vaiTro.indexOf('quan tri') !== -1 || vaiTro.indexOf('trưởng') !== -1 ||
                 vaiTro.indexOf('truong') !== -1;

  if (laPhuHuynh && AUTH_ACTION_CHO_PHU_HUYNH.indexOf(action) === -1) {
    auth_nhatKy_(phien.sdt, action, 'tu_choi', 'Tài khoản phụ huynh gọi action nội bộ');
    return auth_fail_('Tài khoản của bạn không dùng được chức năng này.', 'KHONG_DU_QUYEN');
  }
  if (AUTH_ACTION_CAP_QUAN_LY.indexOf(action) !== -1 && !laQuanLy) {
    auth_nhatKy_(phien.sdt, action, 'tu_choi', 'Thiếu quyền quản lý');
    return auth_fail_('Bạn không có quyền thực hiện việc này.', 'KHONG_DU_QUYEN');
  }

  /* Ghi đè danh tính: từ đây code cũ đọc p.maNV là đọc người thật, không phải
     chuỗi do trình duyệt gửi lên. Đây là chỗ bịt lỗ tự phong vai trò. */
  p.maNV = phien.maNV;
  p.maPH = phien.maPH;
  p._vaiTro = phien.vaiTro;
  p._coSo = phien.coSo;
  p._sdt = phien.sdt;
  return null;
}

/* =============================================================
   BỘ ĐỊNH TUYẾN CÁC ACTION VỀ TÀI KHOẢN
   ============================================================= */
function routeAuthActions_(e) {
  var p = (e && e.parameter) ? e.parameter : {};
  switch (String(p.action || '')) {
    case 'dangNhap':        return authDangNhap_(p);
    case 'dangXuat':        return authDangXuat_(p);
    case 'kiemTraPhien':    return authKiemTraPhien_(p);
    case 'doiMatKhau':      return authDoiMatKhau_(p);
    case 'taoTaiKhoan':     return authTaoTaiKhoan_(p);
    case 'datLaiMatKhau':   return authDatLaiMatKhau_(p);
    case 'doiVaiTro':       return authDoiVaiTro_(p);
    case 'khoaTaiKhoan':    return authKhoaTaiKhoan_(p);
    case 'danhSachTaiKhoan':return authDanhSachTaiKhoan_(p);
    default: return null;
  }
}

function auth_hoSo_(tk) {
  return {
    maNV: String(tk.maNV || ''), maPH: String(tk.maPH || ''),
    hoTen: String(tk.hoTen || ''), soDienThoai: auth_chuanSdt_(tk.soDienThoai),
    email: String(tk.email || ''), role: String(tk.vaiTro || ''),
    vaiTro: String(tk.vaiTro || ''), coSo: String(tk.coSo || ''),
    capDai: String(tk.capDai || ''),
    phaiDoiMatKhau: String(tk.phaiDoiMatKhau) === 'true' || tk.phaiDoiMatKhau === true
  };
}

function authDangNhap_(p) {
  var sdt = auth_chuanSdt_(p.phone || p.soDienThoai);
  var matKhau = String(p.password || p.matKhau || '');
  if (!sdt || !matKhau) return auth_fail_('Nhập số điện thoại và mật khẩu.');

  var tk = auth_timTaiKhoan_(sdt);
  // Cùng một câu trả lời cho "không có số này" và "sai mật khẩu", để người
  // ngoài không dò được số nào đang có tài khoản
  var LOI_CHUNG = 'Số điện thoại hoặc mật khẩu không đúng.';
  if (!tk) { auth_nhatKy_(sdt, 'dangNhap', 'that_bai', 'Không có tài khoản'); return auth_fail_(LOI_CHUNG, 'SAI_THONG_TIN'); }

  if (String(tk.trangThai || '').toLowerCase().indexOf('khoá') !== -1 ||
      String(tk.trangThai || '').toLowerCase().indexOf('khoa') !== -1) {
    auth_nhatKy_(sdt, 'dangNhap', 'that_bai', 'Tài khoản bị khoá');
    return auth_fail_('Tài khoản đang bị khoá. Liên hệ quản trị viên.', 'TAI_KHOAN_KHOA');
  }

  var khoaDen = tk.khoaDenLuc instanceof Date ? tk.khoaDenLuc.getTime()
              : (String(tk.khoaDenLuc).trim() ? new Date(String(tk.khoaDenLuc)).getTime() : 0);
  if (khoaDen && khoaDen > Date.now()) {
    var phut = Math.ceil((khoaDen - Date.now()) / 60000);
    auth_nhatKy_(sdt, 'dangNhap', 'that_bai', 'Đang khoá tạm');
    return auth_fail_('Sai mật khẩu quá nhiều lần. Thử lại sau ' + phut + ' phút.', 'KHOA_TAM');
  }

  if (!auth_kiemChuoiBam_(matKhau, tk.matKhau)) {
    var sai = (parseInt(tk.soLanSai, 10) || 0) + 1;
    var patch = { soLanSai: sai };
    if (sai >= AUTH_SAI_TOI_DA) {
      patch.khoaDenLuc = new Date(Date.now() + AUTH_KHOA_PHUT * 60000);
      patch.soLanSai = 0;
    }
    auth_capNhat_(tk, patch);
    auth_nhatKy_(sdt, 'dangNhap', 'that_bai', 'Sai mật khẩu lần ' + sai);
    return auth_fail_(LOI_CHUNG, 'SAI_THONG_TIN');
  }

  auth_capNhat_(tk, { soLanSai: 0, khoaDenLuc: '', lanDangNhapCuoi: new Date() });
  var phien = auth_taoPhien_(tk);
  auth_nhatKy_(sdt, 'dangNhap', 'thanh_cong', '');
  return auth_ok_({ token: phien.token, hetHan: phien.hetHan.toISOString(), user: auth_hoSo_(tk) });
}

function authDangXuat_(p) {
  if (p.token) auth_thuHoiPhien_(p.token);
  return auth_ok_({});
}

function authKiemTraPhien_(p) {
  var phien = auth_docPhien_(p.token);
  if (!phien) return auth_fail_('Phiên đã hết.', 'HET_PHIEN');
  var tk = auth_timTaiKhoan_(phien.sdt);
  return tk ? auth_ok_({ user: auth_hoSo_(tk) }) : auth_fail_('Không tìm thấy tài khoản.', 'SAI_THONG_TIN');
}

/** Mật khẩu mới: từ 6 ký tự, có chữ hoa và chữ số — đúng luật app đang kiểm. */
function auth_matKhauHopLe_(s) {
  return String(s).length >= 6 && /[A-Z]/.test(s) && /\d/.test(s) && /^[A-Za-z0-9]+$/.test(s);
}

function authDoiMatKhau_(p) {
  var phien = auth_docPhien_(p.token);
  if (!phien) return auth_fail_('Bạn cần đăng nhập.', 'CHUA_DANG_NHAP');
  var tk = auth_timTaiKhoan_(phien.sdt);
  if (!tk) return auth_fail_('Không tìm thấy tài khoản.');

  var cu = String(p.matKhauCu || p.oldPassword || '');
  var moi = String(p.matKhauMoi || p.newPassword || '');
  if (!auth_kiemChuoiBam_(cu, tk.matKhau)) {
    auth_nhatKy_(phien.sdt, 'doiMatKhau', 'that_bai', 'Mật khẩu cũ không đúng');
    return auth_fail_('Mật khẩu hiện tại không đúng.', 'SAI_THONG_TIN');
  }
  if (!auth_matKhauHopLe_(moi)) {
    return auth_fail_('Mật khẩu mới phải từ 6 ký tự, chỉ gồm chữ và số, có ít nhất 1 chữ hoa và 1 chữ số.');
  }
  if (auth_kiemChuoiBam_(moi, tk.matKhau)) {
    return auth_fail_('Mật khẩu mới phải khác mật khẩu đang dùng.');
  }

  auth_capNhat_(tk, { matKhau: auth_taoChuoiBam_(moi), phaiDoiMatKhau: false });
  auth_nhatKy_(phien.sdt, 'doiMatKhau', 'thanh_cong', '');
  return auth_ok_({});
}

/* ---------- Việc của admin ---------- */
function authTaoTaiKhoan_(p) {
  var sdt = auth_chuanSdt_(p.soDienThoai);
  if (!/^0(3|5|7|8|9)\d{8}$/.test(sdt)) return auth_fail_('Số điện thoại không hợp lệ.');
  if (auth_timTaiKhoan_(sdt)) return auth_fail_('Số điện thoại này đã có tài khoản.', 'DA_TON_TAI');

  var hoTen = String(p.hoTen || '').trim();
  if (hoTen.length < 2) return auth_fail_('Nhập họ tên.');
  var vaiTro = String(p.vaiTro || 'hlv').trim();
  var matKhauTam = String(p.matKhauTam || '').trim() || auth_matKhauTamNgauNhien_();

  auth_them_(AUTH_SHEET_TK, AUTH_COT_TK, {
    id: Utilities.getUuid(), maNV: String(p.maNV || ''), maPH: String(p.maPH || ''),
    hoTen: hoTen, soDienThoai: sdt, email: String(p.email || ''),
    vaiTro: vaiTro, coSo: String(p.coSo || ''), capDai: String(p.capDai || ''),
    matKhau: auth_taoChuoiBam_(matKhauTam), phaiDoiMatKhau: true,
    trangThai: 'Hoạt động', soLanSai: 0, khoaDenLuc: '', ngayTao: new Date(), lanDangNhapCuoi: ''
  });
  auth_nhatKy_(sdt, 'taoTaiKhoan', 'thanh_cong', 'vaiTro=' + vaiTro);
  // Mật khẩu tạm trả về đúng một lần này để admin đưa cho người dùng
  return auth_ok_({ soDienThoai: sdt, matKhauTam: matKhauTam });
}

function auth_matKhauTamNgauNhien_() {
  var chuHoa = 'ABCDEFGHJKLMNPQRSTUVWXYZ', chuThuong = 'abcdefghijkmnpqrstuvwxyz', so = '23456789';
  var s = chuHoa.charAt(Math.floor(Math.random() * chuHoa.length)) +
          so.charAt(Math.floor(Math.random() * so.length));
  for (var i = 0; i < 6; i++) {
    var nguon = (i % 3 === 0) ? so : chuThuong;
    s += nguon.charAt(Math.floor(Math.random() * nguon.length));
  }
  return s;
}

function authDatLaiMatKhau_(p) {
  var sdt = auth_chuanSdt_(p.soDienThoai);
  var tk = auth_timTaiKhoan_(sdt);
  if (!tk) return auth_fail_('Không tìm thấy tài khoản.');
  var matKhauTam = String(p.matKhauTam || '').trim() || auth_matKhauTamNgauNhien_();
  auth_capNhat_(tk, { matKhau: auth_taoChuoiBam_(matKhauTam), phaiDoiMatKhau: true,
                      soLanSai: 0, khoaDenLuc: '' });
  auth_nhatKy_(sdt, 'datLaiMatKhau', 'thanh_cong', 'do ' + (p._sdt || '?') + ' thực hiện');
  return auth_ok_({ soDienThoai: sdt, matKhauTam: matKhauTam });
}

function authDoiVaiTro_(p) {
  var tk = auth_timTaiKhoan_(auth_chuanSdt_(p.soDienThoai));
  if (!tk) return auth_fail_('Không tìm thấy tài khoản.');
  var vaiTro = String(p.vaiTro || '').trim();
  if (!vaiTro) return auth_fail_('Thiếu vai trò.');
  auth_capNhat_(tk, { vaiTro: vaiTro, coSo: (p.coSo !== undefined ? String(p.coSo) : tk.coSo) });
  auth_nhatKy_(tk.soDienThoai, 'doiVaiTro', 'thanh_cong', vaiTro);
  return auth_ok_({ soDienThoai: auth_chuanSdt_(tk.soDienThoai), vaiTro: vaiTro });
}

function authKhoaTaiKhoan_(p) {
  var tk = auth_timTaiKhoan_(auth_chuanSdt_(p.soDienThoai));
  if (!tk) return auth_fail_('Không tìm thấy tài khoản.');
  var khoa = String(p.khoa || 'true') !== 'false';
  auth_capNhat_(tk, { trangThai: khoa ? 'Khoá' : 'Hoạt động' });
  auth_nhatKy_(tk.soDienThoai, 'khoaTaiKhoan', 'thanh_cong', khoa ? 'khoá' : 'mở');
  return auth_ok_({ soDienThoai: auth_chuanSdt_(tk.soDienThoai), trangThai: khoa ? 'Khoá' : 'Hoạt động' });
}

function authDanhSachTaiKhoan_(p) {
  var sh = auth_sheet_(AUTH_SHEET_TK, AUTH_COT_TK);
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return auth_ok_({ items: [], total: 0 });
  var m = auth_map_(sh);
  var vals = sh.getRange(2, 1, lastRow - 1, sh.getLastColumn()).getValues();
  var loc = String(p.coSo || '');
  var out = [];
  for (var i = 0; i < vals.length; i++) {
    if (loc && String(vals[i][m['coSo']]) !== loc) continue;
    out.push({
      maNV: String(vals[i][m['maNV']]), hoTen: String(vals[i][m['hoTen']]),
      soDienThoai: auth_chuanSdt_(vals[i][m['soDienThoai']]),
      email: String(vals[i][m['email']]), vaiTro: String(vals[i][m['vaiTro']]),
      coSo: String(vals[i][m['coSo']]), trangThai: String(vals[i][m['trangThai']]),
      lanDangNhapCuoi: String(vals[i][m['lanDangNhapCuoi']] || '')
      // KHÔNG bao giờ trả cột matKhau ra ngoài
    });
  }
  return auth_ok_({ items: out, total: out.length });
}

/* =============================================================
   CHẠY TAY MỘT LẦN — dựng bảng, chuyển tài khoản cũ sang, tạo admin tổng
   ============================================================= */
function khoiTaoBangTaiKhoan() {
  auth_sheet_(AUTH_SHEET_TK, AUTH_COT_TK);
  auth_sheet_(AUTH_SHEET_PHIEN, AUTH_COT_PHIEN);
  auth_sheet_(AUTH_SHEET_NHATKY, AUTH_COT_NHATKY);
  Logger.log('Đã dựng 3 sheet trong file tài khoản: ' + auth_ss_().getName());
  Logger.log('  ' + auth_ss_().getUrl());

  var ket = chuyenTaiKhoanCu_();
  Logger.log('Chuyển tài khoản cũ: ' + ket.thongBao);

  /* Admin tổng theo yêu cầu — mật khẩu tạm, bắt đổi ngay lần đăng nhập đầu */
  var SDT_ADMIN = '0934641039';
  var tk = auth_timTaiKhoan_(SDT_ADMIN);
  if (tk) {
    auth_capNhat_(tk, { vaiTro: 'admin', coSo: '', trangThai: 'Hoạt động',
                        matKhau: auth_taoChuoiBam_('admin'), phaiDoiMatKhau: true,
                        soLanSai: 0, khoaDenLuc: '' });
    Logger.log('Admin tổng ' + SDT_ADMIN + ': đã có sẵn, đặt lại mật khẩu tạm "admin".');
  } else {
    auth_them_(AUTH_SHEET_TK, AUTH_COT_TK, {
      id: Utilities.getUuid(), maNV: 'ADMIN', maPH: '', hoTen: 'Quản trị hệ thống',
      soDienThoai: SDT_ADMIN, email: '', vaiTro: 'admin', coSo: '', capDai: '',
      matKhau: auth_taoChuoiBam_('admin'), phaiDoiMatKhau: true, trangThai: 'Hoạt động',
      soLanSai: 0, khoaDenLuc: '', ngayTao: new Date(), lanDangNhapCuoi: ''
    });
    Logger.log('Admin tổng ' + SDT_ADMIN + ': đã tạo, mật khẩu tạm "admin".');
  }
  Logger.log('');
  Logger.log('VIỆC TIẾP THEO:');
  Logger.log('  1. Thêm cổng xacThuc_ vào doPost (xem docs/TRIEN-KHAI.md bước 6).');
  Logger.log('  2. Deploy version mới.');
  Logger.log('  3. Đăng nhập bằng ' + SDT_ADMIN + ' / admin rồi đổi mật khẩu ngay.');
  Logger.log('  4. Khi mọi người đăng nhập được, đặt Script Property CHE_DO_TOKEN = bat_buoc.');
}

/** Chuyển tài khoản từ bảng cũ sang bảng mới. Mật khẩu chữ thô thì băm luôn;
    mật khẩu đã băm kiểu khác thì cấp mật khẩu tạm và in ra để admin phát lại. */
function chuyenTaiKhoanCu_() {
  if (typeof tk_timBang_ !== 'function') {
    return { thongBao: 'chưa có file TaoAdmin.gs (cần hàm dò bảng cũ) nên bỏ qua bước chuyển.' };
  }
  var ds = tk_timBang_();
  if (!ds.length) return { thongBao: 'không tìm thấy bảng tài khoản cũ, bỏ qua.' };

  var b = ds[0];
  var dang = tk_dangMatKhau_(b).dang;
  var lastRow = b.sheet.getLastRow();
  if (lastRow < 2) return { thongBao: 'bảng cũ "' + b.ten + '" chưa có dòng nào.' };

  var vals = b.sheet.getRange(2, 1, lastRow - 1, b.sheet.getLastColumn()).getValues();
  var them = 0, boQua = 0, tamThoi = [];
  for (var i = 0; i < vals.length; i++) {
    var sdt = auth_chuanSdt_(vals[i][b.cot.sdt]);
    if (!/^0\d{9}$/.test(sdt)) { boQua++; continue; }
    if (auth_timTaiKhoan_(sdt)) { boQua++; continue; }

    var matKhauCu = String(vals[i][b.cot.matKhau] || '');
    var chuoiBam, phaiDoi;
    if (dang === 'tho' && matKhauCu) {
      chuoiBam = auth_taoChuoiBam_(matKhauCu);   // giữ nguyên mật khẩu người dùng đang dùng
      phaiDoi = false;
    } else {
      var tam = auth_matKhauTamNgauNhien_();
      chuoiBam = auth_taoChuoiBam_(tam);
      phaiDoi = true;
      tamThoi.push(sdt + ' : ' + tam);
    }

    auth_them_(AUTH_SHEET_TK, AUTH_COT_TK, {
      id: Utilities.getUuid(),
      maNV: b.cot.maNV !== -1 ? String(vals[i][b.cot.maNV] || '') : '',
      maPH: '',
      hoTen: b.cot.hoTen !== -1 ? String(vals[i][b.cot.hoTen] || '') : '',
      soDienThoai: sdt,
      email: b.cot.email !== -1 ? String(vals[i][b.cot.email] || '') : '',
      vaiTro: b.cot.vaiTro !== -1 ? String(vals[i][b.cot.vaiTro] || 'hlv') : 'hlv',
      coSo: b.cot.coSo !== -1 ? String(vals[i][b.cot.coSo] || '') : '',
      capDai: '', matKhau: chuoiBam, phaiDoiMatKhau: phaiDoi,
      trangThai: 'Hoạt động', soLanSai: 0, khoaDenLuc: '',
      ngayTao: new Date(), lanDangNhapCuoi: ''
    });
    them++;
  }

  if (tamThoi.length) {
    Logger.log('  Mật khẩu cũ đã băm nên không chuyển được, các tài khoản sau được cấp');
    Logger.log('  mật khẩu tạm — gửi riêng cho từng người, họ đăng nhập xong phải đổi:');
    for (var t = 0; t < tamThoi.length; t++) Logger.log('    ' + tamThoi[t]);
  }
  return { thongBao: 'thêm ' + them + ', bỏ qua ' + boQua + ' (đã có hoặc số không hợp lệ).' };
}

/** Sau khi xác nhận đăng nhập đường mới chạy tốt: xoá cột mật khẩu ở bảng CŨ
    để không còn bản mật khẩu nào nằm cùng Sheet dữ liệu. */
function xoaMatKhauBangCu() {
  if (typeof tk_timBang_ !== 'function') { Logger.log('Cần file TaoAdmin.gs.'); return; }
  var ds = tk_timBang_();
  if (!ds.length) { Logger.log('Không tìm thấy bảng cũ.'); return; }
  var b = ds[0], lastRow = b.sheet.getLastRow();
  if (lastRow < 2) { Logger.log('Bảng cũ trống.'); return; }
  var soDong = lastRow - 1;
  b.sheet.getRange(2, b.cot.matKhau + 1, soDong, 1).clearContent();
  Logger.log('Đã xoá ' + soDong + ' ô ở cột "' + b.headers[b.cot.matKhau] +
             '" của sheet "' + b.ten + '".');
  Logger.log('Từ giờ đăng nhập chỉ đi qua bảng tài khoản mới.');
}
