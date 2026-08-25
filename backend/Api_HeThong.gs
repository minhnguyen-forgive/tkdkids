/* =============================================================
   API NGHIỆP VỤ + CỬA VÀO doPost — Api_HeThong.gs

   Đây là backend hoàn chỉnh của trung tâm, dựng lại trong project và Sheet
   của riêng trung tâm. Trước đây các chức năng này nằm trong Apps Script do
   người khác tạo; nay cắt hẳn, không còn phụ thuộc gì bên đó.

   File này chứa:
     · doPost / doGet — cửa vào duy nhất của API
     · Lịch dạy, ghi chú lịch, lịch chung
     · Nghỉ phép và duyệt nghỉ phép
     · Chấm công (check-in/out có kiểm GPS + ảnh) và duyệt chấm công
     · Lương tạm tính và duyệt lương
     · Tra cứu võ sinh, nhận xét của HLV
     · Sửa hồ sơ cá nhân

   Phân quyền: cổng xacThuc_ trong Auth.gs chạy trước, tra token ra người
   thật rồi ghi đè p.maNV / p._vaiTro / p._coSo. Mọi hàm dưới đây tin vào ba
   giá trị đó, KHÔNG tin dữ liệu do trình duyệt gửi lên.

   Nhân viên chỉ thấy dữ liệu cơ sở mình; admin (coSo để trống) thấy tất cả.
   ============================================================= */

/* ---------- Cấu trúc các sheet nghiệp vụ ---------- */
var HS_LICHDAY   = ['id','maNV','tuanBatDau','thu','ca','coSo','ngayTao'];
var HS_GHICHU    = ['id','maNV','ngay','loai','noiDung','ngayTao'];
var HS_LICHCHUNG = ['id','ngay','loai','noiDung','coSo','nguoiTao','ngayTao'];
var HS_NGHIPHEP  = ['id','maNV','hoTen','coSo','tuNgay','denNgay','lyDo','trangThai',
                    'nguoiDuyet','lyDoTuChoi','ngayTao','ngayQuyetDinh'];
var HS_DIEMDANH  = ['id','maNV','hoTen','ngay','ca','coSo','maCoSo','soHocVien',
                    'thoiGianCheckin','thoiGianCheckout','lat','lng','latRa','lngRa',
                    'khoangCachCheckinMet','photoUrl','trangThai','nguoiDuyet',
                    'lyDoTuChoi','ngayTao'];
var HS_LUONG     = ['id','maNV','hoTen','coSo','thang','nam','soBuoiDaDuyet','donGia',
                    'tongLuong','trangThai','nguoiDuyet','ngayQuyetDinh'];
var HS_NHANXET   = ['id','maHV','maNV','hoTenNV','thang','nam','noiDung','ngayTao'];

var HS_DON_GIA_MAC_DINH = 100000;      // đồng / buổi, đổi bằng Script Property DON_GIA_BUOI

/* ---------- Cửa vào API ---------- */

function doPost(e) {
  try {
    var chan = xacThuc_(e);                       // cổng bảo vệ trong Auth.gs
    if (chan) return traJson_(chan);

    var kq = routeAuthActions_(e) || routeNewActions_(e) || routeHeThongActions_(e);
    if (!kq) {
      kq = hs_loi_('Action không hợp lệ: ' + String((e.parameter || {}).action || ''));
    }
    return traJson_(kq);
  } catch (err) {
    // Không để lộ vết lỗi kỹ thuật ra ngoài, nhưng vẫn ghi lại để tra
    console.error(err && err.stack ? err.stack : err);
    return traJson_(hs_loi_('Lỗi máy chủ: ' + (err && err.message ? err.message : String(err))));
  }
}

function doGet(e) {
  return traJson_({ status: 'success', message: 'API Taekwondo Kids đang chạy.' });
}

function routeHeThongActions_(e) {
  var p = (e && e.parameter) ? e.parameter : {};
  switch (String(p.action || '')) {
    /* Lịch dạy */
    case 'getSchedule':          return hsGetSchedule_(p);
    case 'registerSchedule':     return hsRegisterSchedule_(p);
    /* Ghi chú lịch cá nhân */
    case 'listCalendarNotes':    return hsListCalendarNotes_(p);
    case 'addCalendarNote':      return hsAddCalendarNote_(p);
    case 'deleteCalendarNote':   return hsDeleteCalendarNote_(p);
    /* Lịch chung */
    case 'listCommonEvents':     return hsListCommonEvents_(p);
    case 'addCommonEvent':       return hsAddCommonEvent_(p);
    case 'deleteCommonEvent':    return hsDeleteCommonEvent_(p);
    /* Nghỉ phép */
    case 'listLeaveRequests':    return hsListLeaveRequests_(p);
    case 'requestLeave':         return hsRequestLeave_(p);
    case 'listPendingApprovals': return hsListPendingApprovals_(p);
    case 'decideLeaveRequest':   return hsDecideLeaveRequest_(p);
    /* Chấm công */
    case 'getTodaySessions':     return hsGetTodaySessions_(p);
    case 'checkIn':              return hsCheckIn_(p);
    case 'checkOut':             return hsCheckOut_(p);
    case 'listPendingAttendance':return hsListPendingAttendance_(p);
    case 'decideAttendance':     return hsDecideAttendance_(p);
    /* Lương */
    case 'getPayrollSummary':    return hsGetPayrollSummary_(p);
    case 'listPayrollBatch':     return hsListPayrollBatch_(p);
    case 'decidePayroll':        return hsDecidePayroll_(p);
    /* Võ sinh và nhận xét */
    case 'lookupStudent':        return hsLookupStudent_(p);
    /* Hồ sơ võ sinh */
    case 'taoVoSinh':            return hsTaoVoSinh_(p);
    case 'danhSachVoSinh':       return hsDanhSachVoSinh_(p);
    case 'anhVoSinh':            return hsAnhVoSinh_(p);
    case 'suaVoSinh':            return hsSuaVoSinh_(p);
    case 'listStudentReviews':   return hsListStudentReviews_(p);
    case 'saveStudentReview':    return hsSaveStudentReview_(p);
    /* Hồ sơ cá nhân */
    case 'updateProfile':        return hsUpdateProfile_(p);
    default: return null;
  }
}

/* ---------- Tiện ích chung ---------- */
function hs_ok_(data) {
  var out = { status: 'success' };
  for (var k in data) out[k] = data[k];
  return out;
}
function hs_loi_(message, code) {
  return { status: 'error', message: message, code: code || '' };
}

/** Bỏ dấu, bỏ dấu gạch/khoảng trắng, về chữ thường: 'Phụ huynh' và
    'phu_huynh' đều thành 'phuhuynh'. Nhờ vậy so vai trò không bị lệch vì
    cách viết. */
