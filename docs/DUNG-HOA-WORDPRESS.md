# DUNG HÒA WEBSITE MỚI VÀ WORDPRESS HIỆN TẠI

## Hiện trạng (khảo sát ngày 22/08/2026)

| | |
|---|---|
| Địa chỉ | `taekwondokids.vn` — WordPress **5.4.2** (phát hành 05/2020) |
| Mã nguồn | `Website/taekwondo-master/` — có đủ theme, plugin, và 3 bản sao lưu CSDL |
| Giao diện | Theme tự viết `taekwondo` (có `header.php`, `footer.php`, `front-page.php`) |
| Bài viết | **9 bài trong 5 năm** — 2020: 4 · 2023: 1 · 2024: 4 · 2025–2026: 0 |
| Đường dẫn bài | `/YYYY/MM/DD/tên-bài/` |
| Trang chủ | Là một **Trang tĩnh** (page-id-2), không phải trang blog |
| Plugin đáng giá | Yoast SEO **Premium**, Advanced Custom Fields **Pro**, Contact Form 7 + CFDB7 |
| REST API | **Đang mở** — `/wp-json/wp/v2/posts` trả dữ liệu bình thường |

---

## Tin tốt: hai hệ thống sống chung được, KHÔNG cần di dời WordPress

`.htaccess` của WordPress có hai dòng quyết định:

```apache
RewriteCond %{REQUEST_FILENAME} !-f      # nếu ĐÚNG là một tệp có thật → không đụng
RewriteCond %{REQUEST_FILENAME} !-d      # nếu ĐÚNG là một thư mục có thật → không đụng
RewriteRule . /index.php [L]             # còn lại mới giao cho WordPress
```

Nghĩa là **tệp tĩnh có thật luôn được phục vụ trực tiếp**, WordPress không can thiệp.
Đã kiểm chứng trên site đang chạy: `/license.txt` và `/readme.html` đều trả về HTTP 200.

### Bản đồ đường dẫn sau khi ghép

| Đường dẫn | Ai phục vụ |
|---|---|
| `/` | **Site mới** — `index.html` |
| `/app.html` | **Site mới** — hệ quản trị |
| `/assets/*` | **Site mới** — CSS, JS, ảnh |
| `/tin-tuc.html` | **Site mới** — danh sách tin, đọc từ WP REST API |
| `/2024/08/10/tên-bài/` | **WordPress** — giữ nguyên URL, không mất SEO |
| `/category/su-kien/` | **WordPress** |
| `/wp-admin/` | **WordPress** — nơi viết bài |

### Việc cần làm: đúng MỘT dòng

Thêm vào `.htaccess`, **phía trên** khối `# BEGIN WordPress`:

```apache
DirectoryIndex index.html index.php
```

Dòng này bảo máy chủ: khi ai đó vào `/`, ưu tiên `index.html` trước `index.php`.
Muốn quay lại bản cũ thì xoá dòng này — hoàn tác trong 5 giây.

### Đồng bộ giao diện cho trang bài viết

Theme `taekwondo` có `header.php` và `footer.php` tách riêng nên làm **child theme** được:
nạp thêm `tokens.css` + `components.css` của site mới, thay phần nav/footer cho khớp.
Bài viết vẫn do WordPress dựng ở phía máy chủ → **SEO và chia sẻ Facebook vẫn hoàn hảo**,
điều mà trang dựng bằng JavaScript không làm được.

---

## Nhưng có ba việc phải xử lý trước khi ghép

### 1. ⚠️ WordPress 5.4.2 đã 6 năm tuổi — đây là rủi ro nghiêm trọng

Phiên bản mới nhất là 6.x. Từ 5.4.2 tới nay có **hàng chục lỗ hổng bảo mật đã công bố**.
Vấn đề không chỉ là website bị tấn công, mà là: sau khi ghép, WordPress sẽ nằm **cùng
tên miền và cùng máy chủ** với hệ thống chứa hồ sơ và ảnh trẻ em. Kẻ tấn công chiếm được
WordPress là đứng ngay bên trong hệ thống đó.

