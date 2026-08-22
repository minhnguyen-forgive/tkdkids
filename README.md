# Taekwondo Kids Việt Nam — Website & Hệ quản trị

Website giới thiệu và hệ thống quản lý của Trung tâm Taekwondo Kids Việt Nam.
Nền tảng: HTML/CSS/JavaScript thuần (ES module) + Google Apps Script + Google Sheets.

## Cấu trúc

```
index.html              Trang giới thiệu (marketing) + cổng đăng nhập
app.html                Hệ quản trị sau đăng nhập

assets/
  css/
    tokens.css          Biến màu, chữ, reset, hiệu ứng
    components.css      Nút, form, modal, badge, toast
    landing.css         Giao diện trang giới thiệu
    app.css             Giao diện khu quản trị
  js/
    core/               Lớp lõi dùng chung
      config.js         ⚙️ Cấu hình tập trung: API, cơ sở, ca học, cấp đai, vai trò
      api.js            Giao tiếp máy chủ, phân loại lỗi
      dom.js            Thao tác DOM + escape chống XSS
      format.js         Ngày tháng, tiền tệ, kiểm tra dữ liệu
      image.js          Thu nhỏ ảnh trước khi gửi
      store.js          Phiên đăng nhập & trạng thái
      ui.js             Modal, toast, hộp thoại
    landing/            Trang giới thiệu
    app/                Khu quản trị

backend/                Mã Google Apps Script (dán vào project Apps Script)
  Setup.gs              Tạo toàn bộ cấu trúc Sheet — chạy 1 lần
  Sheets.gs             Lớp truy cập dữ liệu (đọc theo chỉ mục)
  Api_DangKy.gs         API đăng ký tư vấn
  SCHEMA.md             Cấu trúc dữ liệu & quyết định kiến trúc

docs/
  KE-HOACH.md           Lộ trình 7 giai đoạn + tiến độ
  TRIEN-KHAI.md         Hướng dẫn triển khai từng bước
  ANH-VA-CMS.md         Thiết kế lưu trữ ảnh & CMS nội dung
```

## Chạy thử tại máy

Website dùng ES module nên **không mở trực tiếp bằng cách nhấp đúp file**.

```bash
python3 -m http.server 8000
```

Rồi mở `http://localhost:8000`.

## Tiến độ

| GĐ | Nội dung | Trạng thái |
|---|---|---|
| 0 | Nền tảng: tách file, thư viện chung, sửa lỗi | ✅ Xong |
| 1 | Cơ sở & popup đăng ký nhiều võ sinh | ✅ Xong |
| 2 | Đăng nhập thống nhất & nền tảng dữ liệu | Đang làm |
| 3 | Học bạ online của võ sinh | |
| 4 | Học phí, ưu đãi, nhắc đóng tiền | |
| 5 | Giao diện lễ tân | |
| 6 | Tin tức & CMS | |
| 7 | Hoàn thiện, tối ưu | |

Chi tiết ở [docs/KE-HOACH.md](docs/KE-HOACH.md).

## Ảnh cần bổ sung

Các tệp ảnh không nằm trong repo (thuộc về hosting). Cần có ở thư mục gốc:

`favicon.png` `embe1.png` `og-image.jpg`
`hapu.jpg` `green.JPG` `nghiado.jpg` `hadong.jpg` `longbien.jpg` `giahoa.jpg` `halong.jpg`
`tirak.png` `blackbelt.png` `canada.png` `jaeil.png`

Thiếu ảnh nào thì hệ thống tự hiện ảnh thay thế, giao diện không vỡ.

> ⚠️ **Tên tệp phân biệt chữ hoa/thường.** macOS và Windows không phân biệt, nhưng
> GitHub Pages và phần lớn hosting Linux thì có. Đặt tên tệp đúng y như trong danh sách
> trên, nếu không ảnh sẽ không hiện dù mở ở máy vẫn thấy bình thường.
> Logo dùng tên `logo.png` (chữ thường).
