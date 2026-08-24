/* =============================================================
   TẠO TÀI KHOẢN ADMIN TỔNG — TaoAdmin.gs
   Dán vào Apps Script như một FILE MỚI, rồi chạy tay 2 hàm bên dưới.
   File này KHÔNG dính vào doPost, không ảnh hưởng gì tới website đang chạy.

   Cách dùng:
     1. Chọn hàm `xemCauTrucTaiKhoan` → ▶ Run → mở Execution log.
        Chỉ ĐỌC, không sửa gì. Nó cho biết tài khoản đang lưu ở sheet nào,
        cột nào là tên đăng nhập / mật khẩu / vai trò, và mật khẩu đang lưu
        dạng gì (chữ thô hay băm).
     2. Nếu bước 1 báo "ĐỦ ĐIỀU KIỆN TẠO", chọn hàm `taoAdminTong` → ▶ Run.
        Xong thì vào website bấm ĐĂNG NHẬP với số 0934641039 / mật khẩu tạm,
        rồi ĐỔI MẬT KHẨU NGAY trong "Sửa thông tin & mật khẩu".

   Vì sao phải dò chứ không ghi thẳng: hệ thống tài khoản hiện tại nằm trong
   phần script cũ, không có trong repo, nên không ai biết chắc tên sheet, tên
   cột và cách lưu mật khẩu. Ghi sai một cột là tài khoản không đăng nhập
   được, hoặc tệ hơn là làm hỏng một dòng tài khoản đang dùng. Hàm dò đọc
   đúng cấu trúc thật của bảng rồi mới ghi theo đúng cấu trúc đó.
   ============================================================= */

var ADMIN_SDT      = '0934641039';
var ADMIN_MAT_KHAU = 'admin';                 // mật khẩu tạm, đổi ngay sau khi đăng nhập
var ADMIN_HO_TEN   = 'Quản trị hệ thống';
var ADMIN_EMAIL    = '';                      // để trống nếu chưa có

/* Tên sheet có khả năng chứa tài khoản, dò lần lượt. Không thấy tên nào
   trong danh sách thì dò tiếp bằng tiêu đề cột của tất cả sheet. */
var TEN_SHEET_TAI_KHOAN = ['NguoiDung', 'NhanVien', 'TaiKhoan', 'Users', 'Account'];

/* ---------- Chuẩn hoá tên cột: bỏ dấu, bỏ khoảng trắng, về chữ thường ---------- */
function tk_chuan_(s) {
  return String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().replace(/[^a-z0-9]/g, '');
}

/* Khớp tuyệt đối, dùng cho tên cột ngắn dễ trùng như 'id' */
function tk_cotDung_(headers, tuKhoa) {
  for (var i = 0; i < headers.length; i++) {
    if (tuKhoa.indexOf(tk_chuan_(headers[i])) !== -1) return i;
  }
  return -1;
}

/* Tìm cột đầu tiên có tên chuẩn hoá khớp một trong các từ khoá */
function tk_cot_(headers, tuKhoa) {
  for (var i = 0; i < headers.length; i++) {
    var h = tk_chuan_(headers[i]);
    for (var j = 0; j < tuKhoa.length; j++) if (h === tuKhoa[j]) return i;
  }
  for (var i2 = 0; i2 < headers.length; i2++) {
    var h2 = tk_chuan_(headers[i2]);
    for (var j2 = 0; j2 < tuKhoa.length; j2++) if (h2.indexOf(tuKhoa[j2]) !== -1) return i2;
  }
  return -1;
}

var TK_SDT      = ['sodienthoai', 'sdt', 'dienthoai', 'phone', 'username', 'tendangnhap', 'taikhoan'];
var TK_MATKHAU  = ['matkhauhash', 'matkhau', 'password', 'pass', 'pwd'];
var TK_MUOI     = ['muoi', 'salt'];
var TK_VAITRO   = ['vaitro', 'role', 'chucvu', 'quyen'];
var TK_HOTEN    = ['hoten', 'tennhanvien', 'fullname', 'name'];
var TK_MANV     = ['manv', 'manhanvien', 'macanbo'];
var TK_ID       = ['id'];
var TK_COSO     = ['coso', 'branch', 'chinhanh'];
var TK_TRANGTHAI= ['trangthai', 'status'];
var TK_EMAIL    = ['email'];
var TK_NGAYTAO  = ['ngaytao', 'createdat'];

