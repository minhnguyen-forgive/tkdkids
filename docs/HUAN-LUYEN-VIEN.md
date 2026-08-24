# Phần Huấn luyện viên trên trang chủ

## Cách hoạt động

Section `#coaches` trên trang chủ tự chuyển sang huấn luyện viên tiếp theo
**sau mỗi 5 giây**. Người xem có thể bấm mũi tên, bấm vào chấm tròn, vuốt ngang
trên điện thoại, hoặc dùng phím ← → khi phần này đang trong tầm nhìn.

Trình chiếu **tự dừng** khi rê chuột vào, khi đang chọn bằng bàn phím, và khi
người xem chuyển sang tab trình duyệt khác. Ai bật chế độ giảm chuyển động của
hệ điều hành thì không tự chuyển nữa và mọi hiệu ứng đều tắt.

Ba lớp chuyển động chạy cùng lúc: thẻ chân dung xoay nhẹ theo trục dọc rồi trượt
sang, các thẻ còn lại xếp chồng lùi phía sau và mờ dần theo độ sâu, từng dòng chữ
bên phải trượt lên lần lượt cách nhau 80ms.

## Sửa dữ liệu

Toàn bộ nằm trong `data/huan-luyen-vien.json`:

```json
{
  "id": "nguyen-dinh-toan",
  "name": "Nguyễn Đình Toàn",
  "title": "Huấn luyện viên trưởng",
  "honorific": "Thầy",
  "dang": 6,
  "dangNote": "Thi đỗ 6 đẳng tại kỳ thi thăng cao đẳng quốc gia năm 2021",
  "branchId": "Hapulico",
  "photo": "",
  "bio": "Một đoạn giới thiệu ngắn, 2–3 câu.",
  "highlights": ["Gạch đầu dòng thành tích 1", "Gạch đầu dòng 2"]
}
```

| Trường | Ghi chú |
|---|---|
| `dang` | Cấp đẳng. **Để `null` nếu chưa có nguồn xác nhận** — huy hiệu tự ẩn, không hiện số sai |
| `branchId` | Phải trùng `id` trong `assets/js/core/config.js` để lấy đúng tên và khu vực cơ sở |
| `photo` | Đường dẫn ảnh chân dung. Để rỗng thì tự dựng thẻ chữ cái đầu |
| `honorific` | "Thầy" hoặc "Cô" |

## Thêm ảnh chân dung

Ảnh dọc, tỉ lệ **4:5** (VD 800×1000), chụp nửa người trên nền đơn giản.
Nén trước khi đưa lên:

```bash
mkdir -p assets/img/hlv
sips -s format jpeg -s formatOptions 62 -Z 1000 ANH-GOC.jpg \
     --out assets/img/hlv/nguyen-dinh-toan.jpg
```

Rồi điền `"photo": "assets/img/hlv/nguyen-dinh-toan.jpg"`.

Chưa có ảnh thì thẻ chữ cái đầu vẫn trông có chủ đích chứ không giống ảnh bị vỡ —
không cần vội, nhưng ảnh thật luôn thuyết phục hơn nhiều.

## Nguồn dữ liệu hiện tại và những chỗ còn thiếu

Tên và chức danh lấy **nguyên từ website cũ** của trung tâm (mục *Lịch học & học phí*
và phần *Cột mốc phát triển*). Không có chỗ nào do tôi tự đặt ra.

| Cơ sở | Huấn luyện viên | Cấp đẳng |
|---|---|---|
| Hapulico | Thầy Nguyễn Đình Toàn — HLV trưởng | **6 đẳng** (nguồn: web cũ, 2021) |
| GreenStars | Thầy Nguyễn Quang Huy — HLV phó | *chưa có* |
| Nghĩa Đô | Thầy Vũ Thành Đạt | *chưa có* |
| Gia Hoà | Cô Nguyễn Thị Ngân | *chưa có* |
| Hạ Long | Thầy Nguyễn Quốc Việt | *chưa có* |
| **Hà Đông** | **chưa có dữ liệu** | — |
| **Long Biên** | **chưa có dữ liệu** | — |

**Cần bạn bổ sung:**

1. **Cấp đẳng của 4 thầy cô còn lại.** Tôi cố ý để trống chứ không suy đoán —
   ghi sai cấp đẳng của một người có thật là chuyện không sửa lại được bằng lời xin lỗi.
2. **Huấn luyện viên của Hà Đông và Long Biên** — hai cơ sở này mở sau bản web cũ.
3. **Ảnh chân dung** cho cả 5–7 thầy cô.
4. Kiểm tra lại xem thầy Toàn hiện đã lên cao hơn 6 đẳng chưa (số trên web cũ là của năm 2021).

> Đây cũng chính là bước đầu tiên trong kế hoạch 90 ngày ở
> `NOI-DUNG-CHUYEN-MON.md` — mục 3 nói vì sao hồ sơ huấn luyện viên có tên,
> có bằng cấp là việc có sức bật SEO lớn nhất với một website dạy trẻ em.