function hs_chuan_(s) {
  return String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().replace(/[^a-z0-9]/g, '');
}
function hs_laAdmin_(p) {
  var v = hs_chuan_(p._vaiTro);
  return v.indexOf('admin') !== -1 || v.indexOf('quantri') !== -1;
}
function hs_laQuanLy_(p) {
  return hs_laAdmin_(p) || hs_chuan_(p._vaiTro).indexOf('truong') !== -1;
}
function hs_laPhuHuynh_(p) {
  return hs_chuan_(p._vaiTro).indexOf('phuhuynh') !== -1;
}

/** Phạm vi dữ liệu được xem.
    '' = không giới hạn, chỉ admin mới được.
    Tài khoản không phải admin mà cột coSo để trống thì KHÔNG được coi là
    không giới hạn — trả một giá trị không khớp cơ sở nào, để họ không thấy gì
    thay vì thấy tất cả. Đây là chỗ suýt hở: tài khoản phụ huynh không có cơ sở
    nên nếu để '' là phụ huynh đọc được dữ liệu mọi cơ sở. */
function hs_phamVi_(p) {
  if (hs_laAdmin_(p)) return '';
  return String(p._coSo || '') || '\u0000khong-co-co-so';
}
function hs_trongPhamVi_(p, coSoCuaDong) {
  var pv = hs_phamVi_(p);
  return !pv || String(coSoCuaDong || '') === pv;
}
function hs_soNguyen_(v, macDinh) {
  var n = parseInt(v, 10);
  return isNaN(n) ? macDinh : n;
}

/** Thứ Hai của tuần chứa ngày đó, dạng 'YYYY-MM-DD'. Khớp getMonday() phía web. */
function hs_thuHai_(ngayStr) {
  var d = ngayStr ? new Date(String(ngayStr).substring(0, 10) + 'T00:00:00') : new Date();
  var thu = d.getDay();                       // 0=CN
  var lech = (thu === 0) ? -6 : (1 - thu);
  d.setDate(d.getDate() + lech);
  return Utilities.formatDate(d, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
}

function hs_gioPhut_() {
  return Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'HH:mm');
}

/** Xoá nhiều dòng — xoá từ dưới lên để số dòng phía trên không bị dịch. */
function hs_xoaDong_(tenSheet, dsDong) {
  if (!dsDong.length) return;
  var sh = SHEETS_.ss().getSheetByName(tenSheet);
  if (!sh) return;
  dsDong.sort(function (a, b) { return b - a; });
  for (var i = 0; i < dsDong.length; i++) sh.deleteRow(dsDong[i]);
  SHEETS_.invalidate(tenSheet);
}

/* ═══════════════════ LỊCH DẠY ═══════════════════ */

function hsGetSchedule_(p) {
  var maNV = String(p.maNV || '');
  var rows = SHEETS_.readAll('LichDay', function (r) { return hs_trongPhamVi_(p, r.coSo); });
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    out.push({
      maNV: String(rows[i].maNV || ''),
      thu: hs_soNguyen_(rows[i].thu, 0),
      ca: String(rows[i].ca || ''),
      coSo: String(rows[i].coSo || ''),
      tuanBatDau: SHEETS_.toDateStr(rows[i].tuanBatDau),
      isMine: String(rows[i].maNV || '') === maNV
    });
  }
  return hs_ok_({ schedule: out });
}

function hsRegisterSchedule_(p) {
  var maNV = String(p.maNV || '');
  if (!maNV) return hs_loi_('Không xác định được nhân viên.');

  var tuan = hs_thuHai_(p.tuanBatDau);
  var slots;
  try {
    slots = JSON.parse(p.slots || '[]');
  } catch (err) { return hs_loi_('Danh sách ca dạy không đọc được.'); }
  if (!slots.length) return hs_loi_('Chưa chọn ca dạy nào.');

  var hopLe = {};
  for (var i = 0; i < slots.length; i++) {
    var thu = hs_soNguyen_(slots[i].thu, -1);
    var ca = String(slots[i].ca || '');
    var coSo = String(slots[i].coSo || '');
    if (thu < 0 || thu > 6 || !ca || !coSo) return hs_loi_('Ca dạy thứ ' + (i + 1) + ' thiếu thông tin.');
    // Một người không thể dạy hai cơ sở cùng một ca
    var khoa = thu + '|' + ca;
    if (hopLe[khoa]) return hs_loi_('Trùng lịch: cùng một ca bạn chọn hai cơ sở.');
    hopLe[khoa] = true;
  }

  return SHEETS_.withLock(function () {
    var cu = SHEETS_.readAll('LichDay', function (r) {
      return String(r.maNV) === maNV && SHEETS_.toDateStr(r.tuanBatDau) === tuan;
    });
    hs_xoaDong_('LichDay', cu.map(function (r) { return r._row; }));

    for (var j = 0; j < slots.length; j++) {
      SHEETS_.appendRow('LichDay', HS_LICHDAY, {
        id: SHEETS_.newId(), maNV: maNV, tuanBatDau: tuan,
        thu: hs_soNguyen_(slots[j].thu, 0), ca: String(slots[j].ca),
        coSo: String(slots[j].coSo), ngayTao: SHEETS_.now()
      });
    }
    return hs_ok_({ soCa: slots.length, tuanBatDau: tuan });
  });
}

/* ═══════════════════ GHI CHÚ LỊCH CÁ NHÂN ═══════════════════ */

function hsListCalendarNotes_(p) {
  var maNV = String(p.maNV || '');
  var rows = SHEETS_.readAll('GhiChuLich', function (r) { return String(r.maNV) === maNV; });
  var out = rows.map(function (r) {
    return { id: String(r.id), ngay: SHEETS_.toDateStr(r.ngay),
             loai: String(r.loai || 'working'), noiDung: String(r.noiDung || '') };
  });
  return hs_ok_({ notes: out });
}

function hsAddCalendarNote_(p) {
  var maNV = String(p.maNV || '');
  var ngay = String(p.ngay || '').substring(0, 10);
  var noiDung = String(p.noiDung || '').trim();
  if (!ngay) return hs_loi_('Thiếu ngày.');
  if (!noiDung) return hs_loi_('Thiếu nội dung ghi chú.');

  var id = String(p.id || '');
  if (id) {
    var cu = SHEETS_.findRow('GhiChuLich', 'id', id);
    if (cu && String(cu.maNV) === maNV) {
      SHEETS_.updateRow('GhiChuLich', cu._row, {
        ngay: ngay, loai: String(p.loai || 'working'), noiDung: noiDung
      });
      return hs_ok_({ id: id });
    }
    if (cu) return hs_loi_('Ghi chú này không phải của bạn.', 'KHONG_DU_QUYEN');
  }

  var idMoi = SHEETS_.newId();
  SHEETS_.appendRow('GhiChuLich', HS_GHICHU, {
    id: idMoi, maNV: maNV, ngay: ngay, loai: String(p.loai || 'working'),
    noiDung: noiDung, ngayTao: SHEETS_.now()
  });
  return hs_ok_({ id: idMoi });
}

