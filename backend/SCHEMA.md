# CẤU TRÚC DỮ LIỆU — GOOGLE SHEETS

## A. Quyết định kiến trúc: MỘT file, tách theo THỜI GIAN

Đã cân nhắc phương án mỗi cơ sở một file riêng + gom về file tổng. **Không chọn**, vì:

| | 1 file + chỉ mục | 7 file theo cơ sở |
|---|---|---|
| Tra 1 võ sinh | ~50 ms | ~600 ms (phải `openById` trước) |
| Ghi 1 giao dịch | ~200 ms | ~800 ms |
| Báo cáo toàn hệ thống | ~1 s | ~5–7 s (mở 7 file) |
| Võ sinh chuyển cơ sở | sửa 1 ô | di chuyển dữ liệu giữa 2 file |
| Nguồn sự thật | 1 | 2 (file gốc + file tổng lệch nhau) |

Nút thắt thật của Apps Script **không phải số dòng** mà là thói quen `getDataRange().getValues()`
— nạp cả sheet vào RAM chỉ để tìm 1 dòng. Chia file **không** chữa được điều đó.

### Ba kỹ thuật thay thế (đã áp dụng trong `Sheets.gs`)

1. **Chỉ mục dòng** — `CacheService` giữ bản đồ `khoá → số dòng`; đọc thẳng bằng
   `getRange(row, 1, 1, nCols)`. Chi phí không đổi dù sheet 5.000 hay 500.000 dòng.
2. **Tách theo năm** cho các bảng phát sinh liên tục: `NhanXet_2026`, `DiemDanh_2026`,
   `HocPhi_2026`. Sheet năm cũ thành lưu trữ chỉ đọc. 99% truy vấn nằm ở kỳ hiện tại.
3. **Cache dữ liệu tra cứu** (cơ sở, bảng giá, ưu đãi) 6 giờ.

### Ước lượng quy mô
7 cơ sở × ~300 võ sinh ≈ 2.100 võ sinh → ~52.000 dòng phát sinh/năm.
Giới hạn Google Sheet: 10 triệu ô ≈ 830.000 dòng (12 cột). Tách theo năm → sheet nóng ~25.000 dòng.

### Đường lui
Mọi truy cập Sheets đi qua **một lớp `Sheets.gs`**. Khi cần đổi sang CSDL thật
(hoặc chia file), chỉ sửa file đó, không đụng tới phần còn lại của hệ thống.

---

## B. Quy ước chung

- Dòng 1 của mọi sheet là **tiêu đề cột**, tên cột viết đúng như bảng dưới (code dò theo tên, không theo vị trí → thêm/bớt cột không làm hỏng hệ thống).
- Ngày lưu dạng chuỗi `YYYY-MM-DD`. Thời điểm lưu `YYYY-MM-DD HH:mm:ss`.
- Tiền lưu dạng **số nguyên VNĐ**, không dấu phân cách, không đơn vị.
- Cột `id` là duy nhất toàn sheet, sinh bằng `Utilities.getUuid()` rút gọn.
- Không xoá dòng. Muốn huỷ thì đặt `trangThai = 'Đã huỷ'` (giữ vết cho kiểm toán).

---

## C. Danh sách sheet

### 1. `CoSo` — Danh mục cơ sở
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | text | `Hapulico`, `GreenStars`, `NghiaDo`, `HaDong`, `LongBien`, `GiaHoa`, `HaLong` |
| code | text | Mã 2 ký tự dùng sinh mã học viên: HP, GS, ND, HD, LB, GH, HL |
| ten | text | Tên hiển thị |
| khuVuc | text | Hà Nội / TP. Hồ Chí Minh / Quảng Ninh |
| diaChi | text | Địa chỉ đầy đủ (dùng luôn cho Google Maps) |
| lat, lng | number | Toạ độ, dùng kiểm tra GPS khi HLV điểm danh |
| banKinhChoPhep | number | Mét, mặc định 150 |
| dienThoai | text | |
| trangThai | text | `Đang hoạt động` / `Tạm dừng` |

### 2. `NguoiDung` — Tài khoản đăng nhập (thay `NhanVien` cũ, gộp cả phụ huynh)
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | text | |
| maNV | text | Mã nhân viên, rỗng nếu là phụ huynh |
| maPH | text | Mã phụ huynh, rỗng nếu là nhân viên |
| hoTen | text | |
| soDienThoai | text | **Tên đăng nhập**, 10 số, duy nhất |
| email | text | |
| ngaySinh | date | |
| vaiTro | text | `admin` / `hlv_truong` / `hlv` / `le_tan` / `phu_huynh` |
| coSo | text | id cơ sở phụ trách; admin để trống = toàn hệ thống |
| capDai | text | Chỉ với HLV |
| matKhauHash | text | **Băm SHA-256 + muối**, KHÔNG lưu mật khẩu thô |
| muoi | text | Chuỗi ngẫu nhiên cho mỗi tài khoản |
| anhDaiDien | text | URL |
| trangThai | text | `Hoạt động` / `Khoá` |
| ngayTao | datetime | |
| lanDangNhapCuoi | datetime | |

