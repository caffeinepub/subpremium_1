export interface Video {
  id: string;
  title: string;
  creator: string;
  username: string;
  ownerId?: string;
  views: number;
  description: string;
  date: string;
  thumbnailUrl?: string;
  thumbnail?: string;
  videoUrl?: string;
  hlsUrl?: string;
  duration: string;
  status?: string; // "READY" | "uploading"
  uploading?: boolean; // true while upload in progress
  progress?: number; // 0-100 upload progress
  isLocalVideo?: boolean; // saved directly to localStorage with blob URL
  visibility?: string; // "public" | "private" | "unlisted"
  createdAt?: number; // unix ms timestamp
  ownerName?: string;
  avatar?: string;
}

export const VIDEOS: Video[] = [];

export function formatViews(views: number): string {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M views`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(0)}K views`;
  return `${views} views`;
}
