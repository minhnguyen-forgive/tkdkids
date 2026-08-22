/* =============================================================
   XỬ LÝ ẢNH PHÍA TRÌNH DUYỆT
   Thu nhỏ ảnh TRƯỚC khi gửi lên máy chủ. Hai lý do:
   1. Ảnh camera 1920x1080 nặng ~260KB. Với 14.400 lượt điểm danh
      mỗi năm là ~3,6 GB — Drive miễn phí chỉ có 15GB.
   2. Apps Script nhận base64 qua POST rất dễ timeout trên mạng 4G
      khi ảnh vượt ~200KB.
   Thu về 480px vẫn thừa rõ để nhận diện khuôn mặt.
   ============================================================= */

/** Vẽ ảnh đã thu nhỏ (giữ tỉ lệ) vào canvas và trả về dataURL JPEG. */
function drawScaled(source, srcW, srcH, maxSize, quality, mirror) {
  const scale = Math.min(1, maxSize / Math.max(srcW, srcH));
  const w = Math.round(srcW * scale);
  const h = Math.round(srcH * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  if (mirror) { ctx.translate(w, 0); ctx.scale(-1, 1); }   // camera trước: lật cho giống gương
  ctx.drawImage(source, 0, 0, w, h);

  return canvas.toDataURL('image/jpeg', quality);
}

/** Chụp một khung hình từ thẻ <video> và thu nhỏ. Dùng cho điểm danh selfie. */
export function captureFromVideo(video, { maxSize = 480, quality = 0.72, mirror = true } = {}) {
  return drawScaled(video, video.videoWidth || 640, video.videoHeight || 480, maxSize, quality, mirror);
}

/**
 * Đọc file ảnh người dùng chọn, thu nhỏ, trả dataURL.
 * Dùng cho ảnh hồ sơ võ sinh (lễ tân tải lên từ máy/điện thoại).
 */
export function readAndResize(file, { maxSize = 400, quality = 0.82 } = {}) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('Chưa chọn tệp ảnh.'));
    if (!/^image\//.test(file.type)) return reject(new Error('Tệp được chọn không phải ảnh.'));
    if (file.size > 15 * 1024 * 1024) return reject(new Error('Ảnh quá lớn (tối đa 15MB).'));

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        resolve(drawScaled(img, img.naturalWidth, img.naturalHeight, maxSize, quality, false));
      } catch (err) { reject(err); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Không đọc được tệp ảnh.')); };
    img.src = url;
  });
}

/** Kích thước thật của một chuỗi dataURL, tính bằng KB. */
export function dataUrlSizeKB(dataUrl) {
  const base64 = String(dataUrl).split(',')[1] || '';
  return Math.round((base64.length * 3 / 4) / 1024);
}
