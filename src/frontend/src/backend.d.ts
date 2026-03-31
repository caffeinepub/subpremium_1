import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface Video {
    id: string;
    title: string;
    thumbnail: ExternalBlob;
    ownerName: string;
    video: ExternalBlob;
    owner: Principal;
    createdAt: bigint;
    description: string;
    hlsUrl: string | null;
}
export interface VideoUrlRecord {
    id: string;
    owner: Principal;
    ownerName: string;
    title: string;
    description: string;
    thumbnailUrl: string;
    videoUrl: string;
    hlsUrl: string | null;
    createdAt: bigint;
}
export interface UserProfile {
    name: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    addVideoUrl(title: string, description: string, thumbnailUrl: string, videoUrl: string, ownerName: string, hlsUrl: string | null): Promise<string>;
    getAllVideoUrlRecords(): Promise<Array<VideoUrlRecord>>;
    getAllVideos(): Promise<Array<Video>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getVideo(id: string): Promise<Video | null>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    uploadVideo(title: string, description: string, thumbnail: ExternalBlob, video: ExternalBlob, ownerName: string, hlsUrl: string | null): Promise<string>;
}
