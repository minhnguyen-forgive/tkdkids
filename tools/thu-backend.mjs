import { dungMoiTruong, goi } from './gia-lap-appsscript.mjs';
const moi = dungMoiTruong();
moi.props.CHE_DO_TOKEN = 'bat_buoc';
moi.props.FOLDER_ANH_VOSINH = 'FOLDER_VS';

let pass=0, fail=0, ghi=[];
const t=(n,c,extra)=>{ c?(pass++,ghi.push('  ✓ '+n)):(fail++,ghi.push('  ✗ '+n+(extra?'  → '+JSON.stringify(extra).slice(0,200):''))); };

/* dựng dữ liệu nền */
globalThis.taoToanBoCauTruc();
globalThis.khoiTaoBangTaiKhoan();

/* đăng nhập admin (mật khẩu tạm 'admin') */
const admin = goi({ action:'dangNhap', phone:'0934641039', password:'admin' });
t('admin đăng nhập được', admin.status==='success', admin);
const tkAdmin = admin.token;

/* admin tạo tài khoản lễ tân 2 cơ sở + 1 HLV + 1 phụ huynh */
function taoTK(o){ return goi({ action:'taoTaiKhoan', token:tkAdmin, ...o }); }
const leTanHP = taoTK({ hoTen:'Lễ tân Hapulico', soDienThoai:'0900000001', vaiTro:'le_tan', coSo:'Hapulico', maNV:'NV001' });
const leTanGS = taoTK({ hoTen:'Lễ tân GreenStars', soDienThoai:'0900000002', vaiTro:'le_tan', coSo:'GreenStars', maNV:'NV002' });
const hlvHP   = taoTK({ hoTen:'HLV Hapulico', soDienThoai:'0900000003', vaiTro:'hlv', coSo:'Hapulico', maNV:'NV003' });
const phuHuynh= taoTK({ hoTen:'Phụ huynh A', soDienThoai:'0900000004', vaiTro:'phu_huynh', maPH:'PH001' });
t('tạo được 4 tài khoản', [leTanHP,leTanGS,hlvHP,phuHuynh].every(r=>r.status==='success'),
  [leTanHP,leTanGS,hlvHP,phuHuynh]);

function dangNhap(sdt, mk){ return goi({ action:'dangNhap', phone:sdt, password:mk }); }
/* tài khoản mới bị ép đổi mật khẩu — kiểm luôn là đăng nhập vẫn ra token */
const pLT1 = dangNhap('0900000001', leTanHP.matKhauTam);
t('lễ tân đăng nhập bằng mật khẩu tạm', pLT1.status==='success', pLT1);
const T_LT1 = pLT1.token;
const T_LT2 = dangNhap('0900000002', leTanGS.matKhauTam).token;
const T_HLV = dangNhap('0900000003', hlvHP.matKhauTam).token;
const T_PH  = dangNhap('0900000004', phuHuynh.matKhauTam).token;

/* ---------- TẠO HỒ SƠ ---------- */
const anh1x1 = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
const a = goi({ action:'taoVoSinh', token:T_LT1, hoTen:'  Nguyễn   Văn A ', tuoi:'8', gioiTinh:'Nam', anhThe:anh1x1 });
t('lễ tân tạo được hồ sơ', a.status==='success', a);
t('mã sinh đúng quy tắc {code}{yy}0001', a.maHV === 'HP'+String(new Date().getFullYear()%100).padStart(2,'0')+'0001', a.maHV);
t('tên được chuẩn hoá khoảng trắng', a.student && a.student.hoTen==='Nguyễn Văn A', a.student&&a.student.hoTen);
t('ảnh thẻ được lưu', a.coAnh===true && Object.keys(moi.drive).length===1, a.coAnh);
t('tuổi 8 → lưu năm sinh, không lưu tuổi cứng',
  a.student.namSinh === new Date().getFullYear()-8 && a.student.tuoi === 8, a.student);

const b = goi({ action:'taoVoSinh', token:T_LT1, hoTen:'Trần Thị B', tuoi:'10', gioiTinh:'Nữ' });
t('mã thứ hai tăng lên 0002', b.maHV.endsWith('0002'), b.maHV);

const c = goi({ action:'taoVoSinh', token:T_LT2, hoTen:'Lê Văn C', tuoi:'9' });
t('cơ sở khác đếm số thứ tự riêng', c.maHV.startsWith('GS') && c.maHV.endsWith('0001'), c.maHV);

