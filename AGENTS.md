# Công thức cho agent (omp, Claude)

## Kiểm tra trước khi commit
```bash
node tools/kiem-tra.mjs     # phải ra "✓ không có lỗi"
```

## Sửa nội dung thi lên đai
Nội dung 9 trang `thi-len-dai-cap-*.html`, phần chính của `thi-len-dai.html`, thanh lộ trình ở
`kien-thuc.html` và danh sách "Thi lên đai theo cấp" ở chân mọi trang đều **sinh từ**
`data/thi-len-dai.json` (nguồn: Quy định thi thăng cấp, đẳng VTF, QĐ 152/2025/QĐ-VTF).

1. Chỉ sửa `data/thi-len-dai.json` (trường `blocks[].text`, `blocks[].items`, `youtube`, `minAge`…).
   Không sửa tay các tệp HTML kể trên — lần chạy sau sẽ ghi đè.
2. Chạy `node tools/thi-len-dai.mjs`, rồi `node tools/kiem-tra.mjs`.
3. Thêm video cho cấp chưa có (cấp 9, 8): điền `youtube` (mã video) và `image`
   (ảnh 16:9 ở `assets/img/thi-len-dai/cap-N.jpg`), rồi chạy lại bước 2.
4. Thêm/bớt cả một cấp (đổi `id`) là việc của Claude: phải sửa thêm `tools/sitemap.mjs`
   rồi chạy `node tools/sitemap.mjs`.