function hsDeleteCalendarNote_(p) {
  var cu = SHEETS_.findRow('GhiChuLich', 'id', String(p.id || ''));
  if (!cu) return hs_loi_('Không tìm thấy ghi chú.');
  if (String(cu.maNV) !== String(p.maNV || '')) {
    return hs_loi_('Ghi chú này không phải của bạn.', 'KHONG_DU_QUYEN');
  }
  hs_xoaDong_('GhiChuLich', [cu._row]);
  return hs_ok_({ id: String(p.id) });
}

/* ═══════════════════ LỊCH CHUNG ═══════════════════ */

function hsListCommonEvents_(p) {
  var pv = hs_phamVi_(p);
  var rows = SHEETS_.readAll('LichChung', function (r) {
    return !pv || String(r.coSo) === 'ALL' || String(r.coSo) === pv;
  });
  var out = rows.map(function (r) {
    return { id: String(r.id), ngay: SHEETS_.toDateStr(r.ngay), loai: String(r.loai || 'working'),
             noiDung: String(r.noiDung || ''), coSo: String(r.coSo || 'ALL'),
             nguoiTao: String(r.nguoiTao || '') };
  });
  return hs_ok_({ events: out });
}

function hsAddCommonEvent_(p) {
  var ngay = String(p.ngay || '').substring(0, 10);
  var noiDung = String(p.noiDung || '').trim();
  if (!ngay || !noiDung) return hs_loi_('Thiếu ngày hoặc nội dung.');

  // Admin đăng cho toàn hệ thống; HLV trưởng chỉ đăng cho cơ sở mình
  var coSo = hs_laAdmin_(p) ? 'ALL' : String(p._coSo || '');
  if (!coSo) return hs_loi_('Tài khoản của bạn chưa gắn cơ sở nào.');

  var id = SHEETS_.newId();
  SHEETS_.appendRow('LichChung', HS_LICHCHUNG, {
    id: id, ngay: ngay, loai: String(p.loai || 'working'), noiDung: noiDung,
    coSo: coSo, nguoiTao: String(p.maNV || ''), ngayTao: SHEETS_.now()
  });
  return hs_ok_({ id: id, coSo: coSo });
}

function hsDeleteCommonEvent_(p) {
  var cu = SHEETS_.findRow('LichChung', 'id', String(p.id || ''));
  if (!cu) return hs_loi_('Không tìm thấy lịch chung.');
  if (!hs_laAdmin_(p) && String(cu.nguoiTao) !== String(p.maNV || '')) {
    return hs_loi_('Chỉ người tạo hoặc admin xoá được lịch này.', 'KHONG_DU_QUYEN');
  }
  hs_xoaDong_('LichChung', [cu._row]);
  return hs_ok_({ id: String(p.id) });
}

/* ═══════════════════ NGHỈ PHÉP ═══════════════════ */

function hs_mapDonNghi_(r) {
  return {
    id: String(r.id), maNV: String(r.maNV || ''), hoTen: String(r.hoTen || ''),
    coSo: String(r.coSo || ''), tuNgay: SHEETS_.toDateStr(r.tuNgay),
    denNgay: SHEETS_.toDateStr(r.denNgay), lyDo: String(r.lyDo || ''),
    trangThai: String(r.trangThai || 'Chờ duyệt'), nguoiDuyet: String(r.nguoiDuyet || ''),
    lyDoTuChoi: String(r.lyDoTuChoi || '')
  };
}

function hsListLeaveRequests_(p) {
  var maNV = String(p.maNV || '');
  var rows = SHEETS_.readAll('NghiPhep', function (r) { return String(r.maNV) === maNV; });
  rows.reverse();                                   // mới nhất lên đầu
  return hs_ok_({ requests: rows.map(hs_mapDonNghi_) });
}

function hsRequestLeave_(p) {
  var tuNgay = String(p.tuNgay || '').substring(0, 10);
  var denNgay = String(p.denNgay || '').substring(0, 10);
  var lyDo = String(p.lyDo || '').trim();
  if (!tuNgay || !denNgay || !lyDo) return hs_loi_('Điền đủ ngày và lý do.');
  if (denNgay < tuNgay) return hs_loi_('Ngày kết thúc phải sau ngày bắt đầu.');

  var id = SHEETS_.newId();
  SHEETS_.appendRow('NghiPhep', HS_NGHIPHEP, {
    id: id, maNV: String(p.maNV || ''),
    // Tên và cơ sở lấy từ tài khoản, không lấy từ trình duyệt gửi lên
    hoTen: hs_hoTenCuaToi_(p), coSo: String(p._coSo || ''),
    tuNgay: tuNgay, denNgay: denNgay, lyDo: lyDo, trangThai: 'Chờ duyệt',
    nguoiDuyet: '', lyDoTuChoi: '', ngayTao: SHEETS_.now(), ngayQuyetDinh: ''
  });
  return hs_ok_({ id: id });
}

function hsListPendingApprovals_(p) {
  var maNV = String(p.maNV || '');
  var rows = SHEETS_.readAll('NghiPhep', function (r) {
    if (String(r.trangThai || 'Chờ duyệt') !== 'Chờ duyệt') return false;
    if (!hs_trongPhamVi_(p, r.coSo)) return false;
    // Không ai tự duyệt đơn của mình, admin cũng vậy
    return String(r.maNV) !== maNV;
  });
  return hs_ok_({ requests: rows.map(hs_mapDonNghi_) });
}

function hsDecideLeaveRequest_(p) {
  var don = SHEETS_.findRow('NghiPhep', 'id', String(p.id || ''));
  if (!don) return hs_loi_('Không tìm thấy đơn nghỉ phép.');
  if (!hs_trongPhamVi_(p, don.coSo)) {
    return hs_loi_('Đơn này thuộc cơ sở khác.', 'KHONG_DU_QUYEN');
  }
  if (String(don.maNV) === String(p.maNV || '')) {
    return hs_loi_('Không tự duyệt đơn của mình được.', 'KHONG_DU_QUYEN');
  }
  var quyetDinh = String(p.quyetDinh || '');
  if (['Đã duyệt', 'Từ chối'].indexOf(quyetDinh) === -1) return hs_loi_('Quyết định không hợp lệ.');

  SHEETS_.updateRow('NghiPhep', don._row, {
    trangThai: quyetDinh, nguoiDuyet: String(p.maNV || ''),
    lyDoTuChoi: String(p.lyDoTuChoi || ''), ngayQuyetDinh: SHEETS_.now()
  });
  return hs_ok_({ id: String(p.id), trangThai: quyetDinh });
}

/* ═══════════════════ CHẤM CÔNG ═══════════════════ */

function hs_sheetDiemDanh_(nam) {
  return SHEETS_.yearly('DiemDanh', nam || new Date().getFullYear());
}