/* ---------- MÃ KHÔNG NHẬN TỪ TRÌNH DUYỆT ---------- */
const d = goi({ action:'taoVoSinh', token:T_LT1, hoTen:'Phạm D', tuoi:'7', maHV:'TUGO9999' });
t('mã do trình duyệt gửi lên bị bỏ qua', d.maHV !== 'TUGO9999' && d.maHV.endsWith('0003'), d.maHV);

/* ---------- ÉP CƠ SỞ ---------- */
const e = goi({ action:'taoVoSinh', token:T_LT1, hoTen:'Hoàng E', tuoi:'7', coSo:'GreenStars' });
t('lễ tân không tạo hộ được cơ sở khác', e.status==='success' && e.student.coSo==='Hapulico', e.student);

/* ---------- QUYỀN ---------- */
const f = goi({ action:'taoVoSinh', token:T_HLV, hoTen:'HLV thử tạo', tuoi:'7' });
t('HLV thường không tạo được hồ sơ', f.status==='error' && f.code==='KHONG_DU_QUYEN', f);
const g = goi({ action:'taoVoSinh', token:T_PH, hoTen:'PH thử tạo', tuoi:'7' });
t('phụ huynh không tạo được hồ sơ', g.status==='error' && g.code==='KHONG_DU_QUYEN', g);
const h = goi({ action:'taoVoSinh', hoTen:'Không token', tuoi:'7' });
t('không token thì không tạo được', h.status==='error' && h.code==='CHUA_DANG_NHAP', h);

/* ---------- VALIDATE ---------- */
t('thiếu tên → báo lỗi', goi({action:'taoVoSinh',token:T_LT1,tuoi:'8'}).status==='error');
t('thiếu tuổi lẫn ngày sinh → báo lỗi', goi({action:'taoVoSinh',token:T_LT1,hoTen:'Không tuổi'}).status==='error');
t('tuổi vô lý → báo lỗi', goi({action:'taoVoSinh',token:T_LT1,hoTen:'Cụ già',tuoi:'200'}).status==='error');

/* ---------- DANH SÁCH LỌC THEO CƠ SỞ ---------- */
const dsHP = goi({ action:'danhSachVoSinh', token:T_LT1 });
const dsGS = goi({ action:'danhSachVoSinh', token:T_LT2 });
t('lễ tân HP chỉ thấy học viên HP',
  dsHP.students.length>0 && dsHP.students.every(s=>s.coSo==='Hapulico'), dsHP.students.map(s=>s.coSo));
t('lễ tân GS chỉ thấy học viên GS',
  dsGS.students.length===1 && dsGS.students[0].coSo==='GreenStars', dsGS.students);
t('không có học viên cơ sở khác lọt sang',
  !dsHP.students.some(s=>s.maHV===c.maHV), dsHP.students.map(s=>s.maHV));
const dsAdmin = goi({ action:'danhSachVoSinh', token:tkAdmin });
t('admin thấy tất cả cơ sở', dsAdmin.students.length === dsHP.students.length + dsGS.students.length,
  {admin:dsAdmin.students.length, hp:dsHP.students.length, gs:dsGS.students.length});
t('admin lọc được theo cơ sở',
  goi({action:'danhSachVoSinh',token:tkAdmin,coSo:'GreenStars'}).students.length===1);
t('tìm theo tên bỏ dấu vẫn ra',
  goi({action:'danhSachVoSinh',token:T_LT1,tim:'nguyen van a'}).students.length===1);
t('tìm theo mã học viên ra đúng một em',
  goi({action:'danhSachVoSinh',token:T_LT1,tim:b.maHV}).students.length===1);

/* ---------- ẢNH ---------- */
const anhA = goi({ action:'anhVoSinh', token:T_LT1, maHV:a.maHV });
t('lễ tân xem được ảnh học viên cơ sở mình', anhA.status==='success' && anhA.anh.startsWith('data:image'), anhA);
const anhCheo = goi({ action:'anhVoSinh', token:T_LT2, maHV:a.maHV });
t('lễ tân cơ sở khác KHÔNG xem được ảnh', anhCheo.status==='error' && anhCheo.code==='KHONG_DU_QUYEN', anhCheo);
const anhKhongToken = goi({ action:'anhVoSinh', maHV:a.maHV });
t('không token thì không lấy được ảnh', anhKhongToken.status==='error', anhKhongToken);
const anhTrong = goi({ action:'anhVoSinh', token:T_LT1, maHV:b.maHV });
t('em chưa có ảnh trả chuỗi rỗng, không lỗi', anhTrong.status==='success' && anhTrong.anh==='', anhTrong);

