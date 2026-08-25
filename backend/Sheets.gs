/* =============================================================
   LỚP TRUY CẬP DỮ LIỆU — Sheets.gs
   Dán vào Apps Script như một FILE MỚI. Không sửa gì code cũ.

   Nguyên tắc: KHÔNG dùng getDataRange().getValues() để tìm 1 dòng.
   Cách đó nạp cả sheet vào RAM — sheet 50.000 dòng mất 3-8 giây.
   Thay vào đó dùng chỉ mục trong CacheService: tra ~50ms bất kể
   sheet lớn cỡ nào.
   ============================================================= */

var SHEETS_ = (function () {

  var CACHE_TTL = 21600;          // 6 giờ
  var _ssCache = null;

  /* Sheet DỮ LIỆU (khác Sheet tài khoản của Auth.gs — tài khoản để riêng cho
     không ai ngoài chủ sở hữu đọc được mật khẩu).

     Thứ tự tìm:
       1. Script Property ID_SHEET_DULIEU — đặt sẵn thì dùng luôn
       2. Sheet mà project đang gắn vào (nếu script mở từ trong một Sheet)
       3. Chưa có gì thì TỰ TẠO file "TaekwondoKids-DuLieu" trong Drive của
          chủ sở hữu rồi ghi id vào Script Property

     Nhờ bước 3 mà project kiểu độc lập (tạo từ script.google.com, không gắn
     Sheet nào) cũng chạy được — trước đây getActiveSpreadsheet() trả rỗng là
     mọi thứ đổ. */
  /* Dữ liệu nghiệp vụ KHÔNG được nằm chung file với bảng tài khoản. Sheet dữ
     liệu sau này còn share cho lễ tân, HLV nhập liệu; để chung là họ đọc được
     chuỗi băm mật khẩu và token phiên, sửa được cả cột vaiTro của chính mình. */
  function laSheetTaiKhoan_(id) {
    var idTK = '';
    try {
      idTK = PropertiesService.getScriptProperties()
               .getProperty('ID_SHEET_TAIKHOAN') || '';
    } catch (e) {}
    if (!idTK && typeof AUTH_ID_SHEET_MAC_DINH === 'string') idTK = AUTH_ID_SHEET_MAC_DINH;
    return !!idTK && String(id) === String(idTK);
  }

  function taoSheetDuLieu_(props) {
    var moi = SpreadsheetApp.create('TaekwondoKids-DuLieu');
    props.setProperty('ID_SHEET_DULIEU', moi.getId());
    Logger.log('Đã tạo Sheet dữ liệu mới: ' + moi.getUrl());
    return moi;
  }

  function ss() {
    if (_ssCache) return _ssCache;
    var props = PropertiesService.getScriptProperties();

    var id = props.getProperty('ID_SHEET_DULIEU');
    if (id) {
      if (laSheetTaiKhoan_(id)) {
        throw new Error(
          'ID_SHEET_DULIEU đang trỏ vào Sheet TÀI KHOẢN. Cách sửa: Project ' +
          'Settings > Script Properties > xoá dòng ID_SHEET_DULIEU > Save, ' +
          'rồi chạy lại taoToanBoCauTruc.');
      }
      _ssCache = SpreadsheetApp.openById(id);
      return _ssCache;
    }

    /* Project tạo từ trong một Sheet thì gắn cứng vào Sheet đó. Nếu Sheet mẹ
       chính là Sheet tài khoản thì KHÔNG dùng nó — không thể sửa bằng cấu hình
       (xoá property vẫn quay về đây), nên tự tạo file dữ liệu riêng. */
    var dangGan = null;
    try { dangGan = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) { dangGan = null; }
    if (dangGan && !laSheetTaiKhoan_(dangGan.getId())) {
      props.setProperty('ID_SHEET_DULIEU', dangGan.getId());
      _ssCache = dangGan;
      return _ssCache;
    }

    _ssCache = taoSheetDuLieu_(props);
    return _ssCache;
  }

  /** Lấy sheet theo tên, tự tạo kèm dòng tiêu đề nếu chưa có. */
  function sheet(name, headers) {
    var sh = ss().getSheetByName(name);
    if (!sh) {
      sh = ss().insertSheet(name);
      if (headers && headers.length) {
        sh.getRange(1, 1, 1, headers.length).setValues([headers])
          .setFontWeight('bold').setBackground('#F1F5F9');
        sh.setFrozenRows(1);
      }
    }
    return sh;
  }

  /** Tên sheet tách theo năm: bảng('NhanXet') -> 'NhanXet_2026' */
  function yearly(base, year) {
    return base + '_' + (year || new Date().getFullYear());
  }

  /** Đọc dòng tiêu đề -> { tênCột: chỉSốCột(0-based) } */
  /* Số hiệu bản dữ liệu của mỗi sheet. Mọi khoá cache đều gắn số này, nên chỉ
     cần tăng nó lên là toàn bộ chỉ mục cũ của sheet đó thành vô hiệu — kể cả
     những chỉ mục dựng theo cột khoá mà chỗ ghi không hề biết tới.

     Trước đây invalidate() chỉ xoá đúng một chỉ mục nếu người gọi nhớ truyền
     tên cột khoá, mà appendRow lại không truyền. Hậu quả: ghi xong một dòng
     mới thì findRow vẫn đọc chỉ mục cũ suốt 6 tiếng và bảo "không tìm thấy" —
     tạo hồ sơ võ sinh xong tra mã ra không có, sửa cũng không được. */
  function ban_(sheetName) {
    var c = CacheService.getScriptCache();
    var k = 'ver:' + ss().getId() + ':' + sheetName;
    var v = c.get(k);
    if (!v) { v = '1'; }
    c.put(k, v, CACHE_TTL);
    return v;
  }

  function headerMap(sh) {
    var key = 'hdr:' + ss().getId() + ':' + sh.getName() + ':v' + ban_(sh.getName());
    var cached = CacheService.getScriptCache().get(key);
    if (cached) return JSON.parse(cached);

    var lastCol = sh.getLastColumn();
    if (lastCol < 1) return {};
    var head = sh.getRange(1, 1, 1, lastCol).getValues()[0];
    var map = {};
    for (var i = 0; i < head.length; i++) {
      var name = String(head[i]).trim();
      if (name) map[name] = i;
    }
    CacheService.getScriptCache().put(key, JSON.stringify(map), CACHE_TTL);
    return map;
  }

  /**
   * Chỉ mục khoá -> số dòng (1-based). Dựng 1 lần rồi cache.
   * Chỉ đọc DUY NHẤT cột khoá, không đọc cả sheet.
   */
  function index(sh, keyColName) {
    var key = 'idx:' + ss().getId() + ':' + sh.getName() + ':' + keyColName +
              ':v' + ban_(sh.getName());
    var cached = CacheService.getScriptCache().get(key);
    if (cached) return JSON.parse(cached);

    var map = headerMap(sh);
    var col = map[keyColName];
    if (col === undefined) return {};

    var lastRow = sh.getLastRow();
    var idx = {};
    if (lastRow > 1) {
      // Chỉ lấy 1 cột -> nhẹ hơn nhiều so với đọc toàn bộ
      var values = sh.getRange(2, col + 1, lastRow - 1, 1).getValues();
      for (var i = 0; i < values.length; i++) {
        var k = String(values[i][0]).trim();
        if (k) idx[k] = i + 2;
      }
    }
    CacheService.getScriptCache().put(key, JSON.stringify(idx), CACHE_TTL);
    return idx;
  }

  /** Bỏ toàn bộ chỉ mục đã cache của một sheet sau khi ghi thêm/sửa.
      Tham số keyColName giữ lại cho tương thích, không còn cần nữa: tăng số
      hiệu bản là mọi chỉ mục của sheet đó đều hết hiệu lực cùng lúc. */
  function invalidate(sheetName, keyColName) {
    var c = CacheService.getScriptCache();
    var k = 'ver:' + ss().getId() + ':' + sheetName;
    var v = parseInt(c.get(k) || '1', 10) + 1;
    c.put(k, String(v), CACHE_TTL);
  }

  /** Đọc đúng MỘT dòng theo khoá. Trả object hoặc null. */
  function findRow(sheetName, keyColName, keyValue) {
    var sh = ss().getSheetByName(sheetName);
    if (!sh) return null;
    var row = index(sh, keyColName)[String(keyValue).trim()];
    if (!row) return null;
    return readRow(sh, row);
  }

  function readRow(sh, rowNum) {
    var map = headerMap(sh);
    var values = sh.getRange(rowNum, 1, 1, sh.getLastColumn()).getValues()[0];
    var obj = { _row: rowNum };
    for (var name in map) obj[name] = values[map[name]];
    return obj;
  }

  /** Đọc nhiều dòng có lọc. Chỉ dùng khi thật sự cần duyệt (VD báo cáo). */
  function readAll(sheetName, filterFn) {
    var sh = ss().getSheetByName(sheetName);
    if (!sh || sh.getLastRow() < 2) return [];
    var map = headerMap(sh);
    var values = sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
    var out = [];
    for (var i = 0; i < values.length; i++) {
      var obj = { _row: i + 2 };
      for (var name in map) obj[name] = values[i][map[name]];
      if (!filterFn || filterFn(obj)) out.push(obj);
    }
    return out;
  }

  /** Thêm một dòng từ object. Tự khớp theo TÊN cột nên thứ tự cột không quan trọng. */
  function appendRow(sheetName, headers, obj) {
    var sh = sheet(sheetName, headers);
    var map = headerMap(sh);
    var lastCol = sh.getLastColumn();
    var row = new Array(lastCol).fill('');
    for (var name in obj) {
      if (map[name] !== undefined) row[map[name]] = obj[name];
    }
    sh.appendRow(row);
    invalidate(sheetName);
    return sh.getLastRow();
  }

  /** Cập nhật vài ô của một dòng đã biết. */
  function updateRow(sheetName, rowNum, patch) {
    var sh = ss().getSheetByName(sheetName);
    if (!sh) return false;
    var map = headerMap(sh);
    for (var name in patch) {
      if (map[name] !== undefined) sh.getRange(rowNum, map[name] + 1).setValue(patch[name]);
    }
    invalidate(sheetName);
    return true;
  }

  /**
   * Chạy một khối ghi trong khoá độc quyền — chống 2 lễ tân
   * cùng thu tiền ghi đè lên nhau. Giữ khoá càng ngắn càng tốt.
   */
  function withLock(fn, timeoutMs) {
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(timeoutMs || 15000)) {
      throw new Error('Hệ thống đang bận xử lý yêu cầu khác. Vui lòng thử lại sau vài giây.');
    }
    try { return fn(); } finally { lock.releaseLock(); }
  }

  /** Sinh mã ngắn duy nhất. */
  function newId() {
    return Utilities.getUuid().replace(/-/g, '').substring(0, 12).toUpperCase();
  }

  function now() {
    return Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm:ss');
  }

  function today() {
    return Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
  }

  /** Ngày từ Sheet có thể là Date hoặc chuỗi — chuẩn hoá về 'YYYY-MM-DD'. */
  function toDateStr(v) {
    if (!v) return '';
    if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
    return String(v).substring(0, 10);
  }

  return {
    ss: ss, sheet: sheet, yearly: yearly, headerMap: headerMap,
    index: index, invalidate: invalidate, findRow: findRow, readRow: readRow,
    readAll: readAll, appendRow: appendRow, updateRow: updateRow,
    withLock: withLock, newId: newId, now: now, today: today, toDateStr: toDateStr
  };
})();
