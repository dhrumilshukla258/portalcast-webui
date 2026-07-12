/* eslint-disable @typescript-eslint/no-explicit-any */

// TODO: verify actual server shape
export type Config = {
  hostname: string;
  port: string;
  contextPath: string;
  mac: string;
  deviceId1: string;
  [key: string]: any;
};

export interface UserRecord {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'user';
  isActive: boolean;
  createdAt: string;
}

export interface CreateUserPayload {
  email: string;
  name: string;
  role: 'admin' | 'user';
  isActive: boolean;
  password?: string;
}

export interface UpdateUserPayload {
  name: string;
  role: 'admin' | 'user';
  isActive: boolean;
  password?: string;
}

export type ContentType = 'channel' | 'movie' | 'series';

export interface Category {
  id: string;
  title: string;
  display_name?: string | null;
  hidden?: boolean;
  count?: number;
}

export interface Item {
  id: string;
  name: string;
  display_name?: string | null;
  hidden?: boolean;
  target_category_id?: string | null;
  original_category_id?: string | null;
}

export interface ReorderPayload {
  order: Array<{ id: string; sort_order: number }>;
}

export interface UpdateCategoryPayload {
  display_name: string | null;
  hidden: boolean;
  virtual_title?: string;
}

export interface UpdateItemPayload {
  display_name: string | null;
  hidden: boolean;
  target_category_id: string | null;
  original_category_id: string | null;
}
