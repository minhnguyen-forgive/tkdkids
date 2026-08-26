/* =============================================================
   TẠO CẤU TRÚC DỮ LIỆU — Setup.gs
   Dán vào Apps Script như FILE MỚI, chọn hàm `taoToanBoCauTruc`
   rồi bấm ▶ Run. Chạy MỘT LẦN là đủ.

   An toàn khi chạy lại nhiều lần:
   · Sheet đã có thì KHÔNG đụng vào dữ liệu, chỉ bổ sung cột còn thiếu
   · Dữ liệu mẫu chỉ thêm khi sheet đang trống
   ============================================================= */

/* ---------- ĐỊNH NGHĨA CẤU TRÚC ---------- */

var CAU_TRUC = {

  CoSo: {
    cols: ['id','code','ten','khuVuc','diaChi','lat','lng','banKinhChoPhep','dienThoai','trangThai'],
    seed: [
      ['Hapulico','HP','Cơ sở Hapulico','Hà Nội','Tầng B1, Toà 21T1, Chung cư Hapulico, 83 Vũ Trọng Phụng, Thanh Xuân, Hà Nội','','',150,'0978931747','Đang hoạt động'],
      ['GreenStars','GS','Cơ sở GreenStars','Hà Nội','Tầng 1, Toà 21B5, Chung cư GreenStar, 234 Phạm Văn Đồng, Phú Diễn, Hà Nội','','',150,'0978931747','Đang hoạt động'],
      ['NghiaDo','ND','Cơ sở Nghĩa Đô','Hà Nội','Tầng 1, Toà CT3, Khu đô thị mới Nghĩa Đô, Nghĩa Đô, Cầu Giấy, Hà Nội','','',150,'0978931747','Đang hoạt động'],
      ['HaDong','HD','Cơ sở Hà Đông','Hà Nội','Tầng 1, Toà T2A, TSQ EuroLand, 25 Nguyễn Văn Lộc, Mộ Lao, Hà Đông, Hà Nội','','',150,'0978931747','Đang hoạt động'],
      ['LongBien','LB','Cơ sở Long Biên','Hà Nội','Tầng 1, Toà L4, Chung cư LeGrand Jardin, Sài Đồng, Long Biên, Hà Nội','','',150,'0978931747','Đang hoạt động'],
      ['GiaHoa','GH','Cơ sở Gia Hoà','TP. Hồ Chí Minh','Phòng B3.01.09, Chung cư Gia Hoà, 523A Đỗ Xuân Hợp, TP. Thủ Đức, TP. Hồ Chí Minh','','',150,'0978931747','Đang hoạt động'],
      ['HaLong','HL','Cơ sở Hạ Long','Quảng Ninh','Tổ 3, Khu 3, Trần Hưng Đạo, TP. Hạ Long, Quảng Ninh','','',150,'0978931747','Đang hoạt động']
    ],
    note: 'Cột lat/lng để trống — điền sau bằng hàm layToaDoCacCoSo()'
  },

  VoSinh: {
    cols: ['maHV','maLienDoan','hoTen','ngaySinh','namSinh','gioiTinh','coSo',
           'capDaiHienTai','ngayNhapHoc','soBuoiTuan','anhDaiDien','dongYDungAnh',
           'ngayDongY','trangThai','ghiChu','ngayTao','nguoiTao'],
    validate: {
      gioiTinh: ['Nam','Nữ'],
      coSo: ['Hapulico','GreenStars','NghiaDo','HaDong','LongBien','GiaHoa','HaLong'],
      trangThai: ['Đang học','Bảo lưu','Nghỉ'],
      dongYDungAnh: ['Có','Không','Chưa hỏi']
    }
  },

  ThiThangCap: {
    cols: ['id','maHV','ngayThi','capDaiTu','capDaiDen','ketQua','diem','noiThi',
           'soQuyetDinh','nguoiCham','ghiChu'],
    validate: { ketQua: ['Đạt','Không đạt','Bảo lưu'] }
  },

  SucKhoe: {
    cols: ['id','maHV','ngayDo','chieuCao','canNang','bmi','nhomMau','thiLuc',
           'diUng','benhLy','ghiChu','nguoiNhap']
  },

  BangGia: {
    cols: ['id','coSo','tenGoi','soBuoiTuan','soThang','donGia','hieuLucTu','hieuLucDen','trangThai'],
    seed: [
      ['BG01','ALL','2 buổi/tuần — 1 tháng',2,1,0,'','','Đang áp dụng'],
      ['BG02','ALL','2 buổi/tuần — 3 tháng',2,3,0,'','','Đang áp dụng'],
      ['BG03','ALL','2 buổi/tuần — 6 tháng',2,6,0,'','','Đang áp dụng'],
      ['BG04','ALL','2 buổi/tuần — 12 tháng',2,12,0,'','','Đang áp dụng'],
      ['BG05','ALL','3 buổi/tuần — 1 tháng',3,1,0,'','','Đang áp dụng'],
      ['BG06','ALL','3 buổi/tuần — 3 tháng',3,3,0,'','','Đang áp dụng'],
      ['BG07','ALL','3 buổi/tuần — 6 tháng',3,6,0,'','','Đang áp dụng'],
      ['BG08','ALL','3 buổi/tuần — 12 tháng',3,12,0,'','','Đang áp dụng']
    ],
    note: '⚠️ Cột donGia đang là 0 — bạn cần điền giá thật trước khi dùng chức năng học phí'
  },

  UuDai: {
    cols: ['id','maUuDai','tenUuDai','loai','giaTri','apDungCung','dieuKien',
           'hieuLucTu','hieuLucDen','trangThai'],
    seed: [
      ['UD01','NHOM3','Giảm 10% khi đăng ký nhóm từ 3 người','phanTram',10,'Có','Từ 3 võ sinh đăng ký cùng lúc','','','Đang áp dụng'],
      ['UD02','VOPHUC','Tặng võ phục trị giá 500.000đ','soTien',500000,'Có','Từ 2 võ sinh trở lên','','','Đang áp dụng'],
      ['UD03','TANG1TH','Tặng 1 tháng khi đóng 6 tháng','tangThang',1,'Không','Đóng học phí gói 6 tháng','','','Đang áp dụng'],
      ['UD04','TANG3TH','Tặng 3 tháng khi đóng 12 tháng','tangThang',3,'Không','Đóng học phí gói 12 tháng','','','Đang áp dụng']
    ],
    validate: { loai: ['phanTram','soTien','tangThang'], apDungCung: ['Có','Không'] }
  },

  DangKyTuVan: {
    cols: ['id','thoiGian','coSoQuanTam','tenPhuHuynh','soDienThoai','email',
           'soVoSinh','dsVoSinh','nguon','trangThai','nguoiXuLy','ghiChu'],
    validate: { trangThai: ['Mới','Đã liên hệ','Đã đăng ký','Không quan tâm'] }
  },

  BaiViet: {
    cols: ['id','duongDan','tieuDe','moTaNgan','chuyenMuc','anhBia','docId','noiDungHtml',
           'tacGia','coSo','ngayXuatBan','ngayCapNhat','trangThai','luotXem','noiBat'],
    validate: {
      chuyenMuc: ['Sự kiện','Thành tích','Thông báo','Kiến thức'],
      trangThai: ['Nháp','Đã xuất bản','Ẩn'],
      noiBat: ['TRUE','FALSE']
    },
    note: 'Cột noiDungHtml do hệ thống tự ghi khi bấm Xuất bản — không sửa tay'
  },

  /* ---- Sáu sheet nghiệp vụ. Trước đây nằm trong hệ thống của bên khác, nay
     dựng lại trong Sheet dữ liệu của trung tâm. ---- */

  LichDay: {
    cols: ['id','maNV','tuanBatDau','thu','ca','coSo','ngayTao'],
    note: 'thu theo chuẩn JS: 0=Chủ Nhật, 1=Thứ 2 ... 6=Thứ 7'
  },

  GhiChuLich: {
    cols: ['id','maNV','ngay','loai','noiDung','ngayTao'],
    validate: { loai: ['teaching','working','leave'] }
  },

  LichChung: {
    cols: ['id','ngay','loai','noiDung','coSo','nguoiTao','ngayTao'],
    note: 'coSo = ALL nghĩa là toàn hệ thống'
  },

  NghiPhep: {
    cols: ['id','maNV','hoTen','coSo','tuNgay','denNgay','lyDo','trangThai',
           'nguoiDuyet','lyDoTuChoi','ngayTao','ngayQuyetDinh'],
    validate: { trangThai: ['Chờ duyệt','Đã duyệt','Từ chối'] }
  },

  Luong: {
    cols: ['id','maNV','hoTen','coSo','thang','nam','soBuoiDaDuyet','donGia',
           'tongLuong','trangThai','nguoiDuyet','ngayQuyetDinh'],
    validate: { trangThai: ['Chờ duyệt','Đã duyệt'] }
  },

  ThongBao: {
    cols: ['id','doiTuong','loai','tieuDe','noiDung','ngayTao','hanXuLy','daDoc']
  }
};