function hs_mapDiemDanh_(r) {
  return {
    id: String(r.id), maNV: String(r.maNV || ''), hoTen: String(r.hoTen || ''),
    ngay: SHEETS_.toDateStr(r.ngay), ca: String(r.ca || ''), coSo: String(r.coSo || ''),
    soHocVien: r.soHocVien === '' ? '' : hs_soNguyen_(r.soHocVien, ''),
    thoiGianCheckin: String(r.thoiGianCheckin || ''),
    thoiGianCheckout: String(r.thoiGianCheckout || ''),
    khoangCachCheckinMet: r.khoangCachCheckinMet === '' ? '' : hs_soNguyen_(r.khoangCachCheckinMet, ''),
    lat: String(r.lat || ''), lng: String(r.lng || ''),
    photoUrl: String(r.photoUrl || ''), trangThai: String(r.trangThai || ''),
    lyDoTuChoi: String(r.lyDoTuChoi || '')
  };
}

function hsGetTodaySessions_(p) {
  var maNV = String(p.maNV || '');
  var homNay = SHEETS_.today();
  var tuan = hs_thuHai_(homNay);
  var thuHomNay = new Date(homNay + 'T00:00:00').getDay();

  var caTheoLich = SHEETS_.readAll('LichDay', function (r) {
    return String(r.maNV) === maNV &&
           SHEETS_.toDateStr(r.tuanBatDau) === tuan &&
           hs_soNguyen_(r.thu, -1) === thuHomNay;
  });

  var daDiemDanh = SHEETS_.readAll(hs_sheetDiemDanh_(), function (r) {
    return String(r.maNV) === maNV && SHEETS_.toDateStr(r.ngay) === homNay;
  });

  var theoKhoa = {};
  for (var i = 0; i < daDiemDanh.length; i++) {
    theoKhoa[String(daDiemDanh[i].coSo) + '|' + String(daDiemDanh[i].ca)] = daDiemDanh[i];
  }

  var out = [];
  for (var j = 0; j < caTheoLich.length; j++) {
    var ca = caTheoLich[j];
    var khoa = String(ca.coSo) + '|' + String(ca.ca);
    var dd = theoKhoa[khoa];
    if (dd) {
      out.push(hs_mapDiemDanh_(dd));
      delete theoKhoa[khoa];
    } else {
      out.push({
        id: 'ca:' + khoa, ngay: homNay, ca: String(ca.ca), coSo: String(ca.coSo),
        soHocVien: '', trangThai: 'Chưa điểm danh',
        thoiGianCheckin: '', thoiGianCheckout: '', khoangCachCheckinMet: ''
      });
    }
  }
  // Buổi đã điểm danh nhưng không còn trong lịch (VD lịch bị sửa) vẫn phải hiện
  for (var k in theoKhoa) out.push(hs_mapDiemDanh_(theoKhoa[k]));

  return hs_ok_({ sessions: out });
}

