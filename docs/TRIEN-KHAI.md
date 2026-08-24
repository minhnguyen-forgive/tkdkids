# HƯỚNG DẪN TRIỂN KHAI BACKEND

Backend của trung tâm nằm hoàn toàn trong **project Apps Script và Google Sheet
của trung tâm**. Không còn phụ thuộc gì vào Apps Script hay Sheet của bên nào
khác. Làm theo đúng thứ tự dưới đây, khoảng 15 phút.

---

## A. Năm file dán vào Apps Script

Mở project Apps Script (script.google.com → project của trung tâm) → nút `+`
cạnh **Files** → **Script** → đặt tên → dán nội dung, không sửa gì.

| Tên file đặt trong Apps Script | Dán nội dung từ | Việc của nó |
|---|---|---|
| `Sheets` | `backend/Sheets.gs` | Lớp đọc/ghi Sheet dùng chung |
| `Setup` | `backend/Setup.gs` | Tạo cấu trúc dữ liệu, chạy một lần |
| `Auth` | `backend/Auth.gs` | Đăng nhập, mật khẩu băm, token, phân quyền |
| `Api_DangKy` | `backend/Api_DangKy.gs` | Nhận đăng ký học thử từ trang chủ |
| `Api_HeThong` | `backend/Api_HeThong.gs` | `doPost` + toàn bộ nghiệp vụ |

File `Code.gs` mặc định của project mới (chỉ có `myFunction` rỗng) thì xoá đi.

> Không cần thêm dòng nào vào `doPost` như các bản hướng dẫn trước: `doPost`
> nằm sẵn trong `Api_HeThong.gs`, đã gọi cổng bảo vệ rồi lần lượt qua ba bộ
> định tuyến.

## B. Hai Google Sheet

