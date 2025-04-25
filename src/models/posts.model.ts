export interface Post {
  id: string;
  caption?: string;
  thumbnail_url: string;
  video_url?: string;
  user: string;
  canonical_uid: string;
  md5?: string;
  date: number | string;
  create_time: number | string;
  update_time: number | string;
  overlays: Overlay[];
}

export interface Overlay {
  overlay_id: OverlayID | string;
  overlay_type: OverlayType | string;
  alt_text: string;
  data: Data;
}

export interface Data {
  type: Type | string;
  text: string;
  text_color: string;
  max_lines: number;
  background: Background;
}

export interface Background {
  material_blur: string;
  colors: any[];
}

export enum Type {
  Review = "review",
  Standard = "standard",
  Time = "time",
}

export enum OverlayID {
  CaptionReview = "caption:review",
  CaptionStandard = "caption:standard",
  CaptionTime = "caption:time",
}

enum OverlayType {
  Caption = "caption",
}