/** Khoảng cách giữa hai điểm, mét. Công thức haversine. */
function hs_khoangCach_(lat1, lng1, lat2, lng2) {
  var R = 6371000;
  var rad = Math.PI / 180;
  var dLat = (lat2 - lat1) * rad;
  var dLng = (lng2 - lng1) * rad;
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function hs_luuAnhDiemDanh_(base64, maNV, ngay, ca) {
  try {
    var idThuMuc = PropertiesService.getScriptProperties().getProperty('FOLDER_ANH_DIEMDANH');
    if (!idThuMuc || !base64) return '';
    var phan = String(base64).split(',');
    var duLieu = phan.length > 1 ? phan[1] : phan[0];
    var blob = Utilities.newBlob(Utilities.base64Decode(duLieu), 'image/jpeg',
                                 'diemdanh_' + maNV + '_' + ngay + '_ca' + ca + '.jpg');
    var tep = DriveApp.getFolderById(idThuMuc).createFile(blob);
    return tep.getUrl();
  } catch (err) {
    // Không lưu được ảnh thì vẫn cho điểm danh, chỉ là thiếu ảnh xác thực
    console.error('Không lưu được ảnh điểm danh: ' + err);
    return '';
  }
}

function hsCheckIn_(p) {
  var maNV = String(p.maNV || '');
  var coSo = String(p.coSo || '');
  var ca = String(p.ca || '');
  var ngay = String(p.ngay || '').substring(0, 10) || SHEETS_.today();
  if (!maNV || !coSo || !ca) return hs_loi_('Thiếu thông tin ca dạy.');

  /* Kiểm vị trí: phải đứng trong bán kính cho phép của cơ sở. Cơ sở chưa có
     toạ độ thì bỏ qua bước này (chạy layToaDoCacCoSo trong Setup.gs để điền). */
  var cs = SHEETS_.findRow('CoSo', 'id', coSo);
  var khoangCach = '';
  if (cs && cs.lat !== '' && cs.lng !== '' && p.lat && p.lng) {
    khoangCach = hs_khoangCach_(parseFloat(p.lat), parseFloat(p.lng),
                                parseFloat(cs.lat), parseFloat(cs.lng));
    var banKinh = hs_soNguyen_(cs.banKinhChoPhep, 150);
    if (khoangCach > banKinh) {
      return { status: 'error', code: 'GPS_OUT_OF_RANGE',
               message: 'Bạn đang ở quá xa cơ sở để điểm danh.',
               distance: khoangCach, allowed: banKinh };
    }
  }

  return SHEETS_.withLock(function () {
    var trung = SHEETS_.readAll(hs_sheetDiemDanh_(), function (r) {
      return String(r.maNV) === maNV && SHEETS_.toDateStr(r.ngay) === ngay &&
             String(r.ca) === ca && String(r.coSo) === coSo;
    });
    if (trung.length) return hs_loi_('Ca này bạn đã điểm danh rồi.', 'DA_DIEM_DANH');

    var id = SHEETS_.newId();
    SHEETS_.appendRow(hs_sheetDiemDanh_(), HS_DIEMDANH, {
      id: id, maNV: maNV, hoTen: hs_hoTenCuaToi_(p), ngay: ngay, ca: ca, coSo: coSo,
      maCoSo: String(p.maCoSo || (cs ? cs.code : '')),
      soHocVien: hs_soNguyen_(p.soHocVien, 0),
      thoiGianCheckin: hs_gioPhut_(), thoiGianCheckout: '',
      lat: String(p.lat || ''), lng: String(p.lng || ''), latRa: '', lngRa: '',
      khoangCachCheckinMet: khoangCach,
      photoUrl: hs_luuAnhDiemDanh_(p.photoBase64, maNV, ngay, ca),
      trangThai: 'Đang dạy', nguoiDuyet: '', lyDoTuChoi: '', ngayTao: SHEETS_.now()
    });
    return hs_ok_({ id: id });
  });
}

function hsCheckOut_(p) {
  var dd = SHEETS_.findRow(hs_sheetDiemDanh_(), 'id', String(p.id || ''));
  if (!dd) return hs_loi_('Không tìm thấy buổi điểm danh.');
  if (String(dd.maNV) !== String(p.maNV || '')) {
    return hs_loi_('Buổi này không phải của bạn.', 'KHONG_DU_QUYEN');
  }
  if (String(dd.trangThai) !== 'Đang dạy') return hs_loi_('Buổi này không ở trạng thái đang dạy.');

  SHEETS_.updateRow(hs_sheetDiemDanh_(), dd._row, {
    thoiGianCheckout: hs_gioPhut_(),
    latRa: String(p.lat || ''), lngRa: String(p.lng || ''),
    trangThai: 'Chờ duyệt'
  });
  return hs_ok_({ id: String(p.id) });
}

function hsListPendingAttendance_(p) {
  var rows = SHEETS_.readAll(hs_sheetDiemDanh_(), function (r) {
    return String(r.trangThai) === 'Chờ duyệt' && hs_trongPhamVi_(p, r.coSo);
  });
  return hs_ok_({ records: rows.map(hs_mapDiemDanh_) });
}

function hsDecideAttendance_(p) {
  var dd = SHEETS_.findRow(hs_sheetDiemDanh_(), 'id', String(p.id || ''));
  if (!dd) return hs_loi_('Không tìm thấy buổi điểm danh.');
  if (!hs_trongPhamVi_(p, dd.coSo)) return hs_loi_('Buổi này thuộc cơ sở khác.', 'KHONG_DU_QUYEN');

  var quyetDinh = String(p.quyetDinh || '');
  if (['Đã duyệt', 'Điểm danh không hợp lệ'].indexOf(quyetDinh) === -1) {
    return hs_loi_('Quyết định không hợp lệ.');
  }
  if (quyetDinh === 'Điểm danh không hợp lệ' && !String(p.lyDoTuChoi || '').trim()) {
    return hs_loi_('Từ chối thì phải ghi lý do.');
  }

  SHEETS_.updateRow(hs_sheetDiemDanh_(), dd._row, {
    trangThai: quyetDinh, nguoiDuyet: String(p.maNV || ''),
    lyDoTuChoi: String(p.lyDoTuChoi || '')
  });
  return hs_ok_({ id: String(p.id), trangThai: quyetDinh });
}

/* ═══════════════════ LƯƠNG ═══════════════════ */

function hs_donGia_() {
  var v = PropertiesService.getScriptProperties().getProperty('DON_GIA_BUOI');
  return hs_soNguyen_(v, HS_DON_GIA_MAC_DINH);
}

function hs_demBuoiDaDuyet_(maNV, thang, nam) {
  var tienTo = nam + '-' + (thang < 10 ? '0' + thang : String(thang));
  var rows = SHEETS_.readAll(hs_sheetDiemDanh_(nam), function (r) {
    return String(r.maNV) === maNV && String(r.trangThai) === 'Đã duyệt' &&
           SHEETS_.toDateStr(r.ngay).indexOf(tienTo) === 0;
  });
  return rows.length;
}

function hs_bangLuong_(maNV, thang, nam) {
  var rows = SHEETS_.readAll('Luong', function (r) {
    return String(r.maNV) === maNV && hs_soNguyen_(r.thang, 0) === thang &&
           hs_soNguyen_(r.nam, 0) === nam;
  });
  return rows.length ? rows[rows.length - 1] : null;
}

function hsGetPayrollSummary_(p) {
  var maNV = String(p.maNV || '');
  var thang = hs_soNguyen_(p.thang, new Date().getMonth() + 1);
  var nam = hs_soNguyen_(p.nam, new Date().getFullYear());

  var soBuoi = hs_demBuoiDaDuyet_(maNV, thang, nam);
  var donGia = hs_donGia_();
  var daChot = hs_bangLuong_(maNV, thang, nam);

  return hs_ok_({ summary: {
    soBuoiDaDuyet: daChot ? hs_soNguyen_(daChot.soBuoiDaDuyet, soBuoi) : soBuoi,
    donGia: daChot ? hs_soNguyen_(daChot.donGia, donGia) : donGia,
    tongLuong: daChot ? hs_soNguyen_(daChot.tongLuong, soBuoi * donGia) : soBuoi * donGia,
    trangThai: daChot ? String(daChot.trangThai) : (soBuoi ? 'Chờ duyệt' : 'Đang tính')
  }});
}

function hsListPayrollBatch_(p) {
  var thang = hs_soNguyen_(p.thang, new Date().getMonth() + 1);
  var nam = hs_soNguyen_(p.nam, new Date().getFullYear());
  var pv = hs_phamVi_(p);
  var donGia = hs_donGia_();

  var nhanSu = authDanhSachNhanSu_();           // từ Auth.gs — đọc bảng tài khoản
  var out = [];
  for (var i = 0; i < nhanSu.length; i++) {
    var nv = nhanSu[i];
    if (!nv.maNV) continue;
    if (pv && nv.coSo !== pv) continue;
    var soBuoi = hs_demBuoiDaDuyet_(nv.maNV, thang, nam);
    var daChot = hs_bangLuong_(nv.maNV, thang, nam);
    if (!soBuoi && !daChot) continue;           // tháng đó không dạy buổi nào thì bỏ qua
    out.push({
      maNV: nv.maNV, hoTen: nv.hoTen, coSo: nv.coSo,
      soBuoiDaDuyet: daChot ? hs_soNguyen_(daChot.soBuoiDaDuyet, soBuoi) : soBuoi,
      donGia: daChot ? hs_soNguyen_(daChot.donGia, donGia) : donGia,
      tongLuong: daChot ? hs_soNguyen_(daChot.tongLuong, soBuoi * donGia) : soBuoi * donGia,
      trangThai: daChot ? String(daChot.trangThai) : 'Chờ duyệt'
    });
  }
  return hs_ok_({ batch: out });
}

function hsDecidePayroll_(p) {
  var maNV = String(p.maNV || '');
  var thang = hs_soNguyen_(p.thang, 0);
  var nam = hs_soNguyen_(p.nam, 0);
  if (!maNV || !thang || !nam) return hs_loi_('Thiếu nhân viên hoặc tháng.');

  var nhanSu = authTaiKhoanTheoMaNV_(maNV);
  if (!nhanSu) return hs_loi_('Không tìm thấy nhân viên này.');
  if (!hs_trongPhamVi_(p, nhanSu.coSo)) {
    return hs_loi_('Nhân viên này thuộc cơ sở khác.', 'KHONG_DU_QUYEN');
  }
  var soBuoi = hs_demBuoiDaDuyet_(maNV, thang, nam);
  var donGia = hs_donGia_();

  return SHEETS_.withLock(function () {
    var cu = hs_bangLuong_(maNV, thang, nam);
    var patch = {
      soBuoiDaDuyet: soBuoi, donGia: donGia, tongLuong: soBuoi * donGia,
      trangThai: 'Đã duyệt', nguoiDuyet: String(p._maNV || p.nguoiDuyet || ''),
      ngayQuyetDinh: SHEETS_.now()
    };
    if (cu) {
      SHEETS_.updateRow('Luong', cu._row, patch);
      return hs_ok_({ maNV: maNV, thang: thang, nam: nam, tongLuong: patch.tongLuong });
    }
    SHEETS_.appendRow('Luong', HS_LUONG, {
      id: SHEETS_.newId(), maNV: maNV, hoTen: nhanSu.hoTen, coSo: nhanSu.coSo,
      thang: thang, nam: nam, soBuoiDaDuyet: soBuoi, donGia: donGia,
      tongLuong: soBuoi * donGia, trangThai: 'Đã duyệt',
      nguoiDuyet: String(p._maNV || p.nguoiDuyet || ''), ngayQuyetDinh: SHEETS_.now()
    });
    return hs_ok_({ maNV: maNV, thang: thang, nam: nam, tongLuong: soBuoi * donGia });
  });
}

/* ═══════════════════ VÕ SINH & NHẬN XÉT ═══════════════════ */

/** Tuổi tính từ ngày sinh nếu có, không thì từ năm sinh. Lễ tân chỉ nhập
    tuổi, nên năm sinh là thứ được lưu — tuổi tự tăng theo thời gian thay vì
    đứng yên ở con số nhập lúc tạo hồ sơ. */
function hs_tuoi_(r) {
  var ns = SHEETS_.toDateStr(r.ngaySinh);
  var hn = new Date();
  if (ns && ns.length >= 10) {
    var d = new Date(ns.substring(0, 10));
    if (!isNaN(d.getTime())) {
      var t = hn.getFullYear() - d.getFullYear();
      var m = hn.getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && hn.getDate() < d.getDate())) t--;
      return t >= 0 ? t : '';
    }
  }
  var nam = hs_soNguyen_(r.namSinh, 0);
  return nam ? hn.getFullYear() - nam : '';
}

