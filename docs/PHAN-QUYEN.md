# PHÂN QUYỀN — 4 nhóm người dùng

Chốt theo yêu cầu ngày 24/08/2026. File này là bản thiết kế: ghi rõ nhóm nào
thấy gì, phần nào đã chạy được, phần nào còn phải làm và làm ở đâu.

## Bảng vai trò

| Nhóm | Mã vai trò trong `config.js` | Phạm vi dữ liệu |
|---|---|---|
| 1. Admin tổng | `admin` | Toàn hệ thống, mọi cơ sở |
| 2. Học viên | `phu_huynh` | Chỉ hồ sơ võ sinh có mã học viên trùng cột `maHV` của tài khoản |
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
| **Tạo / khoá tài khoản, đổi vai trò, đặt lại mật khẩu** | **Xong** — nút "Quản lý tài khoản" trong app, xem [`accounts.js`](../assets/js/app/accounts.js) |
| Xem toàn bộ học viên của cả 7 cơ sở | **Xong** — admin có thêm ô lọc theo cơ sở |
| Xem danh sách đăng ký học thử từ trang chủ | Backend đã có (`listDangKyTuVan`) — còn thiếu màn hình |

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
| **Chỉ thấy học viên của cơ sở mình** | **Xong** — danh sách lọc sẵn theo cơ sở, có tìm theo tên bỏ dấu và theo mã |
| **Tạo hồ sơ học viên mới**: chỉ nhập tên, tuổi, nạp ảnh thẻ | **Xong** — nút "Hồ sơ võ sinh" trong app, xem [`students.js`](../assets/js/app/students.js) |
| **Mã học viên do hệ thống sinh, không nhập tay** | **Xong** — `{code cơ sở}{năm 2 số}{số thứ tự 4 số}`, VD `HP260012`. Màn hình không có ô nhập mã; mã gửi kèm từ trình duyệt bị bỏ qua |
| Tra cứu học viên theo mã | Có — `lookupStudent` đã giới hạn theo cơ sở của người tra |

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
| Tra cứu thông tin học viên (tên, ngày sinh, cấp đai...) | Có — giới hạn theo cơ sở |

## Việc phải làm, theo thứ tự phụ thuộc

1. ~~**Quản lý tài khoản**: bảng tài khoản riêng, mật khẩu băm, màn hình cho
   admin.~~ **Xong cả backend và giao diện** — `backend/Auth.gs` +
   `assets/js/app/accounts.js`. Admin tạo tài khoản, đặt lại mật khẩu, đổi vai
   trò, khoá/mở ngay trong app; mật khẩu tạm hiện đúng một lần.
2. ~~**Kiểm quyền phía máy chủ ở mọi action**~~ **Xong** — cổng `xacThuc_` đứng
   trước mọi action: bắt buộc có token, ghi đè mã nhân viên theo chủ token,
   chặn phụ huynh gọi lệnh nội bộ, chặn người không phải quản lý gọi lệnh
   duyệt, và lọc dữ liệu theo cơ sở. Không còn action nào mở cho lệnh không
   token, trừ `dangNhap` và `dangKyTuVan` (form đăng ký học thử ở trang chủ).
3. ~~**Hồ sơ võ sinh**: sheet `VoSinh` + sinh mã tự động + lễ tân tạo hồ sơ (tên,
   tuổi, ảnh thẻ) + danh sách lọc theo `coSo`.~~ **Xong cả backend và giao diện.**
   Lễ tân và quản lý tạo/sửa được; HLV chỉ xem. Ảnh thẻ thu nhỏ ngay trên máy
   rồi lưu vào thư mục Drive riêng tư, lấy về qua action `anhVoSinh` có kiểm
   quyền — không dùng link Drive công khai.
4. **Lịch sử thi lên đai** (`ThiThangCap`) và **ảnh theo học viên** — hai phần
   còn thiếu của giao diện học viên.
5. **Chỉ số phát triển** (`SucKhoe`) + biểu đồ.

## Đã chốt

**Bảng tài khoản** (24/08/2026): tách sang một Sheet **riêng**, không share cho
ai, mật khẩu băm SHA-256 + muối 1000 vòng, máy chủ phát token và kiểm token ở
mọi lệnh. Đã cài đặt trong `backend/Auth.gs`.

**Backend tự chủ** (24/08/2026): cắt hết phụ thuộc vào Apps Script và Sheet của
bên khác. Toàn bộ nghiệp vụ dựng lại trong `backend/Api_HeThong.gs`, chạy trong
project và Sheet của trung tâm — xem [TRIEN-KHAI.md](TRIEN-KHAI.md). Dữ liệu cũ
(lịch dạy, chấm công, lương của hệ thống bên kia) **không được chuyển sang**: hệ
thống mới bắt đầu từ dữ liệu trắng, tài khoản nhân sự phải tạo lại.

## Còn phải chốt

1. ~~**Học viên đăng nhập bằng gì**~~ **Đã chốt (26/08/2026)**: một ô duy nhất,
   nhận số điện thoại **hoặc** mã liên đoàn VTF **hoặc** mã học viên nội bộ.
   Tài khoản gắn với hồ sơ bằng cột `maHV`, không còn mã phụ huynh.
2. ~~**Ảnh thẻ và ảnh tập luyện**~~ **Đã chốt (25/08/2026)**: ảnh đi qua Apps
   Script, chỉ người có quyền xem hồ sơ em đó mới lấy được. Ảnh trẻ em không để
   link công khai. Đổi lại danh sách không hiện ảnh — mỗi ảnh là một lệnh gọi,
   ba mươi em là ba mươi lượt chờ; ảnh chỉ tải khi mở từng hồ sơ.

**Mã học viên và mã liên đoàn** (26/08/2026): hai thứ khác nhau, đừng lẫn.
`maHV` do hệ thống sinh lúc đăng ký học, đánh số theo thứ tự của cả trung tâm.
`maLienDoan` do Liên đoàn Taekwondo Việt Nam cấp sau kỳ thi thăng cấp đầu tiên,
chủ yếu để tra cứu khi đi thi — lúc tạo hồ sơ chưa có, điền sau bằng nút Sửa.
Cột `maPH` đã bỏ: tài khoản gắn thẳng với một mã học viên.