**Không được ghép khi chưa nâng cấp.** Rủi ro: theme tự viết và plugin cũ có thể vỡ khi
lên WP 6 + PHP 8 — cần dựng bản thử nghiệm để kiểm tra trước.

### 2. ⚠️ Tên đăng nhập quản trị đang bị lộ

`/wp-json/wp/v2/users` trả về công khai tài khoản có tên đăng nhập là **`admin`**.
Kẻ tấn công biết sẵn tên đăng nhập thì chỉ còn phải dò mật khẩu. Cần:
- Đổi tên đăng nhập khác `admin`
- Chặn endpoint `users` của REST API
- Bật xác thực hai lớp cho `wp-admin`
- Chặn truy cập `/readme.html` và `/license.txt` (đang để lộ phiên bản)

### 3. Contact Form 7 đang thu thông tin khách

Form đăng ký hiện tại lưu qua plugin CFDB7. Site mới có form riêng ghi vào Google Sheet.
Cần chốt: giữ một nơi duy nhất, tránh mỗi nơi một nửa danh sách khách.

---

## Câu hỏi thẳng thắn: có đáng duy trì WordPress không?

**9 bài trong 5 năm** — trung bình chưa tới 2 bài mỗi năm, và 2025–2026 chưa có bài nào.

Để phục vụ tần suất đó, đang phải gánh:
- Nghĩa vụ cập nhật bảo mật WordPress + 9 plugin, liên tục, mãi mãi
- Phí bản quyền Yoast SEO Premium và ACF Pro hằng năm
- Rủi ro bảo mật đứng chung tên miền với dữ liệu trẻ em
- Chi phí hosting PHP + MySQL (site mới chỉ cần hosting tĩnh)

### Hai phương án

**Phương án A — Sống chung** *(chọn nếu sắp tới sẽ đăng bài đều đặn)*
- Site mới ở gốc, WordPress giữ nguyên phục vụ bài viết
- Đổi 1 dòng `DirectoryIndex`, làm child theme nhỏ
- **Bắt buộc**: nâng cấp WP 5.4.2 → 6.x, vá 3 lỗ hổng nêu trên
- Ưu: giữ Yoast Premium, không mất URL nào, marketing dùng công cụ đã quen
- Nhược: phải nuôi WordPress mãi mãi

**Phương án B — Rút gọn** *(chọn nếu tần suất vẫn ~2 bài/năm)*
- Chuyển 9 bài sang hệ mới (ít, làm tay được trong một buổi)
- Đặt chuyển hướng 301 từ URL cũ sang URL mới để giữ thứ hạng Google
- Gỡ WordPress khỏi hosting, giữ bản sao lưu
- Soạn bài bằng **Google Docs** theo thiết kế đã có ở `docs/ANH-VA-CMS.md`
- Ưu: hết lo bảo mật, hết phí bản quyền, hosting rẻ hơn, một hệ thống duy nhất
- Nhược: mất Yoast Premium (phải tự viết thẻ meta — việc này đã làm sẵn ở site mới)

### Khuyến nghị

**Phương án B.** Với 2 bài/năm, WordPress là một cỗ máy quá lớn so với nhu cầu, mà cái
giá phải trả — nghĩa vụ vá bảo mật vĩnh viễn ngay cạnh dữ liệu trẻ em — là không tương xứng.

Đảo lại nếu: bạn sắp có người phụ trách nội dung và định đăng đều đặn hằng tuần.
Khi đó Phương án A đáng giá, và WordPress thật sự là công cụ tốt cho việc đó.

> Dù chọn phương án nào, **ba việc bảo mật ở trên vẫn phải làm ngay**, vì WordPress
> đang chạy công khai ngay lúc này.
