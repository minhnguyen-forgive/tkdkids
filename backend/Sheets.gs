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

  function ss() {
    if (!_ssCache) _ssCache = SpreadsheetApp.getActiveSpreadsheet();
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
  function headerMap(sh) {
    var key = 'hdr:' + ss().getId() + ':' + sh.getName();
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
    var key = 'idx:' + ss().getId() + ':' + sh.getName() + ':' + keyColName;
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

  /** Xoá chỉ mục sau khi ghi thêm/sửa để lần đọc sau dựng lại. */
  function invalidate(sheetName, keyColName) {
    var c = CacheService.getScriptCache();
    if (keyColName) c.remove('idx:' + ss().getId() + ':' + sheetName + ':' + keyColName);
    c.remove('hdr:' + ss().getId() + ':' + sheetName);
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
