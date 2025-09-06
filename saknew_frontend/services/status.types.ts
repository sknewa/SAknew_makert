export interface Status {
  id: number;
  user_id: number;
  content: string;
  media_url?: string;
  media_type?: 'image' | 'video' | 'text';
  background_color?: string;
  created_at: string;
  expires_at: string;
  is_active: boolean;
  view_count: number;
}

export interface StatusView {
  id: number;
  status_id: number;
  viewer_id: number;
  viewed_at: string;
}

export interface UserStatus {
  user: {
    id: number;
    username: string;
    profile: {
      profile_picture?: string;
      shop_slug?: string;
    };
  };
  statuses: Status[];
  latest_status: Status;
  unviewed_count: number;
}