function hs_mapVoSinh_(r) {
  return {
    maHV: String(r.maHV || ''), hoTen: String(r.hoTen || ''),
    student_name: String(r.hoTen || ''),
    ngaySinh: SHEETS_.toDateStr(r.ngaySinh), dob: SHEETS_.toDateStr(r.ngaySinh),
    gioiTinh: String(r.gioiTinh || ''), coSo: String(r.coSo || ''),
    branch: String(r.coSo || ''),
    capDai: String(r.capDaiHienTai || ''), capDaiHienTai: String(r.capDaiHienTai || ''),
    belt_level: String(r.capDaiHienTai || ''),
    soBuoiTuan: r.soBuoiTuan === '' ? '' : hs_soNguyen_(r.soBuoiTuan, ''),
    sessions_per_week: r.soBuoiTuan === '' ? '' : hs_soNguyen_(r.soBuoiTuan, ''),
    maPH: String(r.maPH || ''), anhDaiDien: String(r.anhDaiDien || ''),
    coAnh: !!String(r.anhDaiDien || ''),
    namSinh: hs_soNguyen_(r.namSinh, '') === '' ? '' : hs_soNguyen_(r.namSinh, ''),
    tuoi: hs_tuoi_(r),
    ngayNhapHoc: SHEETS_.toDateStr(r.ngayNhapHoc),
    trangThai: String(r.trangThai || '')
  };
}

/** Danh sách con của một phụ huynh — Auth.gs gọi khi đăng nhập. */
function hs_dsVoSinhTheoPhuHuynh_(maPH) {
  if (!maPH) return [];
  var rows = SHEETS_.readAll('VoSinh', function (r) { return String(r.maPH) === String(maPH); });
  return rows.map(hs_mapVoSinh_);
}

function hsLookupStudent_(p) {
  var maHV = String(p.maHV || '').trim();
  if (!maHV) return hs_loi_('Thiếu mã học viên.');
  var vs = SHEETS_.findRow('VoSinh', 'maHV', maHV);
  if (!vs) return hs_loi_('Không tìm thấy học viên với mã này.', 'KHONG_TIM_THAY');
  if (!hs_trongPhamVi_(p, vs.coSo)) {
    // Không nói "em này ở cơ sở khác" — trả như không tìm thấy để khỏi dò dữ liệu
    return hs_loi_('Không tìm thấy học viên với mã này.', 'KHONG_TIM_THAY');
  }
  return hs_ok_({ student: hs_mapVoSinh_(vs) });
}

/** Phụ huynh chỉ được xem hồ sơ con mình. */
function hs_duocXemHocVien_(p, maHV) {
  var vs = SHEETS_.findRow('VoSinh', 'maHV', String(maHV));
  if (!vs) return false;
  if (hs_laPhuHuynh_(p)) {
    return !!p._maPH && String(vs.maPH || '') === String(p._maPH);
  }
  return hs_trongPhamVi_(p, vs.coSo);
}

function hsListStudentReviews_(p) {
  var maHV = String(p.maHV || '').trim();
  if (!maHV) return hs_loi_('Thiếu mã học viên.');
  if (!hs_duocXemHocVien_(p, maHV)) {
    return hs_loi_('Bạn không xem được nhận xét của học viên này.', 'KHONG_DU_QUYEN');
  }

  /* Nhận xét tách sheet theo năm nên quét mọi sheet NhanXet_* */
  var out = [];
  var tatCa = SHEETS_.ss().getSheets();
  for (var i = 0; i < tatCa.length; i++) {
    var ten = tatCa[i].getName();
    if (ten.indexOf('NhanXet_') !== 0) continue;
    var rows = SHEETS_.readAll(ten, function (r) { return String(r.maHV) === maHV; });
    for (var j = 0; j < rows.length; j++) {
      out.push({
        thang: hs_soNguyen_(rows[j].thang, 0), nam: hs_soNguyen_(rows[j].nam, 0),
        hoTenNV: String(rows[j].hoTenNV || ''), noiDung: String(rows[j].noiDung || '')
      });
    }
  }
  out.sort(function (a, b) { return (b.nam - a.nam) || (b.thang - a.thang); });
  return hs_ok_({ reviews: out });
}

function hsSaveStudentReview_(p) {
  var maHV = String(p.maHV || '').trim();
  var noiDung = String(p.noiDung || '').trim();
  var thang = hs_soNguyen_(p.thang, 0);
  var nam = hs_soNguyen_(p.nam, new Date().getFullYear());
  if (!maHV || !noiDung || !thang) return hs_loi_('Điền đủ mã học viên, tháng và nội dung.');
  if (!hs_duocXemHocVien_(p, maHV)) {
    return hs_loi_('Học viên này không thuộc cơ sở của bạn.', 'KHONG_DU_QUYEN');
  }

  SHEETS_.appendRow(SHEETS_.yearly('NhanXet', nam), HS_NHANXET, {
    id: SHEETS_.newId(), maHV: maHV, maNV: String(p.maNV || ''),
    hoTenNV: hs_hoTenCuaToi_(p), thang: thang, nam: nam,
    noiDung: noiDung, ngayTao: SHEETS_.now()
  });
  return hs_ok_({ maHV: maHV, thang: thang, nam: nam });
}

/* ═══════════════════ HỒ SƠ CÁ NHÂN ═══════════════════ */

function hs_hoTenCuaToi_(p) {
  var tk = authTaiKhoanTheoSdt_(String(p._sdt || ''));
  return tk ? String(tk.hoTen || '') : '';
}

