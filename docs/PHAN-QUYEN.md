# PHÂN QUYỀN — 4 nhóm người dùng

Chốt theo yêu cầu ngày 24/08/2026. File này là bản thiết kế: ghi rõ nhóm nào
thấy gì, phần nào đã chạy được, phần nào còn phải làm và làm ở đâu.

## Bảng vai trò

| Nhóm | Mã vai trò trong `config.js` | Phạm vi dữ liệu |
|---|---|---|
| 1. Admin tổng | `admin` | Toàn hệ thống, mọi cơ sở |
| 2. Học viên (tài khoản phụ huynh dùng cho con) | `phu_huynh` | Chỉ hồ sơ võ sinh gắn với tài khoản |
| 3. Nhân viên cơ sở — lễ tân | `le_tan` | **Chỉ học viên của cơ sở mình** |
| 4. Nhân sự — HLV và HLV trưởng | `hlv`, `hlv_truong` | Hồ sơ cá nhân + học viên cơ sở mình |

Vai trò đã có sẵn trong [`assets/js/core/config.js`](../assets/js/core/config.js)
(`ROLES`, `ROLE_LABELS`, `normalizeRole`). Không thêm mã vai trò mới; nhóm 4 gồm
hai mã vì HLV trưởng có thêm quyền duyệt.

## Nhóm 1 — Admin tổng

| Việc | Hiện trạng |
|---|---|
| Xem/làm được mọi việc của nhóm 3 và 4, không giới hạn cơ sở | Có (vai trò `admin` đã được `isApprover` cho qua) |
| Duyệt nghỉ phép, duyệt chấm công & lương, thêm lịch chung | Có |
| **Tạo / khoá tài khoản, đổi vai trò người khác** | **Chưa có** — nay vẫn phải sửa tay trong Google Sheet |
| Xem toàn bộ học viên của cả 7 cơ sở | Chưa có (chưa có màn hình danh sách học viên) |
| Xem danh sách đăng ký học thử từ trang chủ | Chưa có (`listDangKyTuVan` chưa deploy) |

## Nhóm 2 — Học viên

| Việc | Hiện trạng |
|---|---|
| Thông tin cá nhân: tên, ngày sinh, mã HV, cơ sở, số buổi/tuần | Có — [`parent.js`](../assets/js/app/parent.js) |
| Cấp đai hiện tại | Có |
| Nhận xét của HLV theo tháng | Có |
| **Lịch sử thi lên đai** (ngày thi, đai từ→đến, kết quả, số quyết định) | **Chưa có** — sheet `ThiThangCap` đã thiết kế trong [SCHEMA.md](../backend/SCHEMA.md), chưa có action lẫn màn hình |
| **Hình ảnh tập luyện của riêng mình** | **Chưa có** — album hiện là album chung của trung tâm, chưa gắn ảnh theo mã HV |
| Chỉ số phát triển (chiều cao, cân nặng, BMI theo thời gian) | Chưa có — sheet `SucKhoe` đã thiết kế |

## Nhóm 3 — Nhân viên cơ sở (lễ tân)

| Việc | Hiện trạng |
|---|---|
| **Chỉ thấy học viên của cơ sở mình** | **Chưa có** — chưa có danh sách học viên, và backend chưa lọc theo `coSo` |
| **Tạo hồ sơ học viên mới**: chỉ nhập tên, tuổi, nạp ảnh thẻ | **Chưa có** — cần action `taoVoSinh` + màn hình |
| **Mã học viên do hệ thống sinh, không nhập tay** | Quy tắc đã chốt trong SCHEMA.md: `{code cơ sở}{năm 2 số}{số thứ tự 4 số}` — VD `HP260012`. Chưa cài đặt |
| Tra cứu học viên theo mã | Có một phần — action `lookupStudent` đã chạy, nhưng **không giới hạn cơ sở** |

Ảnh thẻ: [`Setup.gs`](../backend/Setup.gs) đã tạo sẵn thư mục Drive
`TaekwondoKids-Data` + 5 thư mục con và lưu ID vào Script Properties, nên chỗ
chứa ảnh đã có, chỉ còn phần tải lên và gắn vào hồ sơ.

## Nhóm 4 — Nhân sự (HLV / HLV trưởng)

| Việc | Hiện trạng |
|---|---|
| Xem & sửa hồ sơ cá nhân, đổi mật khẩu | Có |
| Đăng ký lịch dạy theo tuần | Có |
| **Xin nghỉ phép** | Có |
| Duyệt nghỉ phép (chỉ HLV trưởng / admin) | Có |
| Chấm công (check-in/out có kiểm toạ độ GPS) & xem lương | Có |
| Nhận xét học viên theo tháng | Có |
| Tra cứu thông tin học viên (tên, ngày sinh, cấp đai...) | Có một phần — như nhóm 3, chưa giới hạn cơ sở |

## Việc phải làm, theo thứ tự phụ thuộc

1. **Quản lý tài khoản** (chặn mọi việc khác): bảng `NguoiDung` theo SCHEMA.md,
   mật khẩu băm SHA-256 + muối, chuyển tài khoản từ bảng cũ sang. Kèm action
   `taoTaiKhoan` / `doiVaiTro` / `khoaTaiKhoan` để admin tự làm trên giao diện,
   không phải mở Google Sheet.
2. **Kiểm quyền phía máy chủ ở mọi action**: hiện các lệnh đọc không kiểm gì —
   gọi `getSchedule` với mã nhân viên bịa vẫn trả về lịch dạy thật. Phải kiểm
   trước khi mở thêm dữ liệu học viên.
3. **Hồ sơ võ sinh**: sheet `VoSinh` + sinh mã tự động + lễ tân tạo hồ sơ (tên,
   tuổi, ảnh thẻ) + danh sách lọc theo `coSo`.
4. **Lịch sử thi lên đai** (`ThiThangCap`) và **ảnh theo học viên** — hai phần
   còn thiếu của giao diện học viên.
5. **Chỉ số phát triển** (`SucKhoe`) + biểu đồ.

## Ba việc cần chốt trước khi viết mã

1. **Bảng tài khoản**: làm bảng `NguoiDung` mới rồi chuyển tài khoản cũ sang
   (đúng thiết kế, mật khẩu được băm), hay bám tiếp bảng cũ cho nhanh? Nên chọn
   cách một, vì phần mật khẩu của bảng cũ chưa rõ có băm hay không.
2. **Học viên đăng nhập bằng gì**: số điện thoại phụ huynh, hay mã học viên?
   (Mã đăng nhập bằng mã HV đã có sẵn trong [`login.js`](../assets/js/landing/login.js)
   — chỗ chuẩn hoá số điện thoại đã chấp nhận cả chuỗi không phải số.)
3. **Ảnh thẻ và ảnh tập luyện**: để link Drive công khai cho nhẹ, hay chỉ người
   đã đăng nhập mới xem được (phải cho ảnh đi qua Apps Script, chậm hơn)?
