# KẾ HOẠCH XÂY DỰNG HỆ THỐNG TAEKWONDO KIDS VIỆT NAM

> Cập nhật: 22/08/2026 · Nền tảng: HTML/CSS/JS thuần + Google Apps Script + Google Sheets

## 1. Phạm vi hệ thống

Hệ thống gồm 2 phần chạy trên 2 trang riêng biệt:

| Trang | Vai trò | Đối tượng |
|---|---|---|
| `index.html` | Trang giới thiệu (marketing) + cổng đăng nhập | Khách vãng lai, phụ huynh tiềm năng |
| `app.html` | Toàn bộ hệ quản trị sau đăng nhập | Phụ huynh, HLV, Lễ tân, Admin |

Tách 2 trang để trang giới thiệu tải nhanh (không kéo theo ~200KB code quản trị),
và để hệ quản trị mở rộng thoải mái mà không phình trang chủ.

## 2. Phân quyền

| Vai trò | Mã | Quyền |
|---|---|---|
| Phụ huynh | `phu_huynh` | Xem học bạ con mình, xem học phí/công nợ, nhận thông báo |
| Huấn luyện viên | `hlv` | Lịch dạy, chấm công, nghỉ phép, nhận xét võ sinh, xem học bạ võ sinh cơ sở mình |
| HLV Trưởng | `hlv_truong` | Như HLV + duyệt nghỉ phép/chấm công/lương + lịch chung cơ sở |
| Lễ tân | `le_tan` | Tạo mã học viên, thu học phí, áp ưu đãi, quản lý hồ sơ võ sinh tại cơ sở |
| Admin | `admin` | Toàn quyền toàn hệ thống |

## 3. Lộ trình thực hiện

### GIAI ĐOẠN 0 — Nền tảng  ✅ XONG (22/08/2026)
- [x] Tách file: 1 file 142KB → `index.html` (24KB) + `app.html` + 4 CSS + 12 module JS
- [x] Thư viện dùng chung: `api.js`, `dom.js` (escape XSS), `ui.js` (modal/toast), `format.js`, `store.js`, `config.js`
- [x] Sửa lỗi: menu mobile, đăng xuất dọn sạch dữ liệu, nút Zalo, ảnh alt/lazy, bỏ placeholder chết
- [x] Meta SEO + Open Graph + JSON-LD
- [x] Modal đóng bằng ESC / click nền / khoá cuộn nền / trả tiêu điểm
- [x] Thay 42 `alert()` bằng toast + hộp thoại xác nhận
- [x] Phiên đăng nhập sống sót khi F5
- [x] Sửa: lịch dạy "ma" khi huỷ modal · sửa/xoá được mọi ghi chú trong ngày · thanh tháng sai chỗ

### GIAI ĐOẠN 1 — Cơ sở & Đăng ký tư vấn  ✅ XONG (22/08/2026)
- [x] Dữ liệu 7 cơ sở tập trung trong `config.js`, nhóm theo khu vực
- [x] Card cơ sở: ảnh, địa chỉ, nút **Chỉ đường** + nút **Đăng ký**
- [x] Popup đăng ký: bản đồ nhúng bấm được để chỉ đường, form nhiều võ sinh (nút `+`, tối đa 5)
- [x] Kiểm tra SĐT Việt Nam, email, ngày sinh — cả phía trình duyệt lẫn máy chủ
- [x] Backend `dangKyTuVan` ghi sheet `DangKyTuVan` + chống gửi trùng 5 phút + email báo lead
- [x] Đã kiểm thử: 27/27 tương tác popup · 12/12 kiểm tra dữ liệu backend

### GIAI ĐOẠN 2 — Đăng nhập & Nền tảng dữ liệu  ⬅️ TIẾP THEO
- [ ] Thiết kế đầy đủ Google Sheet (xem `backend/SCHEMA.md`)
- [ ] Đăng nhập thống nhất 1 cửa, tự nhận vai trò, lưu phiên (không mất khi F5)
- [ ] Backend luôn kiểm tra lại vai trò ở mỗi thao tác nhạy cảm
- [ ] Đổi mật khẩu, quên mật khẩu