### 3. `VoSinh` — Hồ sơ võ sinh (bảng trung tâm)
| Cột | Kiểu | Ghi chú |
|---|---|---|
| maHV | text | **Khoá chính**. Máy chủ sinh, không nhận từ trình duyệt. `{code cơ sở}{năm 2 số}{số thứ tự 4 số}` — VD `HP260012`. Số thứ tự đếm theo **cả trung tâm**, không theo từng cơ sở |
| maLienDoan | text | Mã do Liên đoàn Taekwondo Việt Nam cấp sau kỳ thi thăng cấp đầu tiên. Dùng tra cứu khi đi thi, và đăng nhập được bằng mã này |
| maLienDoan | text | Mã do Liên đoàn cấp, có thể trống |
| hoTen | text | |
| ngaySinh | date | |
| gioiTinh | text | Nam / Nữ |
| maPH | text | Liên kết `NguoiDung.maPH` |
| coSo | text | id cơ sở |
| capDaiHienTai | text | id đai, xem `BELTS` trong `config.js` |
| ngayNhapHoc | date | |
| soBuoiTuan | number | |
| anhDaiDien | text | URL |
| trangThai | text | `Đang học` / `Bảo lưu` / `Nghỉ` |
| ghiChu | text | |
| ngayTao | datetime | |
| nguoiTao | text | maNV lễ tân đã tạo |

### 4. `ThiThangCap` — Quá trình thi lên đai
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id, maHV | text | |
| ngayThi | date | |
| capDaiTu, capDaiDen | text | id đai |
| ketQua | text | `Đạt` / `Không đạt` / `Bảo lưu` |
| diem | number | |
| noiThi | text | |
| soQuyetDinh | text | Số QĐ công nhận của Liên đoàn |
| nguoiCham | text | |
| ghiChu | text | |

### 5. `SucKhoe` — Chỉ số theo thời gian (mỗi lần đo 1 dòng, để vẽ biểu đồ tăng trưởng)
| Cột | Kiểu |
|---|---|
| id, maHV | text |
| ngayDo | date |
| chieuCao | number (cm) |
| canNang | number (kg) |
| bmi | number (hệ thống tự tính) |
| nhomMau, thiLuc, diUng, benhLy | text |
| ghiChu | text |
| nguoiNhap | text |

### 6. `BangGia` — Bảng giá theo cơ sở & gói học
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | text | |
| coSo | text | `ALL` = áp dụng toàn hệ thống |
| tenGoi | text | VD "2 buổi/tuần — 3 tháng" |
| soBuoiTuan | number | |
| soThang | number | |
| donGia | number | Tổng tiền của gói (VNĐ) |
| hieuLucTu, hieuLucDen | date | |
| trangThai | text | |

### 7. `UuDai` — Danh mục ưu đãi
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id, maUuDai | text | |
| tenUuDai | text | VD "Nhóm từ 3 người" |
| loai | text | `phanTram` / `soTien` / `tangThang` |
| giaTri | number | 10 (=10%) / 500000 (đ) / 1 (tháng) |
| apDungCung | boolean | Có được cộng dồn với ưu đãi khác không |
| hieuLucTu, hieuLucDen | date | |
| trangThai | text | |

### 8. `HocPhi_{năm}` — Giao dịch học phí  *(tách theo năm)*
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | text | |
| soBienLai | text | `BL{code}{yymm}{seq}` — VD `BLHP26080031` |
| maHV, hoTenHV | text | Lưu kèm tên để biên lai không đổi khi hồ sơ sửa |
| coSo | text | |
| goiHocId, tenGoi | text | |
| kyTu, kyDen | date | Kỳ học phí này chi trả |
| hocPhiGoc | number | |
| dsUuDai | text | JSON `[{maUuDai, tenUuDai, loai, giaTri, tienGiam}]` |
| tongGiam | number | |
| thucNop | number | `hocPhiGoc - tongGiam` |
| daNop | number | Số tiền thực nhận (cho phép trả góp) |
| conNo | number | `thucNop - daNop` |
| hinhThuc | text | `Tiền mặt` / `Chuyển khoản` / `Thẻ` |
| ngayNop | date | |
| hanDongTiep | date | Dùng để nhắc đóng học phí |
| nguoiThu | text | maNV lễ tân |
| trangThai | text | `Đã thu` / `Còn nợ` / `Đã huỷ` |
| ghiChu | text | |

> Sửa sai: **không sửa đè**. Tạo dòng mới `trangThai = 'Điều chỉnh'` tham chiếu `id` gốc.

### 9. `DangKyTuVan` — Khách đăng ký từ trang chủ (lead)
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | text | |
| thoiGian | datetime | |
| coSoQuanTam | text | id cơ sở khách bấm vào |
| tenPhuHuynh, soDienThoai, email | text | |
| dsVoSinh | text | JSON `[{hoTen, ngaySinh}]` |
| nguon | text | `popup_coso` / `form_trangchu` |
| trangThai | text | `Mới` / `Đã liên hệ` / `Đã đăng ký` / `Không quan tâm` |
| nguoiXuLy, ghiChu | text | |

### 10. `NhanXet_{năm}` — Nhận xét của HLV  *(tách theo năm)*
`id, maHV, maNV, hoTenNV, thang, nam, noiDung, ngayTao`

### 11. `ThongBao` — Thông báo trong ứng dụng
`id, doiTuong (maPH|maHV|coSo|ALL), loai, tieuDe, noiDung, ngayTao, hanXuLy, daDoc`

### 12. Các sheet giữ nguyên từ hệ thống cũ
`LichDay`, `NghiPhep`, `DiemDanh_{năm}`, `Luong`, `LichChung`, `GhiChuLich`

---

## D. Chỉ mục cần tạo (do `Sheets.gs` tự quản lý trong CacheService)

| Sheet | Khoá chỉ mục |
|---|---|
| NguoiDung | soDienThoai → dòng |
| VoSinh | maHV → dòng |
| VoSinh | maPH → danh sách maHV (để phụ huynh xem nhiều con) |
| HocPhi_{năm} | maHV → danh sách dòng |
