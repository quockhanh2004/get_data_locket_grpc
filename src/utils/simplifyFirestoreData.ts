import { v4 as uuidv4 } from 'uuid';
import { ListenResponse, Value } from "../models/firebase.model";
import {
  getString,
  getInteger,
  timestampToSeconds,
  getBoolean,
  getMap,
} from "./firestoreConverters";

/**
 * Chuyển đổi dữ liệu từ Firestore thành object Post rõ ràng
 */
export function simplifyFirestoreData(data: ListenResponse) {
  const document = data.document_change?.document;
  const fields = document?.fields;

  if (!document || !fields) return null;

  const canonicalUid = getString(fields.canonical_uid);
  const thumbnailUrl = getString(fields.thumbnail_url);
  const user = getString(fields.user);

  const overlayValues = fields.overlays?.array_value?.values || [];
  const overlays = overlayValues
    .map((itemValue) => {
      const overlayFields = itemValue.map_value?.fields;
      if (!overlayFields) return null;

      const dataFields = overlayFields.data?.map_value?.fields;
      if (!dataFields) return null;

      const backgroundFields = dataFields.background?.map_value?.fields ?? {};
      const iconFields = dataFields.icon?.map_value?.fields ?? {};
      const payloadFields = dataFields.payload?.map_value?.fields ?? {};

      // Parse background colors
      const backgroundColors =
        backgroundFields.colors?.array_value?.values
          ?.map(getString)
          .filter((color): color is string => color !== undefined) || [];

      // Parse payload fields
      const parsedPayload = Object.fromEntries(
        Object.entries(payloadFields).map(([key, value]): [string, any] => {
          if ("string_value" in value) return [key, value.string_value];
          if ("double_value" in value) return [key, value.double_value];
          if ("integer_value" in value)
            return [key, parseInt(value.integer_value || "0")];
          if ("boolean_value" in value) return [key, value.boolean_value];
          if ("array_value" in value) {
            const arr = value.array_value?.values || [];
            const parsedArr = arr
              .map((v: Value) => {
                if ("string_value" in v) return v.string_value;
                if ("double_value" in v) return v.double_value;
                if ("integer_value" in v)
                  return parseInt(v.integer_value || "0");
                if ("boolean_value" in v) return v.boolean_value;
                return undefined;
              })
              .filter((v) => v !== undefined);
            return [key, parsedArr];
          }
          return [key, null];
        })
      );

      return {
        overlay_id: getString(overlayFields.overlay_id) || "",
        overlay_type: getString(overlayFields.overlay_type) || "",
        alt_text: getString(overlayFields.alt_text) || "",
        data: {
          type: getString(dataFields.type),
          text: getString(dataFields.text),
          text_color: getString(dataFields.text_color),
          max_lines: getInteger(dataFields.max_lines),
          background: {
            colors: backgroundColors,
            material_blur: getString(backgroundFields.material_blur),
          },
          icon: {
            type: getString(iconFields.type),
            data: getString(iconFields.data),
            color: getString(iconFields.color),
            source: getString(iconFields.source),
          },
          payload: parsedPayload,
        },
      };
    })
    .filter((o) => o !== null);

  const post = {
    id: canonicalUid,
    caption: getString(fields.caption),
    thumbnail_url: thumbnailUrl,
    video_url: getString(fields.video_url),
    user,
    canonical_uid: canonicalUid,
    md5: getString(fields.md5),
    date: timestampToSeconds(fields.date?.timestamp_value) || 0,
    create_time: timestampToSeconds(document.create_time) || 0,
    update_time: timestampToSeconds(document.update_time) || 0,
    overlays,
  };

  return post;
}

export function simplifyFirestoreDataMessage(data: ListenResponse) {
  const document = data.document_change?.document;
  const fields = document?.fields;

  if (!document || !fields) return null;

  const notFoundId = fields.client_token?.null_value;

  let messageId = getString(fields.client_token);
  if (notFoundId) {
    messageId = getString(fields.reply_moment);
  }
    const message = {
      id: messageId,
      text: getString(fields.body),
      sender: getString(fields.sender),
      thumbnail_url: getString(fields.thumbnail_url),
      reply_moment: getString(fields.reply_moment),
      create_time: timestampToSeconds(document.create_time) || 0,
    };

  return message;
}

export function simplifyFirestoreDataChat(
  data: ListenResponse,
  user_id: string
) {
  const document = data.document_change?.document;
  const fields = document?.fields;

  const members = fields?.members?.array_value?.values || [];

  const with_user = members.find((item) => item.string_value !== user_id);
  if (!document || !fields) return null;

  const chat = {
    is_read: getBoolean(fields.is_read),
    last_read_at: timestampToSeconds(fields.last_read_at?.timestamp_value) || 0,
    latest_message: getString(getMap(fields.latest_message).body),
    uid: getString(fields.uid),
    update_time: timestampToSeconds(
      fields?.latest_message?.map_value?.fields?.created_at?.timestamp_value
    ),
    sender: getString(fields.latest_message.map_value?.fields.sender),
    with_user: with_user?.string_value,
  };

  return chat;
}

export function simplifyFirestoreDataReactPost(data: ListenResponse) {
  const document = data.document_change?.document;
  const fields = document?.fields;

  if (!document || !fields) return null;

  const react = {
    id: getString(fields.name),
    value: getString(fields.string),
    user: getString(fields.user),
    viewed_at: timestampToSeconds(fields.viewed_at?.timestamp_value) || 0,
    create_time: timestampToSeconds(document.create_time) || 0,
  };

  return react;
}