/* ---------- Dò bảng tài khoản ---------- */
function tk_timBang_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tatCa = ss.getSheets();

  var ungVien = [];
  for (var i = 0; i < tatCa.length; i++) {
    var sh = tatCa[i];
    if (sh.getLastRow() < 1) continue;
    var headers = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0];
    var cSdt = tk_cot_(headers, TK_SDT);
    var cMk  = tk_cot_(headers, TK_MATKHAU);
    if (cSdt === -1 || cMk === -1) continue;

    var uuTien = TEN_SHEET_TAI_KHOAN.indexOf(sh.getName());
    ungVien.push({
      sheet: sh, ten: sh.getName(), headers: headers,
      uuTien: uuTien === -1 ? 99 : uuTien,
      cot: {
        sdt: cSdt, matKhau: cMk,
        muoi: tk_cot_(headers, TK_MUOI),
        vaiTro: tk_cot_(headers, TK_VAITRO),
        hoTen: tk_cot_(headers, TK_HOTEN),
        maNV: tk_cot_(headers, TK_MANV),
        id: tk_cotDung_(headers, TK_ID),
        coSo: tk_cot_(headers, TK_COSO),
        trangThai: tk_cot_(headers, TK_TRANGTHAI),
        email: tk_cot_(headers, TK_EMAIL),
        ngayTao: tk_cot_(headers, TK_NGAYTAO)
      }
    });
  }
  ungVien.sort(function (a, b) { return a.uuTien - b.uuTien; });
  return ungVien;
}

/* ---------- Đoán cách lưu mật khẩu ---------- */
function tk_dangMatKhau_(bang) {
  var sh = bang.sheet;
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return { dang: 'khong_ro', soMau: 0, ghiChu: 'Bảng chưa có dòng nào để soi.' };

  var soDong = Math.min(30, lastRow - 1);
  var giaTri = sh.getRange(2, bang.cot.matKhau + 1, soDong, 1).getValues();
  var coMuoi = false;
  if (bang.cot.muoi !== -1) {
    var muoi = sh.getRange(2, bang.cot.muoi + 1, soDong, 1).getValues();
    for (var m = 0; m < muoi.length; m++) if (String(muoi[m][0]).trim()) coMuoi = true;
  }

  var n = 0, hex64 = 0, hex32 = 0, base64 = 0, tho = 0;
  for (var i = 0; i < giaTri.length; i++) {
    var v = String(giaTri[i][0]).trim();
    if (!v) continue;
    n++;
    if (/^[0-9a-f]{64}$/i.test(v)) hex64++;
    else if (/^[0-9a-f]{32}$/i.test(v)) hex32++;
    else if (/^[A-Za-z0-9+/]{40,}={0,2}$/.test(v)) base64++;
    else tho++;
  }
  if (!n) return { dang: 'khong_ro', soMau: 0, ghiChu: 'Cột mật khẩu đang trống hết.' };
  if (tho === n)            return { dang: 'tho',    soMau: n, coMuoi: coMuoi };
  if (hex64 === n)          return { dang: 'sha256', soMau: n, coMuoi: coMuoi };
  if (hex32 === n)          return { dang: 'md5',    soMau: n, coMuoi: coMuoi };
  if (base64 === n)         return { dang: 'base64', soMau: n, coMuoi: coMuoi };
  return { dang: 'lan_lon', soMau: n, coMuoi: coMuoi,
           ghiChu: 'Cột mật khẩu đang trộn nhiều dạng: ' + tho + ' thô, ' + hex64 + ' hex64, ' +
                   hex32 + ' hex32, ' + base64 + ' base64.' };
}

function tk_sha256_(s) {
  var b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8);
  var out = '';
  for (var i = 0; i < b.length; i++) {
    var x = (b[i] < 0 ? b[i] + 256 : b[i]).toString(16);
    out += x.length === 1 ? '0' + x : x;
  }
  return out;
}

/* ---------- Giá trị vai trò admin đúng như bảng đang ghi ---------- */
function tk_giaTriAdmin_(bang) {
  if (bang.cot.vaiTro === -1) return null;
  var lastRow = bang.sheet.getLastRow();
  if (lastRow < 2) return 'admin';
  var vals = bang.sheet.getRange(2, bang.cot.vaiTro + 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < vals.length; i++) {
    var v = String(vals[i][0]).trim();
    var c = tk_chuan_(v);
    // Khớp cả 'admin' lẫn 'Quản trị viên' — dùng lại đúng chữ bảng đang dùng
    if (c.indexOf('admin') !== -1 || c.indexOf('quantri') !== -1) return v;
  }
  return 'admin';
}