/** Bảng tách theo năm — tạo sheet của năm hiện tại. */
var CAU_TRUC_THEO_NAM = {
  HocPhi: {
    cols: ['id','soBienLai','maHV','hoTenHV','coSo','goiHocId','tenGoi','kyTu','kyDen',
           'hocPhiGoc','dsUuDai','tongGiam','thucNop','daNop','conNo','hinhThuc',
           'ngayNop','hanDongTiep','nguoiThu','trangThai','ghiChu'],
    validate: {
      hinhThuc: ['Tiền mặt','Chuyển khoản','Thẻ'],
      trangThai: ['Đã thu','Còn nợ','Đã huỷ','Điều chỉnh']
    }
  },
  NhanXet: { cols: ['id','maHV','maNV','hoTenNV','thang','nam','noiDung','ngayTao'] }
};

/* ---------- HÀM CHÍNH — CHẠY HÀM NÀY ---------- */

function taoToanBoCauTruc() {
  var ss = SHEETS_.ss();
  var nam = new Date().getFullYear();
  var bienBan = [];

  for (var ten in CAU_TRUC) {
    bienBan.push(taoMotSheet_(ss, ten, CAU_TRUC[ten]));
  }
  for (var goc in CAU_TRUC_THEO_NAM) {
    bienBan.push(taoMotSheet_(ss, goc + '_' + nam, CAU_TRUC_THEO_NAM[goc]));
  }

  taoThuMucDrive_(bienBan);

  var bc = 'KẾT QUẢ TẠO CẤU TRÚC\n' + Array(40).join('=') + '\n\n' + bienBan.join('\n');
  Logger.log(bc);
  try {
    SpreadsheetApp.getUi().alert('Hoàn tất', bc, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) { /* chạy từ trình soạn thảo thì không có giao diện */ }
  return bc;
}

/* ---------- TẠO / BỔ SUNG MỘT SHEET ---------- */

function taoMotSheet_(ss, ten, dinhNghia) {
  var sh = ss.getSheetByName(ten);
  var moi = false;

  if (!sh) { sh = ss.insertSheet(ten); moi = true; }

  // Đọc tiêu đề hiện có
  var lastCol = Math.max(1, sh.getLastColumn());
  var hienCo = sh.getLastRow() > 0
    ? sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function (v) { return String(v).trim(); })
    : [];

  // Bổ sung cột còn thiếu vào cuối — KHÔNG đụng cột đã có
  var thieu = dinhNghia.cols.filter(function (c) { return hienCo.indexOf(c) === -1; });
  if (thieu.length) {
    var batDau = hienCo.filter(String).length + 1;
    sh.getRange(1, batDau, 1, thieu.length).setValues([thieu]);
  }

  // Định dạng dòng tiêu đề
  var tongCot = sh.getLastColumn();
  sh.getRange(1, 1, 1, tongCot)
    .setFontWeight('bold').setBackground('#0047AB').setFontColor('#FFFFFF')
    .setVerticalAlignment('middle');
  sh.setFrozenRows(1);
  sh.setRowHeight(1, 34);

  // Dữ liệu mẫu — chỉ khi sheet hoàn toàn trống
  var daThemMau = 0;
  if (dinhNghia.seed && sh.getLastRow() <= 1) {
    sh.getRange(2, 1, dinhNghia.seed.length, dinhNghia.seed[0].length).setValues(dinhNghia.seed);
    daThemMau = dinhNghia.seed.length;
  }

  // Danh sách chọn cho các cột có giá trị cố định
  if (dinhNghia.validate) {
    var map = {};
    var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    for (var i = 0; i < head.length; i++) map[String(head[i]).trim()] = i + 1;

    for (var cot in dinhNghia.validate) {
      if (!map[cot]) continue;
      var rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(dinhNghia.validate[cot], true)
        .setAllowInvalid(false)
        .setHelpText('Chỉ được chọn: ' + dinhNghia.validate[cot].join(' / '))
        .build();
      sh.getRange(2, map[cot], 2000, 1).setDataValidation(rule);
    }
  }

  sh.autoResizeColumns(1, Math.min(tongCot, 12));

  var dong = moi ? '✅ Tạo mới  ' : '↻ Đã có    ';
  dong += ten + '  (' + dinhNghia.cols.length + ' cột';
  if (thieu.length && !moi) dong += ', bổ sung ' + thieu.length + ' cột';
  if (daThemMau) dong += ', thêm ' + daThemMau + ' dòng mẫu';
  dong += ')';
  if (dinhNghia.note) dong += '\n     ↳ ' + dinhNghia.note;
  return dong;
}

