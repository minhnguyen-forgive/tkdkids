# Tin tức & Thư viện ảnh — cách thêm và sửa nội dung

## 1. Có những gì

| Trang | Tệp | Nội dung |
|---|---|---|
| Danh sách tin | `tin-tuc.html` | Bài nổi bật + lưới tin + lọc chuyên mục + nút xem thêm |
| Đọc bài viết | `bai-viet.html?id=…` | Bố cục kiểu báo: bìa lớn, thanh tiến độ đọc, chia sẻ, khối đăng ký, **tin liên quan** |
| Thư viện ảnh | `thu-vien.html` | Album gom **theo từng năm**, bấm số năm để nhảy tới |
| Xem album | `album.html?id=…` | Lưới ảnh kiểu gạch xây + khung phóng to (bàn phím ←/→/Esc, vuốt trên điện thoại) |

Trang chủ có thêm hai khu vực `#news` và `#gallery` tự lấy 3 mục mới nhất.

## 2. Dữ liệu nằm ở đâu

Toàn bộ nội dung nằm trong hai tệp:

- `data/tin-tuc.json` — bài viết
- `data/album.json` — album ảnh

Ảnh nằm trong `assets/img/tin-tuc/` (bản lớn, tối đa 1400px) và
`assets/img/tin-tuc-thumb/` (bản nhỏ 560px dùng cho thẻ và lưới).
**Hai thư mục phải có tệp trùng tên nhau.**

### Vì sao là tệp JSON chứ không phải Google Sheet

Tin tức và album là nội dung công khai, chỉ để đọc. Tải một tệp JSON từ máy chủ
web mất khoảng **30ms**, còn gọi Google Apps Script mất **0,5–2 giây** và tốn
hạn ngạch. Với loại nội dung này thì tệp tĩnh nhanh hơn hẳn.

Khi nào muốn chuyển sang quản trị bằng Google Sheet, chỉ cần sửa **duy nhất hàm
`loadJson()`** trong `assets/js/core/content.js` thành lời gọi `callApi()`.
Toàn bộ phần còn lại của website không phải đổi một dòng nào.

## 3. Thêm một bài viết bằng tay

Mở `data/tin-tuc.json`, thêm một khối vào đầu mảng `articles`:

```json
{
  "id": "ky-thi-thang-dai-lan-1-2026",
  "title": "Kỳ thi thăng đai lần 1 năm 2026",
  "date": "2026-03-15",
  "category": "Sự kiện",
  "excerpt": "Câu tóm tắt hiện trên thẻ tin, khoảng 150–200 ký tự…",
  "cover": "assets/img/tin-tuc/ky-thi-thang-dai-lan-1-2026-bia.jpg",
  "coverThumb": "assets/img/tin-tuc-thumb/ky-thi-thang-dai-lan-1-2026-bia.jpg",
  "readMinutes": 3,
  "body": "<p>Đoạn mở đầu.</p>\n<h2>Tiêu đề mục</h2>\n<p>Nội dung.</p>"
}
```

Lưu ý:

- **`id`** là địa chỉ của bài (`bai-viet.html?id=…`). Chỉ dùng chữ thường không
  dấu và dấu gạch ngang. **Đặt rồi thì đừng đổi**, đổi là mọi liên kết đã chia sẻ sẽ hỏng.
- **`category`** quyết định các nút lọc và cách chọn *Tin liên quan*. Nếu cả
  website chỉ có một chuyên mục thì hàng nút lọc tự ẩn đi.
- **`body`** dùng được `<p> <h2> <h3> <ul><li> <strong> <em> <a> <blockquote>`
  và ảnh có chú thích:
  ```html
  <figure>
    <img src="assets/img/tin-tuc/ten-anh.jpg" alt="Mô tả ảnh" loading="lazy">
    <figcaption>Chú thích dưới ảnh</figcaption>
  </figure>
  ```

## 4. Thêm một album ảnh

Mở `data/album.json`, thêm vào mảng `albums`:

```json
{
  "id": "ky-thi-thang-dai-lan-1-2026",
  "year": 2026,
  "title": "Kỳ thi thăng đai lần 1 – 2026",
  "place": "ĐH Sư phạm Hà Nội",
  "date": "2026-03-15",
  "cover": "assets/img/tin-tuc-thumb/ky-thi-thang-dai-lan-1-2026-bia.jpg",
  "articleId": "ky-thi-thang-dai-lan-1-2026",
  "photos": [
    { "src": "assets/img/tin-tuc/anh-1.jpg", "thumb": "assets/img/tin-tuc-thumb/anh-1.jpg", "caption": "" }
  ]
}
```

- **`year`** là thứ quyết định album nằm ở nhóm năm nào — không phải `date`.
  Nhóm năm tự sinh ra từ các giá trị `year` có mặt, thêm năm mới không phải sửa gì thêm.