function hsUpdateProfile_(p) {
  /* Hồ sơ nằm ở bảng tài khoản (Sheet riêng), nên sửa qua Auth.gs. Mật khẩu
     KHÔNG đổi ở đây — có action doiMatKhau riêng, bắt nhập mật khẩu hiện tại. */
  var tk = authTaiKhoanTheoSdt_(String(p._sdt || ''));
  if (!tk) return hs_loi_('Không tìm thấy tài khoản.');

  var hoTen = String(p.fullName || p.hoTen || '').trim();
  if (hoTen.length < 2) return hs_loi_('Nhập họ tên.');

  var sdtMoi = auth_chuanSdt_(p.phone || p.soDienThoai);
  if (sdtMoi && sdtMoi !== auth_chuanSdt_(tk.soDienThoai)) {
    if (!/^0(3|5|7|8|9)\d{8}$/.test(sdtMoi)) return hs_loi_('Số điện thoại không hợp lệ.');
    if (authTaiKhoanTheoSdt_(sdtMoi)) return hs_loi_('Số điện thoại này đã có tài khoản khác dùng.');
  }

  authSuaHoSo_(tk, {
    hoTen: hoTen,
    soDienThoai: sdtMoi || auth_chuanSdt_(tk.soDienThoai),
    email: String(p.email || tk.email || ''),
    ngaySinh: String(p.dob || p.ngaySinh || '').substring(0, 10)
  });
  return hs_ok_({});
}

/* ═══════════════════ HỒ SƠ VÕ SINH ═══════════════════

   Lễ tân tạo hồ sơ chỉ với tên, tuổi, ảnh thẻ. Mã học viên do MÁY CHỦ sinh,
   không nhận mã do trình duyệt gửi lên — gõ tay là sớm muộn trùng mã, mà mã
   trùng thì học phí và điểm danh của hai em lẫn vào nhau.

   Quy tắc mã: {code cơ sở}{2 số cuối của năm}{4 số thứ tự} — VD HP260012.
   Số thứ tự đếm riêng theo từng cơ sở và từng năm.                          */

var HS_VOSINH = ['maHV','maLienDoan','hoTen','ngaySinh','namSinh','gioiTinh','maPH','coSo',
                 'capDaiHienTai','ngayNhapHoc','soBuoiTuan','anhDaiDien','dongYDungAnh',
                 'ngayDongY','trangThai','ghiChu','ngayTao','nguoiTao'];

var HS_VOSINH_TOI_DA = 500;        // trần một lần trả danh sách

function hs_laLeTan_(p) {
  return hs_chuan_(p._vaiTro).indexOf('letan') !== -1;
}

/** Code ngắn của cơ sở ('Hapulico' → 'HP'), dùng làm tiền tố mã học viên. */
function hs_codeCoSo_(coSo) {
  var cs = SHEETS_.findRow('CoSo', 'id', String(coSo || ''));
  return cs ? String(cs.code || '').toUpperCase() : '';
}

/** Sinh mã học viên kế tiếp. LUÔN gọi bên trong withLock, nếu không hai lễ
    tân bấm cùng lúc sẽ nhận cùng một mã. */
function hs_sinhMaHV_(coSo) {
  var code = hs_codeCoSo_(coSo);
  if (!code) return '';
  var nam = new Date().getFullYear() % 100;
  var tienTo = code + (nam < 10 ? '0' + nam : String(nam));

  var rows = SHEETS_.readAll('VoSinh', function (r) {
    return String(r.maHV || '').indexOf(tienTo) === 0;
  });
  var lonNhat = 0;
  for (var i = 0; i < rows.length; i++) {
    var duoi = String(rows[i].maHV).substring(tienTo.length);
    var n = parseInt(duoi, 10);
    if (!isNaN(n) && n > lonNhat) lonNhat = n;
  }
  var tt = String(lonNhat + 1);
  while (tt.length < 4) tt = '0' + tt;
  return tienTo + tt;
}

/** Ảnh thẻ nằm trong thư mục Drive riêng tư. Lưu ID chứ không lưu link: link
    Drive ai cầm được cũng mở, còn ID thì phải qua action anhVoSinh — và action
    đó kiểm quyền trước khi trả ảnh. Ảnh trẻ em không nên để công khai. */
function hs_luuAnhVoSinh_(base64, maHV) {
  if (!base64) return '';
  var idThuMuc = PropertiesService.getScriptProperties().getProperty('FOLDER_ANH_VOSINH');
  if (!idThuMuc) return '';
  try {
    var phan = String(base64).split(',');
    var duLieu = phan.length > 1 ? phan[1] : phan[0];
    var blob = Utilities.newBlob(Utilities.base64Decode(duLieu), 'image/jpeg',
                                 'anhthe_' + maHV + '.jpg');
    return DriveApp.getFolderById(idThuMuc).createFile(blob).getId();
  } catch (err) {
    console.error('Không lưu được ảnh thẻ ' + maHV + ': ' + err);
    return '';
  }
}

function hsTaoVoSinh_(p) {
  if (!hs_laLeTan_(p) && !hs_laQuanLy_(p)) {
    return hs_loi_('Chỉ lễ tân và quản lý mới tạo được hồ sơ võ sinh.', 'KHONG_DU_QUYEN');
  }

  var hoTen = String(p.hoTen || '').trim().replace(/\s+/g, ' ');
  if (hoTen.length < 2) return hs_loi_('Chưa điền họ tên võ sinh.');

  /* Cơ sở: nhân viên bị ép về cơ sở của mình, không cho tạo hộ cơ sở khác.
     Chỉ admin (phạm vi rỗng) mới được chọn cơ sở trong tham số. */
  var pv = hs_phamVi_(p);
  var coSo = pv ? pv : String(p.coSo || '').trim();
  if (!coSo) return hs_loi_('Chưa chọn cơ sở.');
  if (!hs_codeCoSo_(coSo)) return hs_loi_('Cơ sở không hợp lệ: ' + coSo);

  var ngaySinh = String(p.ngaySinh || '').substring(0, 10);
  var tuoi = hs_soNguyen_(p.tuoi, 0);
  var namSinh = hs_soNguyen_(p.namSinh, 0);
  if (!namSinh && tuoi > 0) namSinh = new Date().getFullYear() - tuoi;
  if (ngaySinh) {
    var n = parseInt(ngaySinh.substring(0, 4), 10);
    if (!isNaN(n)) namSinh = n;
  }
  if (!ngaySinh && !namSinh) return hs_loi_('Chưa điền tuổi hoặc ngày sinh.');
  if (namSinh && (namSinh < 1950 || namSinh > new Date().getFullYear())) {
    return hs_loi_('Tuổi hoặc ngày sinh không hợp lệ.');
  }

  var gioiTinh = String(p.gioiTinh || '').trim();
  if (gioiTinh && gioiTinh !== 'Nam' && gioiTinh !== 'Nữ') gioiTinh = '';

  var kq = SHEETS_.withLock(function () {
    var maHV = hs_sinhMaHV_(coSo);
    if (!maHV) return hs_loi_('Không sinh được mã học viên cho cơ sở ' + coSo + '.');
    if (SHEETS_.findRow('VoSinh', 'maHV', maHV)) {
      return hs_loi_('Mã ' + maHV + ' đã tồn tại. Thử lại lần nữa.');
    }
    SHEETS_.appendRow('VoSinh', HS_VOSINH, {
      maHV: maHV, hoTen: hoTen, ngaySinh: ngaySinh, namSinh: namSinh || '',
      gioiTinh: gioiTinh, maPH: String(p.maPH || '').trim(), coSo: coSo,
      capDaiHienTai: String(p.capDaiHienTai || '').trim(),
      ngayNhapHoc: String(p.ngayNhapHoc || '').substring(0, 10) || SHEETS_.today(),
      soBuoiTuan: hs_soNguyen_(p.soBuoiTuan, '') === '' ? '' : hs_soNguyen_(p.soBuoiTuan, ''),
      anhDaiDien: '',
      dongYDungAnh: String(p.dongYDungAnh || 'Chưa hỏi'),
      trangThai: 'Đang học',
      ghiChu: String(p.ghiChu || '').trim(),
      ngayTao: SHEETS_.now(), nguoiTao: String(p._maNV || p._sdt || '')
    });
    return hs_ok_({ maHV: maHV });
  });
  if (kq.status !== 'success') return kq;

  /* Lưu ảnh SAU khi đã có mã, và ngoài khoá: tải ảnh lên Drive mất vài giây,
     giữ khoá suốt lúc đó là lễ tân cơ sở khác phải xếp hàng chờ. Ảnh hỏng thì
     hồ sơ vẫn còn, bổ sung ảnh sau được. */
  var idAnh = hs_luuAnhVoSinh_(p.anhThe, kq.maHV);
  if (idAnh) {
    var dong = SHEETS_.findRow('VoSinh', 'maHV', kq.maHV);
    if (dong) SHEETS_.updateRow('VoSinh', dong._row, { anhDaiDien: idAnh });
  }

  var vs = SHEETS_.findRow('VoSinh', 'maHV', kq.maHV);
  return hs_ok_({
    maHV: kq.maHV, coAnh: !!idAnh,
    student: vs ? hs_mapVoSinh_(vs) : { maHV: kq.maHV, hoTen: hoTen, coSo: coSo }
  });
}

