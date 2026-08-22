/* =============================================================
   NỘI DUNG — nguồn dữ liệu cho Tin tức và Album ảnh.

   Hiện đọc từ hai tệp JSON tĩnh trong thư mục /data. Tải từ CDN của
   GitHub Pages mất khoảng 30ms, trong khi gọi Google Apps Script mất
   0,5–2 giây, nên với nội dung công khai chỉ để đọc thì cách này nhanh
   hơn hẳn và không tốn hạn ngạch Apps Script.

   Khi chuyển sang quản trị nội dung bằng Google Sheet, chỉ cần sửa
   DUY NHẤT hàm loadJson() bên dưới thành lời gọi callApi(), phần còn
   lại của website không phải đổi một dòng nào.
   ============================================================= */

const CACHE = new Map();      // đường dẫn -> Promise, để mỗi tệp chỉ tải một lần

function loadJson(path) {
  if (!CACHE.has(path)) {
    CACHE.set(path, fetch(path, { cache: 'no-cache' }).then(r => {
      if (!r.ok) throw new Error(`Không tải được ${path} (HTTP ${r.status})`);
      return r.json();
    }));
  }
  return CACHE.get(path);
}

export async function getArticles() {
  const d = await loadJson('data/tin-tuc.json');
  return [...d.articles].sort((a, b) => b.date.localeCompare(a.date));
}

export async function getArticle(id) {
  return (await getArticles()).find(a => a.id === id) || null;
}

/** Bài liên quan: ưu tiên cùng chuyên mục, thiếu thì lấy bài mới nhất bù vào. */
export async function getRelated(id, limit = 3) {
  const all = await getArticles();
  const cur = all.find(a => a.id === id);
  if (!cur) return all.slice(0, limit);
  const rest = all.filter(a => a.id !== id);
  const same = rest.filter(a => a.category === cur.category);
  const other = rest.filter(a => a.category !== cur.category);
  return [...same, ...other].slice(0, limit);
}

export async function getCategories() {
  const all = await getArticles();
  return [...new Set(all.map(a => a.category))];
}

export async function getAlbums() {
  const d = await loadJson('data/album.json');
  return [...d.albums].sort((a, b) => b.year - a.year || b.date.localeCompare(a.date));
}

export async function getAlbum(id) {
  return (await getAlbums()).find(a => a.id === id) || null;
}

/** Gom album theo năm, năm mới nhất lên trước. */
export async function getAlbumsByYear() {
  const all = await getAlbums();
  const map = new Map();
  for (const a of all) {
    if (!map.has(a.year)) map.set(a.year, []);
    map.get(a.year).push(a);
  }
  return [...map.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, albums]) => ({
      year,
      albums,
      photoCount: albums.reduce((s, x) => s + x.photos.length, 0),
    }));
}

/** Lấy tham số trên thanh địa chỉ, VD bai-viet.html?id=ten-bai */
export function paramId(key = 'id') {
  return new URLSearchParams(location.search).get(key) || '';
}