/* ---------- Sinh mã nhân viên kế tiếp theo đúng nếp của bảng ---------- */
function tk_maNVKeTiep_(bang) {
  if (bang.cot.maNV === -1) return '';
  var lastRow = bang.sheet.getLastRow();
  if (lastRow < 2) return 'TKD01';
  var vals = bang.sheet.getRange(2, bang.cot.maNV + 1, lastRow - 1, 1).getValues();
  var tienTo = '', doDaiSo = 2, max = 0, thay = false;
  for (var i = 0; i < vals.length; i++) {
    var m = String(vals[i][0]).trim().match(/^([A-Za-z]+)(\d+)$/);
    if (!m) continue;
    thay = true;
    if (!tienTo) { tienTo = m[1]; doDaiSo = m[2].length; }
    if (m[1] === tienTo) max = Math.max(max, parseInt(m[2], 10));
  }
  if (!thay) return 'TKD01';
  var so = String(max + 1);
  while (so.length < doDaiSo) so = '0' + so;
  return tienTo + so;
}

/* =============================================================
   HÀM 1 — CHỈ ĐỌC. Xem cấu trúc bảng tài khoản.
   ============================================================= */
function xemCauTrucTaiKhoan() {
  var ds = tk_timBang_();
  if (!ds.length) {
    Logger.log('KHÔNG TÌM THẤY bảng tài khoản nào (không sheet nào có đủ cột tên đăng nhập + mật khẩu).');
    Logger.log('Các sheet đang có: ' + SpreadsheetApp.getActiveSpreadsheet().getSheets()
      .map(function (s) { return s.getName(); }).join(', '));
    return;
  }

  for (var i = 0; i < ds.length; i++) {
    var b = ds[i];
    Logger.log('--- Sheet "' + b.ten + '" ' + (i === 0 ? '(sẽ dùng bảng này)' : '(dự phòng)') + ' ---');
    Logger.log('  Tiêu đề cột: ' + b.headers.join(' | '));
    Logger.log('  Cột tên đăng nhập: ' + b.headers[b.cot.sdt] +
               '   Cột mật khẩu: ' + b.headers[b.cot.matKhau]);
    Logger.log('  Cột vai trò: ' + (b.cot.vaiTro === -1 ? 'KHÔNG CÓ' : b.headers[b.cot.vaiTro]) +
               '   Cột cơ sở: ' + (b.cot.coSo === -1 ? 'KHÔNG CÓ' : b.headers[b.cot.coSo]));
    Logger.log('  Số dòng dữ liệu: ' + Math.max(0, b.sheet.getLastRow() - 1));

    var mk = tk_dangMatKhau_(b);
    Logger.log('  Mật khẩu đang lưu dạng: ' + mk.dang + ' (soi ' + mk.soMau + ' dòng)' +
               (mk.coMuoi ? ' — CÓ cột muối/salt có dữ liệu' : ''));
    if (mk.ghiChu) Logger.log('  ' + mk.ghiChu);

    if (i > 0) continue;
    if (mk.dang === 'tho') {
      Logger.log('  => ĐỦ ĐIỀU KIỆN TẠO: chạy hàm taoAdminTong.');
    } else if (mk.dang === 'sha256' && !mk.coMuoi) {
      Logger.log('  => ĐỦ ĐIỀU KIỆN TẠO (băm SHA-256 không muối): chạy hàm taoAdminTong.');
      Logger.log('     Lưu ý: nếu script cũ băm theo công thức khác (thêm chuỗi cố định, băm 2 lần...)');
      Logger.log('     thì đăng nhập vẫn trượt. Trượt thì gửi hàm login của script cũ để đối chiếu.');
    } else {
      Logger.log('  => CHƯA TẠO ĐƯỢC TỰ ĐỘNG. Cần biết chính xác công thức mã hoá mật khẩu');
      Logger.log('     của script cũ. Mở file chứa hàm login trong Apps Script, copy đoạn kiểm tra');
      Logger.log('     mật khẩu gửi lại. Đừng tự ghi tay vào cột mật khẩu — sai là không đăng nhập được.');
    }
  }
}

/* =============================================================
   HÀM 2 — CÓ GHI. Tạo (hoặc nâng quyền) tài khoản admin tổng.
   ============================================================= */
