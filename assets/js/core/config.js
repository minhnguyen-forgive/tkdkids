/* =============================================================
   CẤU HÌNH TẬP TRUNG — một nguồn sự thật cho toàn hệ thống.
   Sửa thông tin cơ sở, ca học, vai trò... chỉ ở file này.
   ============================================================= */

export const API_URL =
  'https://script.google.com/macros/s/AKfycbz7YuEDaXJf5HSo996smVje3jsZyNeb_s1FKWWgJjwiiDmYA1hYrHNtH2biBIfSnzkQ/exec';

export const SITE = {
  name: 'Taekwondo Kids Việt Nam',
  company: 'Công ty TNHH Huấn luyện Phát triển Võ thuật Việt Nam',
  hotline: '0978931747',
  hotlineDisplay: '097 893 1747',
  email: 'taekwondokids.vn@gmail.com',
  facebook: 'https://fb.com/taekwondokids.vietnam',
  messenger: 'https://www.facebook.com/messages/t/1423672700992207',
  tiktok: 'https://tiktok.com/@taekwondokidsvn',
  zalo: 'https://zalo.me/0978931747',
};

/* ---------- HỆ THỐNG CƠ SỞ ----------
   id      : mã dùng trong CSDL, KHÔNG đổi sau khi đã có dữ liệu
   code    : mã ngắn dùng sinh mã học viên (VD: HP0012)
   region  : nhóm hiển thị trên trang chủ
   address : địa chỉ đầy đủ, dùng luôn cho Google Maps
   image   : ảnh trong thư mục gốc website
*/
export const BRANCHES = [
  {
    id: 'Hapulico', code: 'HP', name: 'Cơ sở Hapulico', region: 'Hà Nội',
    address: 'Tầng B1, Toà 21T1, Chung cư Hapulico, 83 Vũ Trọng Phụng, Thanh Xuân, Hà Nội',
    shortAddress: 'Tầng B1 · Toà 21T1 Hapulico, 83 Vũ Trọng Phụng, Thanh Xuân',
    mapLink: 'https://maps.app.goo.gl/BiuQSZXiAWorEFRg8',
    image: 'hapu.jpg', since: 2015,
  },
  {
    id: 'GreenStars', code: 'GS', name: 'Cơ sở GreenStars', region: 'Hà Nội',
    address: 'Tầng 1, Toà 21B5, Chung cư GreenStar, 234 Phạm Văn Đồng, Phú Diễn, Hà Nội',
    shortAddress: 'Tầng 1 · Toà 21B5 GreenStar, 234 Phạm Văn Đồng, Phú Diễn',
    mapLink: 'https://maps.app.goo.gl/TWiB4funW3Tcwyxu7',
    image: 'green.jpg', since: 2018,
  },
  {
    id: 'NghiaDo', code: 'ND', name: 'Cơ sở Nghĩa Đô', region: 'Hà Nội',
    address: 'Tầng 1, Toà CT3, Khu đô thị mới Nghĩa Đô, Nghĩa Đô, Cầu Giấy, Hà Nội',
    shortAddress: 'Tầng 1 · Toà CT3, KĐT mới Nghĩa Đô, Cầu Giấy',
    mapLink: 'https://maps.app.goo.gl/yzNeyMJ2HAW5HbcU7',
    image: 'nghiado.jpg', since: 2020,
  },
  {
    id: 'HaDong', code: 'HD', name: 'Cơ sở Hà Đông', region: 'Hà Nội',
    address: 'Tầng 1, Toà T2A, TSQ EuroLand, 25 Nguyễn Văn Lộc, Mộ Lao, Hà Đông, Hà Nội',
    shortAddress: 'Tầng 1 · Toà T2A TSQ EuroLand, 25 Nguyễn Văn Lộc, Hà Đông',
    mapLink: 'https://maps.google.com/?q=TSQ+EuroLand+25+Nguyen+Van+Loc+Mo+Lao+Ha+Dong',
    image: 'hadong.jpg', since: 2025,
  },
  {
    id: 'LongBien', code: 'LB', name: 'Cơ sở Long Biên', region: 'Hà Nội',
    address: 'Tầng 1, Toà L4, Chung cư LeGrand Jardin, Sài Đồng, Long Biên, Hà Nội',
    shortAddress: 'Tầng 1 · Toà L4 LeGrand Jardin, Sài Đồng, Long Biên',
    mapLink: 'https://maps.google.com/?q=LeGrand+Jardin+Sai+Dong+Long+Bien',
    image: 'longbien.jpg', since: 2025,
  },
  {
    id: 'GiaHoa', code: 'GH', name: 'Cơ sở Gia Hoà', region: 'TP. Hồ Chí Minh',
    address: 'Phòng B3.01.09, Chung cư Gia Hoà, 523A Đỗ Xuân Hợp, TP. Thủ Đức, TP. Hồ Chí Minh',
    shortAddress: 'Phòng B3.01.09 · Chung cư Gia Hoà, 523A Đỗ Xuân Hợp, Thủ Đức',
    mapLink: 'https://maps.google.com/?q=Chung+cu+Gia+Hoa+523A+Do+Xuan+Hop+Thu+Duc',
    image: 'giahoa.jpg', since: 2019,
  },
  {
    id: 'HaLong', code: 'HL', name: 'Cơ sở Hạ Long', region: 'Quảng Ninh',
    address: 'Tổ 3, Khu 3, Trần Hưng Đạo, TP. Hạ Long, Quảng Ninh',
    shortAddress: 'Tổ 3, Khu 3, Trần Hưng Đạo, TP. Hạ Long',
    mapLink: 'https://maps.google.com/?q=To+3+Khu+3+Tran+Hung+Dao+Ha+Long+Quang+Ninh',
    image: 'halong.jpg', since: 2021,
  },
];

