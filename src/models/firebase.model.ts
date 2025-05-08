export interface ListenResponse {
  target_change?: TargetChange;
  document_change?: DocumentChange;
  document_delete?: DocumentDelete;
  document_remove?: DocumentRemove;
  filter?: ExistenceFilter;
}

export enum TargetChangeType {
  NO_CHANGE = "NO_CHANGE",
  ADD = "ADD",
  REMOVE = "REMOVE",
  CURRENT = "CURRENT",
  RESET = "RESET",
}

export interface TargetChange {
  target_change_type?: TargetChangeType;
  target_ids?: number[];
  cause?: Status;
  resume_token?: string;
  read_time?: string; // ISO 8601 timestamp
}

export interface DocumentChange {
  document?: Document;
  target_ids?: number[];
  removed_target_ids?: number[];
}

export interface DocumentDelete {
  document?: string;
  read_time?: string;
  removed_target_ids?: number[];
}

export interface DocumentRemove {
  document?: string;
  removed_target_ids?: number[];
  read_time?: string;
}

export interface ExistenceFilter {
  target_id?: number;
  count?: number;
}

export interface Document {
  name?: string;
  fields?: {
    [key: string]: Value;
  };
  create_time: TimestampValue;
  update_time: TimestampValue;
}

export interface Value {
  null_value?: null;
  boolean_value?: boolean;
  integer_value?: string;
  double_value?: number;
  timestamp_value: TimestampValue;
  string_value?: string;
  bytes_value?: string;
  reference_value?: string;
  geo_point_value?: {
    latitude: number;
    longitude: number;
  };
  array_value?: {
    values: Value[];
  };
  map_value?: {
    fields: { [key: string]: Value };
  };
}

export interface Status {
  code?: number;
  message?: string;
  details?: any[];
}

export interface TimestampValue {
  seconds?: string;
  nanos?: number;
}