| Sheet | Chứa gì | Ai được mở |
|---|---|---|
| **Sheet tài khoản** — [file này](https://docs.google.com/spreadsheets/d/1bQGLL5Xor1pW2GUDSh-0oNq45WffWjgIZuIjsdgy_KY/edit) | `TaiKhoan`, `Phien`, `NhatKyDangNhap` | **Chỉ chủ sở hữu.** Share → **Restricted**, không share cho ai, không "Anyone with the link", không Publish to web |
| **Sheet dữ liệu** — script tự tạo, tên `TaekwondoKids-DuLieu` | Cơ sở, võ sinh, lịch dạy, chấm công, lương, nghỉ phép, nhận xét, học phí... | Sau này share cho lễ tân/HLV nếu cần nhập liệu tay |

Tách hai file là có chủ ý: mật khẩu không nằm cùng chỗ với dữ liệu nghiệp vụ,
nên có mở Sheet dữ liệu cho nhân viên cũng không ai đọc được mật khẩu.

Muốn dùng Sheet dữ liệu có sẵn thay vì để script tạo mới: đặt Script Property
`ID_SHEET_DULIEU` bằng id của file đó trước khi chạy bước C.

## C. Chạy hai hàm, mỗi hàm một lần

Chọn hàm ở thanh trên → ▶ **Run**. Lần đầu Google hỏi cấp quyền: chọn tài
khoản → *Advanced* → *Go to ... (unsafe)* → *Allow*. (Cảnh báo "unsafe" là
bình thường với script tự viết.)

1. **`khoiTaoBangTaiKhoan`** (file `Auth`) — dựng 3 tab trong Sheet tài khoản và
   tạo admin tổng `0934641039`, mật khẩu tạm `admin`, có cờ bắt đổi ngay.
2. **`taoToanBoCauTruc`** (file `Setup`) — tạo Sheet dữ liệu với 17 sheet
   (7 cơ sở, bảng giá, ưu đãi đã có dữ liệu mẫu) + thư mục Drive để chứa ảnh.
   Mở **Execution log** để lấy đường dẫn Sheet dữ liệu vừa tạo. Chạy lại nhiều
   lần vẫn an toàn: sheet đã có thì không đụng dữ liệu, chỉ bổ sung cột thiếu.

Hai việc làm tay sau đó:

- **Điền giá vào sheet `BangGia`** — cột `donGia` đang để 0.
- **Lấy toạ độ 7 cơ sở**: chạy hàm `layToaDoCacCoSo` (file `Setup`). Toạ độ tự
  tra lệch vài chục mét, nên mở Google Maps bấm chuột phải đúng cửa phòng tập
  rồi sửa lại cột `lat`/`lng`. Toạ độ này để kiểm HLV có đứng tại cơ sở khi
  điểm danh; cơ sở nào chưa có toạ độ thì bước kiểm GPS được bỏ qua.

## D. Deploy

**Deploy → New deployment → Web app**:

| Mục | Chọn |
|---|---|
| Execute as | **Me** (chủ sở hữu) |
| Who has access | **Anyone** |

Bấm **Deploy**, copy **URL /exec**, dán vào `API_URL` trong
[`assets/js/core/config.js`](../assets/js/core/config.js), rồi tải file đó lên
hosting. Từ đây website nói chuyện với backend của trung tâm.

> Mỗi lần sửa code trong Apps Script phải **Deploy → Manage deployments → bút
> chì → Version: New version → Deploy**, nếu không thì bản đang chạy vẫn là bản
> cũ. Đây là chỗ hay quên nhất.

## E. Script Properties

**Project Settings → Script Properties**:

| Property | Value | Bắt buộc |
|---|---|---|
| `CHE_DO_TOKEN` | `bat_buoc` | **Có** — chặn mọi lệnh gọi không có token |
| `EMAIL_NHAN_LEAD` | `taekwondokids.vn@gmail.com` | Không — để nhận mail khi có khách đăng ký học thử |
| `DON_GIA_BUOI` | VD `100000` | Không — mặc định 100.000đ/buổi, dùng để tính lương |
| `ID_SHEET_DULIEU` / `ID_SHEET_TAIKHOAN` | id Sheet | Không — script tự điền |

`CHE_DO_TOKEN` chưa đặt thì cổng chạy ở chế độ `canh_bao`: lệnh không token vẫn
đi qua nhưng bị ghi vào `NhatKyDangNhap`. Chế độ đó chỉ để chuyển tiếp; hệ
thống mới không cần, đặt `bat_buoc` ngay.

## F. Tài khoản

Đăng nhập `0934641039` / `admin` → hệ thống mở sẵn ô đổi mật khẩu → **đổi ngay**.
Mật khẩu mới từ 6 ký tự, chỉ chữ và số, có ít nhất 1 chữ hoa và 1 chữ số.

Tạo tài khoản cho nhân sự 7 cơ sở: chưa có màn hình quản lý nên tạm dùng hàm
**`taoNhanhMotTaiKhoan`** trong file `Auth` — sửa 4 biến ở đầu hàm rồi ▶ Run,
mật khẩu tạm in ra Execution log, gửi riêng cho từng người. Vai trò nhận một
trong: `admin`, `hlv_truong`, `hlv`, `le_tan`, `phu_huynh`.

Cấu trúc cột của 3 tab trong Sheet tài khoản — script tự tạo, **đừng đổi tên
cột**, và **đừng bao giờ gõ mật khẩu chữ thô vào cột `matKhau`** (cột đó chỉ
nhận chuỗi băm; gõ chữ thường vào là tài khoản không đăng nhập được):

`TaiKhoan`: `id`, `maNV`, `maPH`, `hoTen`, `soDienThoai` (tên đăng nhập),
`email`, `ngaySinh`, `vaiTro`, `coSo` (id cơ sở; **admin để trống = toàn hệ
thống**), `capDai`, `chucVu`, `matKhau`, `phaiDoiMatKhau`, `trangThai`,
`soLanSai`, `khoaDenLuc`, `ngayTao`, `lanDangNhapCuoi`.

`Phien`: `tokenHash`, `soDienThoai`, `maNV`, `maPH`, `vaiTro`, `coSo`, `taoLuc`,
`hetHan`, `thuHoiLuc`. Chỉ giữ **bản băm** của token nên đọc được sheet cũng
không dùng lại được token. Muốn tống ai ra khỏi hệ thống ngay: điền `thuHoiLuc`.

`NhatKyDangNhap`: `thoiGian`, `soDienThoai`, `action`, `ketQua`, `ghiChu`.

---

## Kiểm tra sau khi deploy

| Việc | Kết quả đúng |
|---|---|
| Mở URL `/exec` trên trình duyệt | `{"status":"success","message":"API Taekwondo Kids đang chạy."}` |
| Đăng nhập admin trên website | Vào được app, hiện ô đổi mật khẩu |
| Gửi thử form đăng ký học thử ở trang chủ | Có dòng mới trong sheet `DangKyTuVan` |
| Đăng ký lịch dạy, xin nghỉ phép | Có dòng mới trong `LichDay` / `NghiPhep` |

## Những gì backend này đã có

Đăng nhập một cửa (tự nhận vai trò) · đổi mật khẩu · tạo/khoá tài khoản, đổi
vai trò, đặt lại mật khẩu · lịch dạy theo tuần · ghi chú lịch cá nhân · lịch
chung theo cơ sở hoặc toàn hệ thống · nghỉ phép và duyệt nghỉ phép · chấm công
có kiểm GPS và ảnh xác thực · duyệt chấm công · lương tạm tính và duyệt lương ·
tra cứu võ sinh · nhận xét HLV theo tháng · sửa hồ sơ cá nhân · nhận đăng ký
học thử từ trang chủ và danh sách lead cho lễ tân.

Phân quyền: nhân viên chỉ thấy dữ liệu **cơ sở mình**, admin thấy tất cả, phụ
huynh chỉ thấy **con mình** và bị chặn khỏi mọi lệnh nội bộ. Cổng bảo vệ tra
token ra người thật rồi ghi đè mã nhân viên trong tham số, nên sửa dữ liệu gửi
lên từ trình duyệt cũng không mạo danh được ai.

Còn thiếu (xem [PHAN-QUYEN.md](PHAN-QUYEN.md)): màn hình quản lý tài khoản, lễ
tân tạo hồ sơ võ sinh sinh mã tự động, lịch sử thi lên đai, ảnh theo học viên,
chỉ số phát triển.