- **`articleId`** không bắt buộc. Có thì cuối album hiện nút *Đọc bài viết về sự kiện này*.

## 5. Chuẩn bị ảnh

Ảnh máy ảnh thường nặng 3–5MB, đưa thẳng lên web là quá nặng. Nén trước bằng
lệnh sau (chạy trong Terminal, ở thư mục gốc website):

```bash
# đổi ĐƯỜNG-DẪN-ẢNH-GỐC thành thư mục chứa ảnh chưa nén
for f in ĐƯỜNG-DẪN-ẢNH-GỐC/*; do
  b=$(basename "$f"); b="${b%.*}"
  sips -s format jpeg -s formatOptions 50 -Z 1400 "$f" --out "assets/img/tin-tuc/$b.jpg"
  sips -s format jpeg -s formatOptions 48 -Z 560  "$f" --out "assets/img/tin-tuc-thumb/$b.jpg"
done
```

Mức này giảm khoảng **70%** dung lượng mà mắt thường không phân biệt được.

> **Ảnh có mặt trẻ em là dữ liệu cá nhân nhạy cảm** theo Nghị định 13/2023/NĐ-CP.
> Chỉ đăng ảnh đã được phụ huynh đồng ý, và không ghi kèm họ tên đầy đủ của võ sinh
> trong chú thích ảnh công khai.

## 6. Lấy bài và ảnh từ fanpage Facebook

Facebook đã chặn hoàn toàn việc đọc nội dung Trang từ bên ngoài: tải trang web
trả về lỗi **400**, gọi Graph API không mã trả về *"Provide valid app ID"*.
Cách duy nhất còn dùng được là Graph API kèm **Page Access Token** do chính
quản trị viên Trang tạo.

Script `tools/nhap-tu-facebook.mjs` làm sẵn phần còn lại: tải bài, tải ảnh, nén
ảnh, ghép vào hai tệp JSON, và **bỏ qua bài đã nhập từ lần trước**.

Lấy mã (làm một lần, khoảng 5 phút):

1. Vào <https://developers.facebook.com/tools/explorer/>
2. Ô **Meta App** — chọn hoặc tạo một ứng dụng loại Business
3. Ô **User or Page** — chọn *Page Access Token*, rồi chọn fanpage Taekwondo Kids
4. Ô **Permissions** — thêm `pages_read_engagement` và `pages_read_user_content`
5. Bấm **Generate Access Token**, đăng nhập và cấp quyền
6. Sao chép chuỗi mã dài hiện ra

Chạy:

```bash
# xem trước sẽ nhập những gì, chưa ghi tệp nào
FB_TOKEN='dán_mã_vào_đây' node tools/nhap-tu-facebook.mjs --thu

# nhập thật, 25 bài gần nhất
FB_TOKEN='dán_mã_vào_đây' node tools/nhap-tu-facebook.mjs --so-bai 25
```

Bài nào có từ 3 ảnh trở lên thì script tạo luôn một album ảnh cho bài đó.

Sau khi chạy, mở `data/tin-tuc.json` sửa lại `title` và `category` cho gọn —
script lấy tạm dòng đầu của bài đăng làm tiêu đề, thường cần biên tập lại.

> Mã truy cập chỉ sống 1–2 giờ và **không được lưu vào tệp trong repo**
> (repo đang để công khai). Hết hạn thì lấy mã mới.

## 7. Những chỗ đã biết là chưa chuẩn

Nội dung hiện tại được chuyển từ WordPress cũ sang. Có ba điểm cần bạn sửa lại
trong `data/tin-tuc.json`:

| Bài | Vấn đề |
|---|---|
| `taekwondo-kids-tong-ket-2021-hanh-trinh-day-tu-hao` | `date` ghi 2020-08-09 nhưng bài tổng kết năm 2021 |
| `giai-vo-dich-taekwondo-cac-lua-tuoi-quoc-gia-cj-2022` | `date` ghi 2020-08-09 nhưng giải diễn ra tháng 7/2022 |
| `giai-thi-dau-taekwondo-tre-thieu-nien-nguoi-khuyet-tat-chau-` | `date` ghi 2020-08-09, cần xác nhận năm thật |

Đây là ngày đăng sai sẵn trên WordPress cũ, không phải lỗi khi chuyển sang.
Sửa trường `date` là xong; riêng album thì sửa trường `year` trong `data/album.json`.

Ngoài ra, **4 bài của năm 2024 chỉ còn ảnh bìa**: ảnh trong thân bài của các bài đó
được nhúng thẳng từ Facebook bằng liên kết có hạn sử dụng, nay đã hết hạn và
trả về lỗi 403 — trên website cũ chúng cũng đang vỡ. Thêm ảnh cho các bài này
bằng cách chạy script ở mục 6 hoặc tải ảnh thủ công theo mục 5.