function taoAdminTong() {
  var ds = tk_timBang_();
  if (!ds.length) { Logger.log('Không tìm thấy bảng tài khoản. Chạy xemCauTrucTaiKhoan trước.'); return; }

  var b = ds[0];
  var sh = b.sheet;
  var mk = tk_dangMatKhau_(b);

  if (mk.dang !== 'tho' && !(mk.dang === 'sha256' && !mk.coMuoi)) {
    Logger.log('DỪNG LẠI — mật khẩu đang lưu dạng "' + mk.dang + '"' + (mk.coMuoi ? ' kèm muối' : '') + '.');
    Logger.log('Không đoán được công thức nên không ghi gì. Chạy xemCauTrucTaiKhoan để xem hướng dẫn.');
    return;
  }

  var giaTriMatKhau = (mk.dang === 'tho') ? ADMIN_MAT_KHAU : tk_sha256_(ADMIN_MAT_KHAU);
  var vaiTroAdmin = tk_giaTriAdmin_(b);
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    var lastRow = sh.getLastRow();
    var soCot = sh.getLastColumn();

    /* Đã có số này thì nâng quyền + đặt lại mật khẩu, không thêm dòng trùng */
    var dongCu = -1;
    if (lastRow > 1) {
      var sdts = sh.getRange(2, b.cot.sdt + 1, lastRow - 1, 1).getValues();
      for (var i = 0; i < sdts.length; i++) {
        var v = String(sdts[i][0]).replace(/\D/g, '').replace(/^84/, '0');
        if (v === ADMIN_SDT) { dongCu = i + 2; break; }
      }
    }

    var dong = dongCu !== -1
      ? sh.getRange(dongCu, 1, 1, soCot).getValues()[0]
      : new Array(soCot).fill('');

    var dat = function (cot, giaTri, ghiDe) {
      if (cot === -1) return;
      if (!ghiDe && String(dong[cot]).trim()) return;   // giữ dữ liệu cũ nếu đã có
      dong[cot] = giaTri;
    };

    dat(b.cot.sdt,       ADMIN_SDT,      true);
    dat(b.cot.matKhau,   giaTriMatKhau,  true);
    if (b.cot.vaiTro !== -1 && vaiTroAdmin) dat(b.cot.vaiTro, vaiTroAdmin, true);
    dat(b.cot.hoTen,     ADMIN_HO_TEN,   false);
    dat(b.cot.email,     ADMIN_EMAIL,    false);
    dat(b.cot.coSo,      '',             false);        // admin tổng: không gắn cơ sở nào
    dat(b.cot.trangThai, 'Hoạt động',    false);
    dat(b.cot.ngayTao,   new Date(),     false);
    if (b.cot.maNV !== -1 && !String(dong[b.cot.maNV]).trim()) {
      dong[b.cot.maNV] = tk_maNVKeTiep_(b);
    }
    if (b.cot.id !== -1 && !String(dong[b.cot.id]).trim()) {
      dong[b.cot.id] = Utilities.getUuid();
    }
    if (b.cot.muoi !== -1) dong[b.cot.muoi] = '';       // không dùng muối ở dạng đã dò được

    if (dongCu !== -1) {
      sh.getRange(dongCu, 1, 1, soCot).setValues([dong]);
      Logger.log('ĐÃ CẬP NHẬT dòng ' + dongCu + ' trong sheet "' + b.ten + '".');
    } else {
      sh.appendRow(dong);
      Logger.log('ĐÃ THÊM tài khoản vào sheet "' + b.ten + '" (dòng ' + sh.getLastRow() + ').');
    }

    Logger.log('  Tên đăng nhập: ' + ADMIN_SDT);
    Logger.log('  Mật khẩu tạm : ' + ADMIN_MAT_KHAU + '  (lưu dạng ' + mk.dang + ')');
    Logger.log('  Vai trò      : ' + (b.cot.vaiTro === -1 ? '(bảng không có cột vai trò)' : vaiTroAdmin));
    if (b.cot.maNV !== -1) Logger.log('  Mã nhân viên : ' + dong[b.cot.maNV]);
    Logger.log('VIỆC TIẾP: đăng nhập trên website rồi vào "Sửa thông tin & mật khẩu" để đổi mật khẩu ngay.');
    Logger.log('Mật khẩu mới phải từ 6 ký tự, có ít nhất 1 chữ hoa và 1 chữ số — đúng luật app đang kiểm.');
  } finally {
    lock.releaseLock();
  }
}
