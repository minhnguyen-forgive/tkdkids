# THIẾT KẾ: LƯU TRỮ ẢNH & CMS NỘI DUNG

## PHẦN 1 — ẢNH LƯU Ở ĐÂU?

### Nguyên tắc: Sheet giữ đường dẫn, Drive giữ tệp

Google Sheets **không phải nơi chứa ảnh**. Một ô Sheet tối đa 50.000 ký tự,
trong khi một ảnh base64 nhỏ nhất cũng đã ~40.000 ký tự — nhét vào là sheet
phình ra và mọi thao tác đọc chậm hẳn.

Cách đúng, và hệ thống của bạn **đã dùng sẵn** cho ảnh điểm danh:

```
Trình duyệt  →  thu nhỏ ảnh  →  Apps Script  →  lưu tệp vào Drive
                                              └→ ghi URL vào ô Sheet
```

### Cấu trúc thư mục Drive

```
📁 TaekwondoKids-Data/
   ├── 📁 AnhVoSinh/          ảnh hồ sơ võ sinh — 1 tệp / võ sinh, ghi đè khi đổi
   │      HP260012.jpg
   ├── 📁 AnhDiemDanh/        selfie điểm danh, chia theo tháng để dọn dễ
   │      ├── 📁 2026-08/
   │      └── 📁 2026-09/
   ├── 📁 AnhBaiViet/         ảnh minh hoạ tin tức
   └── 📁 TaiLieu/            quyết định thăng đai, giấy tờ scan
```

Lưu ID thư mục vào **Script Properties** (`FOLDER_ANH_VOSINH`, `FOLDER_ANH_DIEMDANH`...)
để không phải hard-code trong code.

### Thu nhỏ ảnh ngay tại trình duyệt — BẮT BUỘC

Đã cài đặt ở `assets/js/core/image.js`. Kết quả đo thực tế:

| Loại ảnh | Trước | Sau | Giảm |
|---|---|---|---|
| Selfie điểm danh (1920×1080) | ~1.320 KB | **29 KB** | 98% |
| Ảnh hồ sơ võ sinh (2000×2000) | ~3.276 KB | **37 KB** | 99% |

Tác động dung lượng Drive mỗi năm (60 HLV × 20 buổi × 12 tháng):

| | Không thu nhỏ | Có thu nhỏ |
|---|---|---|
| Ảnh điểm danh | **3,6 GB/năm** | 0,54 GB/năm |
| Ảnh 2.100 võ sinh | 4,1 GB | 0,09 GB |

Drive miễn phí (Gmail cá nhân) chỉ có **15 GB dùng chung với Gmail**.
Không thu nhỏ thì đầy trong 4–6 năm. Có thu nhỏ thì dùng được hàng chục năm.

### Chính sách dọn ảnh điểm danh

Ảnh selfie chỉ có giá trị tới lúc duyệt xong bảng lương. Đặt **trigger hằng tháng**:
xoá ảnh điểm danh của các tháng đã duyệt lương xong và cũ hơn 6 tháng.
Bản ghi trong Sheet vẫn giữ (thời gian, GPS, sĩ số) — chỉ tệp ảnh bị xoá.

### ⚠️ Quyền riêng tư ảnh trẻ em — cần xử lý đúng

Đây là **ảnh trẻ em**, thuộc nhóm dữ liệu cá nhân nhạy cảm theo
**Nghị định 13/2023/NĐ-CP** về bảo vệ dữ liệu cá nhân. Ba việc cần làm:

1. **KHÔNG đặt tệp ở chế độ "Bất kỳ ai có liên kết đều xem được".**
   Đây là lỗi phổ biến nhất khi dùng Drive làm kho ảnh. Link Drive kiểu đó
   không đoán được nhưng cũng không hết hạn — lộ một lần là lộ vĩnh viễn.

2. **Cho ảnh đi qua Apps Script kiểm tra quyền** thay vì trả link Drive trực tiếp:
   ```
   ...exec?action=anh&maHV=HP260012   →  Apps Script kiểm tra phiên đăng nhập
                                          →  chỉ trả ảnh nếu là phụ huynh của bé,
                                             HLV cơ sở đó, lễ tân, hoặc admin
   ```
   Đổi lại tốc độ chậm hơn link trực tiếp một chút — đáng để đánh đổi.

3. **Xin phép phụ huynh bằng văn bản** khi thu thập ảnh, và ghi lại việc đã xin phép
   (thêm cột `dongYDungAnh` + `ngayDongY` vào sheet `VoSinh`).
   Đặc biệt quan trọng nếu định dùng ảnh võ sinh cho quảng cáo/tin tức.

---