/* phụ huynh: gắn con rồi mới xem được ảnh */
const gan = goi({ action:'suaVoSinh', token:T_LT1, maHV:a.maHV, maPH:'PH001' });
t('lễ tân gắn được mã phụ huynh', gan.status==='success' && gan.student.maPH==='PH001', gan);
const anhPH = goi({ action:'anhVoSinh', token:T_PH, maHV:a.maHV });
t('phụ huynh xem được ảnh con mình', anhPH.status==='success' && anhPH.anh.startsWith('data:image'), anhPH);
const anhPHkhac = goi({ action:'anhVoSinh', token:T_PH, maHV:b.maHV });
t('phụ huynh KHÔNG xem được ảnh con nhà khác', anhPHkhac.status==='error', anhPHkhac);
t('phụ huynh không gọi được danh sách võ sinh',
  goi({action:'danhSachVoSinh',token:T_PH}).status==='error');

/* ---------- SỬA ---------- */
const s1 = goi({ action:'suaVoSinh', token:T_LT1, maHV:a.maHV, capDaiHienTai:'Đai vàng', trangThai:'Bảo lưu' });
t('sửa được cấp đai và trạng thái', s1.status==='success' && s1.student.capDai==='Đai vàng' && s1.student.trangThai==='Bảo lưu', s1);
const s2 = goi({ action:'suaVoSinh', token:T_LT1, maHV:a.maHV, maHV_moi:'XX', coSo:'GreenStars' });
const sauSua = goi({ action:'danhSachVoSinh', token:T_LT1, tim:a.maHV });
t('sửa không đổi được cơ sở', sauSua.students[0] && sauSua.students[0].coSo==='Hapulico', sauSua.students[0]);
const s3 = goi({ action:'suaVoSinh', token:T_LT2, maHV:a.maHV, hoTen:'Bị đổi trộm' });
t('lễ tân cơ sở khác không sửa được', s3.status==='error' && s3.code==='KHONG_TIM_THAY', s3);
const s4 = goi({ action:'suaVoSinh', token:T_HLV, maHV:a.maHV, hoTen:'HLV đổi' });
t('HLV thường không sửa được', s4.status==='error' && s4.code==='KHONG_DU_QUYEN', s4);

/* ---------- lookupStudent vẫn giới hạn ---------- */
t('tra mã của cơ sở khác vẫn báo không tìm thấy',
  goi({action:'lookupStudent',token:T_LT2,maHV:a.maHV}).code==='KHONG_TIM_THAY');

/* ---------- ĐĂNG NHẬP BẰNG MÃ VTF / MÃ HỌC VIÊN ---------- */
goi({ action:'suaVoSinh', token:T_LT1, maHV:a.maHV, maLienDoan:'VTF12345' });

const dnMa = dangNhap('VTF12345', phuHuynh.matKhauTam);
t('đăng nhập bằng mã VTF ra đúng tài khoản phụ huynh',
  dnMa.status==='success' && dnMa.user && dnMa.user.maPH==='PH001', dnMa);
t('mã VTF viết thường / có gạch vẫn vào được',
  dangNhap('vtf-12345', phuHuynh.matKhauTam).status==='success');
t('đăng nhập bằng mã học viên nội bộ cũng được',
  dangNhap(a.maHV, phuHuynh.matKhauTam).status==='success');
t('mã VTF đúng nhưng sai mật khẩu vẫn bị chặn',
  dangNhap('VTF12345','saibet').status==='error');
t('mã không tồn tại → cùng một câu lỗi, không lộ mã nào có thật',
  dangNhap('VTF99999','saibet').message === dangNhap('VTF12345','saibet').message);
t('số điện thoại vẫn đăng nhập bình thường',
  dangNhap('0900000001', leTanHP.matKhauTam).status==='success');

/* em chưa gắn phụ huynh thì mã không mở được cửa nào */
goi({ action:'suaVoSinh', token:T_LT1, maHV:b.maHV, maLienDoan:'VTF77777' });
t('võ sinh chưa gắn phụ huynh thì mã không đăng nhập được',
  dangNhap('VTF77777', phuHuynh.matKhauTam).status==='error');

console.log(ghi.join('\n'));
console.log(`\n${pass} đạt, ${fail} hỏng`);
process.exit(fail?1:0);