/** Tra cứu cơ sở theo id. Chấp nhận cả tên đầy đủ để tương thích dữ liệu cũ. */
export function findBranch(idOrName) {
  if (!idOrName) return null;
  const key = String(idOrName).trim();
  return (
    BRANCHES.find(b => b.id === key) ||
    BRANCHES.find(b => b.name === key) ||
    BRANCHES.find(b => b.code === key) ||
    null
  );
}

/** Link mở Google Maps ở chế độ CHỈ ĐƯỜNG tới cơ sở. */
export function directionsUrl(branch) {
  return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(branch.address);
}

/** Link nhúng bản đồ (iframe) — không cần API key. */
export function embedMapUrl(branch) {
  return 'https://maps.google.com/maps?q=' + encodeURIComponent(branch.address) + '&z=16&output=embed';
}

/* ---------- CA HỌC ---------- */
export const WEEK_DAYS = [
  { id: 1, label: 'Thứ 2' }, { id: 2, label: 'Thứ 3' }, { id: 3, label: 'Thứ 4' },
  { id: 4, label: 'Thứ 5' }, { id: 5, label: 'Thứ 6' },
  { id: 6, label: 'Thứ 7', isWeekend: true }, { id: 0, label: 'Chủ Nhật', isWeekend: true },
];

export const SHIFT_SLOTS = {
  weekday: [
    { id: '17', label: '17:00 - 18:00', short: '17h' },
    { id: '18', label: '18:00 - 19:00', short: '18h' },
  ],
  weekend: [
    { id: '09', label: 'Sáng: 09:00 - 10:00', short: '09h' },
    { id: '10', label: 'Sáng: 10:00 - 11:00', short: '10h' },
    { id: '14', label: 'Chiều: 14:00 - 15:00', short: '14h' },
    { id: '15', label: 'Chiều: 15:00 - 16:00', short: '15h' },
    { id: '17', label: 'Tối: 17:00 - 18:00', short: '17h' },
    { id: '18', label: 'Tối: 18:00 - 19:00', short: '18h' },
  ],
};

/** Nhãn đầy đủ của một ca, tra trong cả ngày thường lẫn cuối tuần. */
export function shiftLabel(caId) {
  const all = [...SHIFT_SLOTS.weekday, ...SHIFT_SLOTS.weekend];
  return all.find(s => s.id === String(caId))?.label || `${caId}:00`;
}

/* ---------- CẤP ĐAI ---------- */
export const BELTS = [
  { id: 'trang',      name: 'Đai Trắng',        color: '#F1F5F9', text: '#0F172A' },
  { id: 'vang_trang', name: 'Đai Vàng vạch Trắng', color: '#FDE68A', text: '#78350F' },
  { id: 'vang',       name: 'Đai Vàng',         color: '#FCD34D', text: '#78350F' },
  { id: 'xanh_vang',  name: 'Đai Xanh vạch Vàng', color: '#A7F3D0', text: '#064E3B' },
  { id: 'xanh',       name: 'Đai Xanh',         color: '#34D399', text: '#064E3B' },
  { id: 'do_xanh',    name: 'Đai Đỏ vạch Xanh', color: '#FCA5A5', text: '#7F1D1D' },
  { id: 'do',         name: 'Đai Đỏ',           color: '#EF4444', text: '#FFFFFF' },
  { id: 'den_1',      name: 'Đai Đen 1 Đẳng',   color: '#1E293B', text: '#FFFFFF' },
  { id: 'den_2',      name: 'Đai Đen 2 Đẳng',   color: '#1E293B', text: '#FFFFFF' },
  { id: 'den_3',      name: 'Đai Đen 3 Đẳng',   color: '#1E293B', text: '#FFFFFF' },
  { id: 'den_4',      name: 'Đai Đen 4 Đẳng',   color: '#1E293B', text: '#FFFFFF' },
];

export function findBelt(nameOrId) {
  if (!nameOrId) return null;
  const key = String(nameOrId).trim().toLowerCase();
  return BELTS.find(b => b.id === key) || BELTS.find(b => b.name.toLowerCase() === key) || null;
}

/* ---------- VAI TRÒ ---------- */
export const ROLES = {
  PHU_HUYNH: 'phu_huynh',
  HLV: 'hlv',
  HLV_TRUONG: 'hlv_truong',
  LE_TAN: 'le_tan',
  ADMIN: 'admin',
};

export const ROLE_LABELS = {
  phu_huynh: 'Phụ huynh',
  hlv: 'Huấn luyện viên',
  hlv_truong: 'HLV Trưởng',
  le_tan: 'Lễ tân',
  admin: 'Quản trị viên',
};

/** Chuẩn hoá vai trò từ dữ liệu cũ (cột `role` đang là text tự do tiếng Việt). */
export function normalizeRole(raw) {
  const r = String(raw || '').toLowerCase().trim();
  if (r.includes('admin') || r.includes('quản trị')) return ROLES.ADMIN;
  if (r.includes('lễ tân') || r.includes('le tan') || r.includes('letan')) return ROLES.LE_TAN;
  if (r.includes('trưởng') || r.includes('truong')) return ROLES.HLV_TRUONG;
  if (r.includes('phụ huynh') || r.includes('phu huynh')) return ROLES.PHU_HUYNH;
  return ROLES.HLV;
}

export const isApprover  = role => [ROLES.ADMIN, ROLES.HLV_TRUONG].includes(role);
export const isReception = role => [ROLES.ADMIN, ROLES.LE_TAN].includes(role);
export const isStaff     = role => role !== ROLES.PHU_HUYNH;