### GIAI ĐOẠN 3 — Học bạ online của võ sinh
- [ ] Thông tin cơ bản: họ tên, ngày sinh, mã HV trung tâm, mã liên đoàn, cơ sở, ngày nhập học
- [ ] Cấp đai hiện tại + **timeline thi thăng cấp** (mỗi kỳ thi: ngày, đai từ→đến, kết quả, số quyết định)
- [ ] Chỉ số sức khoẻ theo thời gian: chiều cao, cân nặng, BMI, + biểu đồ tăng trưởng
- [ ] Nhận xét HLV theo tháng (tận dụng chức năng có sẵn)
- [ ] In/xuất học bạ PDF

### GIAI ĐOẠN 4 — Học phí
- [ ] Bảng giá theo cơ sở & gói học (số buổi/tuần × số tháng)
- [ ] Danh mục ưu đãi: giảm %, giảm tiền, tặng tháng — áp nhiều ưu đãi cùng lúc
- [ ] Công thức tính thực nộp minh bạch, hiển thị từng bước trừ
- [ ] Lịch sử đóng học phí, công nợ, hạn đóng kỳ tới
- [ ] Nhắc đóng học phí + thông báo trong app

### GIAI ĐOẠN 5 — Giao diện Lễ tân
- [ ] Tạo mã học viên mới (tự sinh theo quy tắc, chống trùng)
- [ ] Hồ sơ võ sinh: tạo/sửa, gắn phụ huynh, phân cơ sở
- [ ] Thu học phí: chọn gói → chọn ưu đãi → hệ thống tính thực nộp → ghi nhận → sinh số biên lai
- [ ] Danh sách võ sinh theo cơ sở, lọc theo trạng thái/công nợ
- [ ] Nhập kết quả thi thăng cấp, cập nhật chỉ số sức khoẻ

### GIAI ĐOẠN 6 — Nội dung: Tin tức, Thư viện ảnh, Kiến thức  ✅ PHẦN GIAO DIỆN ĐÃ XONG (22/08/2026)
Quyết định (22/08/2026): **làm bản đơn giản trước, thiết kế sẵn để nâng cấp SEO sau**.
Hosting hiện tại: cPanel/FTP → tải file thủ công.

Đã làm:
- [x] `tin-tuc.html` — bài nổi bật + lưới tin + lọc chuyên mục + xem thêm
- [x] `bai-viet.html` — bố cục đọc kiểu báo, thanh tiến độ đọc, chia sẻ, khối đăng ký, **tin liên quan**
- [x] `thu-vien.html` — album gom **theo năm**, thanh chọn năm dính theo màn hình
- [x] `album.html` — lưới ảnh kiểu gạch xây + khung phóng to (bàn phím, vuốt)
- [x] Khối "Tin tức" và "Thư viện ảnh" trên trang chủ
- [x] Chuyển **9 bài viết thật** từ WordPress cũ sang, kèm 18 ảnh đã nén (11MB → 3,6MB)
- [x] `tools/nhap-tu-facebook.mjs` — nhập bài và ảnh từ fanpage qua Graph API
- [x] `docs/TIN-TUC-VA-ALBUM.md` — hướng dẫn thêm/sửa nội dung

Phần Kiến thức Taekwondo:
- [x] `kien-thuc.html` — trang tổng của chuyên mục
- [x] `thi-len-dai.html` + **7 trang HTML tĩnh** cho 7 cấp đai (mỗi cấp một địa chỉ riêng,
      có video, giáo trình 5 phần, JSON-LD `Course`) — chuyển từ khối tab của web cũ
- [x] `thuat-ngu-taekwondo.html` — bảng tra 48 thuật ngữ, tìm được cả khi gõ không dấu
- [x] Khung video chỉ nạp YouTube khi người xem bấm (nhanh hơn, không đặt cookie sớm)
- [x] Thanh điều hướng có menu con; khu vực Kiến thức trên trang chủ
- [x] `docs/NOI-DUNG-CHUYEN-MON.md` — chiến lược nội dung 4 trụ + kế hoạch 90 ngày
- [x] `tools/kiem-tra.mjs` — kiểm tra thẻ HTML, ngoặc CSS, tệp thiếu, nav lệch, tỉ lệ ảnh
- [ ] Trang hồ sơ huấn luyện viên *(việc có sức bật SEO lớn nhất — xem mục 3 của NOI-DUNG-CHUYEN-MON.md)*
- [ ] 8 trang bài quyền Taegeuk + 6–8 trang đòn cơ bản
- [ ] Huấn luyện viên trưởng duyệt bảng thuật ngữ và bổ sung mục "Kang-yeok"