## PHẦN 2 — CMS QUẢN TRỊ NỘI DUNG (TIN TỨC & SỰ KIỆN)

### Ba phương án đã cân nhắc

| | Ưu | Nhược |
|---|---|---|
| **A. Viết bài thẳng trong ô Sheet** | Đơn giản nhất | Không định dạng được, chèn ảnh cực khổ, viết bài dài trong ô Sheet rất khó chịu |
| **B. Tự dựng trình soạn thảo trong `app.html`** | Kiểm soát hoàn toàn | Tốn nhiều công, và kết quả vẫn kém xa Google Docs |
| **C. Google Docs làm nơi soạn, Sheet giữ thông tin bài** ⭐ | Người viết dùng công cụ đã quen, có sẵn định dạng/ảnh/lịch sử sửa/nhiều người cùng viết | Cần bước chuyển Docs → HTML |

### Chọn phương án C

Người viết tin tức của trung tâm gần như chắc chắn đã biết dùng Google Docs.
Chọn C là họ **không phải học gì mới**, mà lại có sẵn: định dạng, chèn ảnh,
gợi ý chỉnh sửa, lịch sử phiên bản, nhiều người viết cùng lúc — miễn phí.

### Cách vận hành

```
1. Người viết soạn bài trong Google Docs (thư mục "Bài viết")
2. Vào app.html → Quản lý tin tức → Thêm bài
   Điền: tiêu đề, đường dẫn, ảnh bìa, mô tả ngắn, chuyên mục, dán link Docs
3. Bấm "Xuất bản"
   → Apps Script đọc Docs, chuyển thành HTML sạch
   → Tách ảnh trong Docs ra, lưu vào Drive
   → LƯU HTML ĐÃ DỰNG vào ô `noiDungHtml`
4. Website đọc HTML đã dựng sẵn — nhanh, không phải chuyển đổi lại mỗi lượt xem
```

Điểm mấu chốt: **việc chuyển đổi tốn kém chỉ chạy một lần lúc xuất bản**,
không chạy mỗi lần có người đọc bài. Sửa bài thì sửa trong Docs rồi bấm
"Xuất bản lại".

### Sheet `BaiViet`

| Cột | Ghi chú |
|---|---|
| id | |
| duongDan | Phần đuôi URL, VD `giai-dau-he-2026` — duy nhất |
| tieuDe | |
| moTaNgan | Dùng cho thẻ tin và mô tả chia sẻ Facebook |
| chuyenMuc | `Sự kiện` / `Thành tích` / `Thông báo` / `Kiến thức` |
| anhBia | URL ảnh, tỉ lệ 1200×630 để chia sẻ đẹp |
| docId | ID Google Docs chứa nội dung gốc |
| noiDungHtml | HTML đã dựng sẵn (do hệ thống ghi, đừng sửa tay) |
| tacGia, coSo | `ALL` nếu là tin toàn hệ thống |
| ngayXuatBan, ngayCapNhat | |
| trangThai | `Nháp` / `Đã xuất bản` / `Ẩn` |
| luotXem | |
| noiBat | `TRUE` để ghim lên đầu trang chủ |

### Chuyển Google Docs → HTML sạch

Không dùng chức năng "Export as HTML" của Google — nó sinh ra hàng đống
`<span style="...">` rác. Thay vào đó duyệt từng phần tử bằng `DocumentApp`
và sinh HTML ngữ nghĩa:

| Trong Docs | Sinh ra |
|---|---|
| Heading 1 / 2 / 3 | `<h2>` / `<h3>` / `<h4>` (giữ `<h1>` cho tiêu đề bài) |
| Đoạn văn thường | `<p>` |
| Danh sách | `<ul>` / `<ol>` |
| Ảnh chèn trong Docs | Lưu ra Drive → `<figure><img loading="lazy">` |
| In đậm / nghiêng / link | `<strong>` / `<em>` / `<a rel="noopener">` |
| Bảng | `<table>` bọc trong khung cuộn ngang |

Chỉ giữ đúng những thẻ trên — mọi thứ khác bị loại. Vừa sạch, vừa là
hàng rào chống chèn mã độc qua nội dung bài viết.

### ⚠️ Hạn chế về SEO cần biết trước

Bài viết dựng bằng JavaScript ở phía trình duyệt thì **Google lập chỉ mục kém**,
và khi chia sẻ lên Facebook/Zalo sẽ **không hiện đúng tiêu đề, ảnh của từng bài**
(vì Facebook không chạy JavaScript, nó chỉ đọc thẻ `<meta>` trong HTML thô).

Có hai hướng xử lý, chọn theo mục đích của trang tin tức — xem `docs/KE-HOACH.md`.
