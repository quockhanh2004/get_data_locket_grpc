import {
  ListenResponse,
  TimestampValue,
  Value,
} from "../models/firebase.model";
import { Post, Overlay } from "../models/posts.model"; // Import các interface mới

// Helper function để chuyển đổi TimestampValue thành Unix timestamp (số giây)
// Xử lý trường hợp timestamp hoặc seconds/nanos có thể là undefined
function timestampToSeconds(ts?: TimestampValue): number | undefined {
  if (!ts?.seconds) {
    return undefined;
  }
  // Có thể chọn trả về float nếu cần độ chính xác nano:
  // const seconds = Number(ts.seconds);
  // const nanos = Number(ts.nanos || 0);
  // return seconds + nanos / 1e9;
  // Hoặc chỉ trả về số giây dạng integer:
  return parseInt(ts.seconds, 10);
}

// Helper function để trích xuất giá trị từ Firestore Value object một cách an toàn
function getString(value?: Value): string | undefined {
  return value?.string_value;
}

function getInteger(value?: Value): number | undefined {
  const intStr = value?.integer_value;
  if (intStr === undefined) return undefined;
  const num = parseInt(intStr, 10);
  return isNaN(num) ? undefined : num;
}

function simplifyFirestoreData(data: ListenResponse): Post | null {
  const document = data.document_change?.document;
  const fields = document?.fields;

  // Kiểm tra các trường cơ bản phải có
  if (!document || !fields) {
    console.error("Document change or fields missing in Firestore data");
    return null;
  }

  // Trích xuất các trường chính với kiểm tra null/undefined an toàn
  const canonicalUid = getString(fields.canonical_uid);
  const thumbnailUrl = getString(fields.thumbnail_url);
  const user = getString(fields.user);

  // Kiểm tra các trường bắt buộc của Post phải có giá trị
  if (!canonicalUid || !thumbnailUrl || !user) {
    console.error(
      "Essential fields (canonical_uid, thumbnail_url, user) missing in Firestore document"
    );
    return null;
  }

  // Xử lý overlays
  const overlayValues = fields.overlays?.array_value?.values || [];
  const overlays: Overlay[] = overlayValues
    .map((itemValue): Overlay | null => {
      const overlayFields = itemValue.map_value?.fields;
      if (!overlayFields) return null; // Bỏ qua nếu item không hợp lệ

      const dataMapValue = overlayFields.data?.map_value;
      const dataFields = dataMapValue?.fields;

      let overlayData: any | undefined = undefined;
      if (dataFields) {
        // Trích xuất background colors
        const backgroundColors =
          dataFields.background?.map_value?.fields?.colors?.array_value?.values
            ?.map((colorValue) => getString(colorValue)) // Lấy string_value
            .filter((c): c is string => !!c); // Loại bỏ các giá trị undefined/null

        // Trích xuất icon data
        const iconFields = dataFields.icon?.map_value?.fields;
        const iconData: any | undefined = iconFields
          ? {
              type: getString(iconFields.type),
              data: getString(iconFields.data),
            }
          : undefined;

        overlayData = {
          type: getString(dataFields.type),
          text: getString(dataFields.text),
          text_color: getString(dataFields.text_color),
          max_lines: getInteger(dataFields.max_lines),
          background:
            backgroundColors && backgroundColors.length > 0
              ? { colors: backgroundColors } // Chỉ thêm background nếu có colors
              : // Thêm material_blur nếu cần:
                // material_blur: getString(dataFields.background?.map_value?.fields?.material_blur)
                undefined,
          icon: iconData,
        };
      }

      return {
        overlay_id: getString(overlayFields.overlay_id) || "",
        overlay_type: getString(overlayFields.overlay_type) || "",
        alt_text: getString(overlayFields.alt_text) || "",
        data: overlayData,
      };
    })
    .filter((o): o is Overlay => o !== null); // Lọc bỏ các giá trị null có thể có từ map

  // Tạo đối tượng Post
  const post: Post = {
    id: canonicalUid, // Đã kiểm tra ở trên
    caption: getString(fields.caption),
    thumbnail_url: thumbnailUrl, // Đã kiểm tra ở trên
    video_url: getString(fields.video_url),
    user: user, // Đã kiểm tra ở trên
    canonical_uid: canonicalUid, // Đã kiểm tra ở trên
    md5: getString(fields.md5),
    date: timestampToSeconds(fields.date?.timestamp_value) || 0,
    create_time: timestampToSeconds(document.create_time) || 0,
    update_time: timestampToSeconds(document.update_time) || 0,
    overlays: overlays,
  };

  return post;
}

export default simplifyFirestoreData;