Còn lại:
- [ ] Sửa `date` của 3 bài bị sai ngày đăng từ WordPress cũ (xem mục 7 của `TIN-TUC-VA-ALBUM.md`)
- [ ] Bổ sung ảnh cho 4 bài năm 2024 (ảnh cũ nhúng từ Facebook đã hết hạn)
- [ ] Chuyển nguồn dữ liệu sang Sheet `BaiViet` khi cần lễ tân tự đăng bài
      (chỉ phải sửa hàm `loadJson()` trong `assets/js/core/content.js`)

**Nâng cấp SEO (làm sau, khi cần chạy tuyển sinh):**
- [ ] Apps Script sinh file HTML tĩnh cho từng bài (có sẵn thẻ meta + Open Graph riêng)
- [ ] Đóng gói ZIP để tải lên hosting qua cPanel
- [ ] Sinh `sitemap.xml` + `rss.xml`

> Vì sao cần: Facebook/Zalo không chạy JavaScript — chia sẻ bài viết dựng bằng JS
> sẽ không hiện đúng tiêu đề và ảnh của bài đó. Google cũng lập chỉ mục kém.

### BỐ CỤC TRANG CHỦ  ✅ SẮP XẾP LẠI (24/08/2026)

Thứ tự mới: Banner → Tin tức → Hệ thống cơ sở → **Huấn luyện viên** → Lịch sử →
Đối tác → Ưu đãi → Kiến thức → Album ảnh.

- [x] Section **Huấn luyện viên** tự chuyển slide 5 giây/người, có hiệu ứng xoay
      thẻ theo trục dọc và xếp chồng chiều sâu (`docs/HUAN-LUYEN-VIEN.md`)
- [x] Hệ thống cơ sở chuyển sang **3 tab theo tỉnh** thay vì trải dài từ trên xuống
- [x] Bỏ form đăng ký học thử — chuyển hết sang CTA đăng ký của từng cơ sở
- [x] Bỏ section tra cứu; nút trên thanh điều hướng đổi thành **Đăng nhập**,
      mở popup ngay tại chỗ, dùng chung cho cả 15 trang
- [ ] Bổ sung cấp đẳng + ảnh chân dung của huấn luyện viên (xem `HUAN-LUYEN-VIEN.md`)
- [ ] Dựng chi tiết giao diện phân vùng quản trị theo vai trò trong `app.html`

### GIAI ĐOẠN 7 — Hoàn thiện
- [ ] Dashboard Admin: doanh thu, sĩ số, tỉ lệ duy trì theo cơ sở
- [ ] Tối ưu tốc độ, thay Font Awesome bằng SVG, PWA (cài lên màn hình điện thoại)
- [ ] Sao lưu dữ liệu tự động
- [ ] Trigger dọn ảnh điểm danh cũ (giữ 6 tháng, xoá sau khi duyệt lương)

## 4. Nguyên tắc kỹ thuật xuyên suốt

1. **Không bao giờ chèn dữ liệu thô vào HTML** — mọi giá trị từ server đi qua `esc()`.
2. **Backend là nơi quyết định quyền** — frontend ẩn nút chỉ để cho gọn mắt, không phải để bảo mật.
3. **Một nguồn sự thật** — danh sách cơ sở, ca học, bảng giá khai báo 1 nơi duy nhất.
4. **Tách lớp dữ liệu** — mọi truy cập Sheets đi qua `Sheets.gs`; sau này đổi sang CSDL khác chỉ sửa file đó.
5. **Tiền bạc phải có vết** — mọi giao dịch học phí ghi rõ ai thu, lúc nào, số biên lai; không sửa đè, chỉ ghi bản điều chỉnh.
6. **Sheet giữ đường dẫn, Drive giữ tệp** — không bao giờ nhét ảnh vào ô Sheet. Ảnh luôn thu nhỏ tại trình duyệt trước khi gửi (xem `docs/ANH-VA-CMS.md`).
7. **Ảnh trẻ em là dữ liệu nhạy cảm** — không đặt Drive ở chế độ "ai có link cũng xem"; cho ảnh đi qua Apps Script kiểm tra quyền (Nghị định 13/2023/NĐ-CP).