/* ---------- TẠO THƯ MỤC DRIVE ---------- */

function taoThuMucDrive_(bienBan) {
  var props = PropertiesService.getScriptProperties();
  var goc = layHoacTaoThuMuc_(null, 'TaekwondoKids-Data');
  props.setProperty('FOLDER_GOC', goc.getId());

  var con = {
    FOLDER_ANH_VOSINH: 'AnhVoSinh',
    FOLDER_ANH_DIEMDANH: 'AnhDiemDanh',
    FOLDER_ANH_BAIVIET: 'AnhBaiViet',
    FOLDER_TAILIEU: 'TaiLieu',
    FOLDER_BAIVIET_DOCS: 'BaiViet-Docs'
  };
  for (var key in con) {
    props.setProperty(key, layHoacTaoThuMuc_(goc, con[key]).getId());
  }
  bienBan.push('✅ Thư mục Drive "TaekwondoKids-Data" và 5 thư mục con');
  bienBan.push('     ↳ ID đã lưu vào Script Properties');
}

function layHoacTaoThuMuc_(cha, ten) {
  var nguon = cha || DriveApp.getRootFolder();
  var it = nguon.getFoldersByName(ten);
  return it.hasNext() ? it.next() : nguon.createFolder(ten);
}

/* ---------- TIỆN ÍCH: LẤY TOẠ ĐỘ CÁC CƠ SỞ ----------
   Chạy riêng sau khi đã có sheet CoSo. Dùng để kiểm tra GPS khi HLV điểm danh.
   Toạ độ tự tra có thể lệch — nên mở Google Maps kiểm lại từng cơ sở. */