function hsDanhSachVoSinh_(p) {
  var pv = hs_phamVi_(p);
  var loc = String(p.coSo || '').trim();
  var tim = hs_chuan_(p.tim);
  var trangThai = String(p.trangThai || '').trim();

  var rows = SHEETS_.readAll('VoSinh', function (r) {
    if (pv && String(r.coSo || '') !== pv) return false;
    if (!pv && loc && String(r.coSo || '') !== loc) return false;
    if (trangThai && String(r.trangThai || '') !== trangThai) return false;
    if (tim) {
      var kho = hs_chuan_(r.hoTen) + hs_chuan_(r.maHV) + hs_chuan_(r.maPH);
      if (kho.indexOf(tim) === -1) return false;
    }
    return true;
  });

  rows.sort(function (a, b) {
    return String(b.maHV || '').localeCompare(String(a.maHV || ''));
  });

  var tong = rows.length;
  var catBot = tong > HS_VOSINH_TOI_DA;
  if (catBot) rows = rows.slice(0, HS_VOSINH_TOI_DA);

  var out = [];
  for (var i = 0; i < rows.length; i++) {
    var m = hs_mapVoSinh_(rows[i]);
    m.coAnh = !!String(rows[i].anhDaiDien || '');
    out.push(m);
  }
  return hs_ok_({ students: out, tong: tong, catBot: catBot });
}

/** Trả ảnh thẻ dưới dạng data URI. Đi qua đây thay vì link Drive công khai để
    ảnh chỉ đến được tay người có quyền xem em đó. */
function hsAnhVoSinh_(p) {
  var maHV = String(p.maHV || '').trim();
  if (!maHV) return hs_loi_('Thiếu mã học viên.');
  if (!hs_duocXemHocVien_(p, maHV)) {
    return hs_loi_('Bạn không xem được hồ sơ học viên này.', 'KHONG_DU_QUYEN');
  }
  var vs = SHEETS_.findRow('VoSinh', 'maHV', maHV);
  var idAnh = vs ? String(vs.anhDaiDien || '') : '';
  if (!idAnh) return hs_ok_({ anh: '' });
  try {
    var blob = DriveApp.getFileById(idAnh).getBlob();
    return hs_ok_({ anh: 'data:' + blob.getContentType() + ';base64,' +
                         Utilities.base64Encode(blob.getBytes()) });
  } catch (err) {
    console.error('Không đọc được ảnh thẻ ' + maHV + ': ' + err);
    return hs_ok_({ anh: '' });
  }
}

function hsSuaVoSinh_(p) {
  if (!hs_laLeTan_(p) && !hs_laQuanLy_(p)) {
    return hs_loi_('Chỉ lễ tân và quản lý mới sửa được hồ sơ võ sinh.', 'KHONG_DU_QUYEN');
  }
  var maHV = String(p.maHV || '').trim();
  if (!maHV) return hs_loi_('Thiếu mã học viên.');
  var vs = SHEETS_.findRow('VoSinh', 'maHV', maHV);
  if (!vs) return hs_loi_('Không tìm thấy học viên với mã này.', 'KHONG_TIM_THAY');
  if (!hs_trongPhamVi_(p, vs.coSo)) {
    return hs_loi_('Không tìm thấy học viên với mã này.', 'KHONG_TIM_THAY');
  }

  /* Danh sách trắng các cột được sửa. maHV, coSo, ngayTao, nguoiTao KHÔNG nằm
     ở đây: đổi mã là mất liên kết với học phí/điểm danh, đổi cơ sở là chuyển
     em sang tầm nhìn của người khác — hai việc đó phải làm riêng, có chủ đích. */
  var patch = {};
  var choPhep = ['hoTen','ngaySinh','namSinh','gioiTinh','maPH','capDaiHienTai',
                 'ngayNhapHoc','soBuoiTuan','dongYDungAnh','trangThai','ghiChu','maLienDoan'];
  for (var i = 0; i < choPhep.length; i++) {
    var c = choPhep[i];
    if (p[c] === undefined) continue;
    patch[c] = (c === 'soBuoiTuan' || c === 'namSinh')
      ? (hs_soNguyen_(p[c], '') === '' ? '' : hs_soNguyen_(p[c], ''))
      : String(p[c]).trim();
  }
  if (patch.hoTen !== undefined && patch.hoTen.length < 2) {
    return hs_loi_('Họ tên không hợp lệ.');
  }
  if (p.anhThe) {
    var idAnh = hs_luuAnhVoSinh_(p.anhThe, maHV);
    if (idAnh) patch.anhDaiDien = idAnh;
  }
  if (!Object.keys(patch).length) return hs_loi_('Không có gì để sửa.');

  SHEETS_.updateRow('VoSinh', vs._row, patch);
  var moi = SHEETS_.findRow('VoSinh', 'maHV', maHV);
  return hs_ok_({ student: hs_mapVoSinh_(moi) });
}
