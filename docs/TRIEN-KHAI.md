# HƯỚNG DẪN TRIỂN KHAI — Giai đoạn 0 & 1

## A. Việc bạn cần làm trên Google Apps Script (khoảng 5 phút)

### Bước 1 — Thêm 3 file mới
Mở project Apps Script hiện tại → nút `+` cạnh **Files** → **Script**:

| Tạo file tên | Dán nội dung từ |
|---|---|
| `Sheets` | `backend/Sheets.gs` |
| `Api_DangKy` | `backend/Api_DangKy.gs` |
| `Setup` | `backend/Setup.gs` |

> Không sửa, không xoá file cũ. Ba file này độc lập hoàn toàn.

### Bước 1b — Tạo cấu trúc dữ liệu (chạy MỘT LẦN)
Ở thanh chọn hàm phía trên, chọn **`taoToanBoCauTruc`** → bấm ▶ **Run**.
Lần đầu Google sẽ hỏi cấp quyền — chọn tài khoản, bấm *Advanced* → *Go to ... (unsafe)* → *Allow*.
(Cảnh báo "unsafe" là bình thường với script tự viết chưa qua thẩm định của Google.)

Script sẽ tạo:
- **11 sheet**: `CoSo`, `VoSinh`, `ThiThangCap`, `SucKhoe`, `BangGia`, `UuDai`,
  `DangKyTuVan`, `BaiViet`, `ThongBao`, `HocPhi_2026`, `NhanXet_2026`
- **Dữ liệu mẫu**: 7 cơ sở, 8 gói học phí, 4 ưu đãi (lấy từ trang chủ)
- **Danh sách chọn** cho các cột như giới tính, cơ sở, trạng thái — chống nhập sai
- **Thư mục Drive** `TaekwondoKids-Data` + 5 thư mục con, ID lưu sẵn vào Script Properties

Chạy lại nhiều lần vẫn an toàn: sheet đã có thì **không đụng vào dữ liệu**, chỉ bổ sung cột còn thiếu.

Sau khi chạy, mở lại Google Sheet sẽ thấy menu mới **⚙️ Taekwondo Kids**.

### Bước 1c — Hai việc cần làm tay sau khi tạo
1. **Điền giá vào sheet `BangGia`** — cột `donGia` đang để 0. Chức năng học phí
   (Giai đoạn 4) cần số liệu thật.
2. **Lấy toạ độ cơ sở**: menu **⚙️ Taekwondo Kids → Lấy toạ độ GPS các cơ sở**.
   Toạ độ tự tra có thể lệch vài chục mét — nên mở Google Maps, bấm chuột phải
   đúng cửa phòng tập để lấy toạ độ chính xác rồi sửa lại. Toạ độ này dùng để
   kiểm tra HLV có thật sự đứng tại cơ sở khi điểm danh.

### Bước 2 — Nối vào bộ định tuyến sẵn có
Mở file chứa hàm `doPost(e)`. Thêm **3 dòng** ngay dòng đầu tiên trong thân hàm:

```js
function doPost(e) {
  // ↓↓↓ THÊM 3 DÒNG NÀY ↓↓↓
  var kq = routeNewActions_(e);
  if (kq) return ContentService.createTextOutput(JSON.stringify(kq))
                               .setMimeType(ContentService.MimeType.JSON);
  // ↑↑↑ HẾT PHẦN THÊM ↑↑↑

  ... code cũ của bạn giữ nguyên ...
}
```

`routeNewActions_` trả `null` với mọi action cũ, nên toàn bộ chức năng đang chạy
(đăng nhập, lịch dạy, chấm công, lương, nghỉ phép) **không bị ảnh hưởng**.

### Bước 3 — (Tuỳ chọn) Nhận email khi có khách đăng ký
**Project Settings** → **Script Properties** → **Add script property**:

| Property | Value |
|---|---|
| `EMAIL_NHAN_LEAD` | email nhận thông báo, VD `taekwondokids.vn@gmail.com` |

Bỏ qua bước này thì hệ thống vẫn ghi đăng ký vào Sheet bình thường, chỉ là không gửi mail.

### Bước 4 — Deploy lại
**Deploy** → **Manage deployments** → biểu tượng bút chì → **Version: New version** → **Deploy**.

> Giữ nguyên URL cũ. Nếu URL đổi, phải sửa `API_URL` trong `assets/js/core/config.js`.

Sheet `DangKyTuVan` sẽ **tự động được tạo** kèm dòng tiêu đề khi có đăng ký đầu tiên.

---

## B. Việc bạn cần làm với website

### Tải lên hosting
Tải **toàn bộ** cấu trúc thư mục, giữ nguyên đường dẫn tương đối:

```
index.html
app.html
assets/          ← thư mục mới, bắt buộc phải có
LOGO.png  favicon.png  embe1.png
hapu.jpg  green.JPG  nghiado.jpg  hadong.jpg  longbien.jpg
tirak.png  blackbelt.png  canada.png  jaeil.png
```

### Hai ảnh còn thiếu
Website nay hiển thị đủ **7 cơ sở**. Cần bổ sung 2 ảnh vào thư mục gốc:

| Tên file | Cơ sở |
|---|---|
| `giahoa.jpg` | Cơ sở Gia Hoà (TP. Hồ Chí Minh) |
| `halong.jpg`  | Cơ sở Hạ Long (Quảng Ninh) |

Chưa có thì hệ thống tự hiện ảnh thay thế có logo, không vỡ giao diện.

### Ảnh chia sẻ mạng xã hội
Tạo ảnh `og-image.jpg` kích thước **1200×630px** đặt ở thư mục gốc.
Đây là ảnh hiện lên khi ai đó chia sẻ link website qua Facebook/Zalo.
Trước đây website không có ảnh này nên link chia sẻ ra trống trơn.

---

## C. Xem thử trên máy trước khi tải lên

Website nay dùng ES module nên **không mở trực tiếp bằng cách nhấp đúp file** được.
Mở Terminal tại thư mục website và chạy:

```bash
python3 -m http.server 8000
```

Rồi mở trình duyệt vào `http://localhost:8000`.

---

## D. Kiểm tra sau khi triển khai

- [ ] Trang chủ hiện đủ **7 cơ sở**, chia 3 nhóm: Hà Nội (5), TP.HCM (1), Quảng Ninh (1)
- [ ] Thu nhỏ cửa sổ dưới 900px → xuất hiện **nút menu ☰** ở góc phải
- [ ] Bấm **Chỉ đường** trên một cơ sở → mở Google Maps ở chế độ dẫn đường
- [ ] Bấm **Đăng ký** trên một cơ sở → popup hiện bản đồ + form
- [ ] Trong popup bấm **+ Thêm võ sinh** vài lần → thêm được, đánh số lại đúng
- [ ] Gửi thử một đăng ký → xuất hiện dòng mới trong sheet `DangKyTuVan`
- [ ] Đăng nhập bằng tài khoản HLV → chuyển sang `app.html`, thấy hồ sơ và lịch
- [ ] Nhấn F5 trong `app.html` → **vẫn đăng nhập** (trước đây bị văng ra)
- [ ] Đăng xuất rồi đăng nhập tài khoản khác → **không còn dữ liệu người trước**
- [ ] Chia sẻ link lên Facebook → hiện ảnh và mô tả (sau khi có `og-image.jpg`)
