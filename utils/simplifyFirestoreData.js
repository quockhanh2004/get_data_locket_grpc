function simplifyFirestoreData(data) {
  const fields = data.document.fields;
  const timestampToFloat = ({ seconds, nanos }) =>
    Number(seconds) + nanos / 1e9;

  return {
    id: fields.canonical_uid?.string_value,
    caption: fields.caption?.string_value,
    thumbnail_url: fields.thumbnail_url?.string_value,
    video_url: fields.video_url?.string_value,
    user: fields.user?.string_value,
    canonical_uid: fields.canonical_uid?.string_value,
    md5: fields.md5?.string_value,
    date: timestampToFloat(fields.date.timestamp_value),
    create_time: timestampToFloat(data.document.create_time),
    update_time: timestampToFloat(data.document.update_time),
    overlays: (fields.overlays?.array_value?.values || []).map((item) => {
      const overlay = item.map_value.fields;
      const dataFields = overlay.data.map_value.fields;
      return {
        overlay_id: overlay.overlay_id?.string_value,
        overlay_type: overlay.overlay_type?.string_value,
        alt_text: overlay.alt_text?.string_value,
        data: {
          type: dataFields.type?.string_value,
          text: dataFields.text?.string_value,
          text_color: dataFields.text_color?.string_value,
          max_lines: Number(dataFields.max_lines.integer_value),
          background: {
            material_blur:
              dataFields.background.map_value.fields.material_blur
                ?.string_value,
            colors: [],
          },
        },
      };
    }),
  };
}

module.exports = simplifyFirestoreData;