function layToaDoCacCoSo() {
  var sh = SHEETS_.ss().getSheetByName('CoSo');
  if (!sh) throw new Error('Chưa có sheet CoSo. Chạy taoToanBoCauTruc() trước.');

  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var cDiaChi = head.indexOf('diaChi') + 1;
  var cLat = head.indexOf('lat') + 1;
  var cLng = head.indexOf('lng') + 1;
  var cTen = head.indexOf('ten') + 1;

  var ketQua = [];
  for (var r = 2; r <= sh.getLastRow(); r++) {
    if (sh.getRange(r, cLat).getValue()) continue;      // đã có thì bỏ qua
    var diaChi = sh.getRange(r, cDiaChi).getValue();
    if (!diaChi) continue;

    var res = Maps.newGeocoder().setRegion('vn').geocode(diaChi);
    if (res.status === 'OK' && res.results.length) {
      var loc = res.results[0].geometry.location;
      sh.getRange(r, cLat).setValue(loc.lat);
      sh.getRange(r, cLng).setValue(loc.lng);
      ketQua.push('✅ ' + sh.getRange(r, cTen).getValue() + ': ' + loc.lat + ', ' + loc.lng);
    } else {
      ketQua.push('⚠️ ' + sh.getRange(r, cTen).getValue() + ': không tra được, cần nhập tay');
    }
    Utilities.sleep(300);        // tránh chạm giới hạn dịch vụ Maps
  }
  var bc = ketQua.join('\n') + '\n\n⚠️ Toạ độ tự tra có thể lệch vài chục mét.\n'
         + 'Hãy mở Google Maps, bấm chuột phải đúng cửa phòng tập để lấy toạ độ chính xác.';
  Logger.log(bc);
  return bc;
}

/* ---------- MENU TRONG GOOGLE SHEET ---------- */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('⚙️ Taekwondo Kids')
    .addItem('Tạo / cập nhật cấu trúc dữ liệu', 'taoToanBoCauTruc')
    .addItem('Lấy toạ độ GPS các cơ sở', 'layToaDoCacCoSo')
    .addToUi();
}
