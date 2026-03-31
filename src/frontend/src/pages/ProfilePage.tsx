import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import type { Video } from "@/data/videos";
import { useActor } from "@/hooks/useActor";
import { useVideos } from "@/hooks/useVideos";
import {
  ArrowLeft,
  Camera,
  Check,
  Play,
  Video as VideoIcon,
  X,
} from "lucide-react";
import { useRef, useState } from "react";

interface ProfilePageProps {
  onBack: () => void;
  onVideoSelect?: (video: Video) => void;
}

export default function ProfilePage({
  onBack,
  onVideoSelect,
}: ProfilePageProps) {
  const { authUser, updateProfile } = useAuth();
  const { actor } = useActor();
  const { videos } = useVideos();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(authUser?.name ?? "");
  const [username, setUsername] = useState(authUser?.username ?? "");
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(
    authUser?.avatarUrl,
  );
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const initials = (authUser?.name || authUser?.username || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Filter videos uploaded by this user
  const myVideos = videos.filter(
    (v) =>
      v.username === authUser?.username ||
      v.creator === authUser?.username ||
      v.username === authUser?.name,
  );

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    updateProfile({ name, username, avatarUrl: avatarPreview });
    try {
      if (actor) await actor.saveCallerUserProfile({ name });
    } catch {
      /* ignore backend errors */
    }
    setSaving(false);
    setEditing(false);
  };

  const handleCancel = () => {
    setName(authUser?.name ?? "");
    setUsername(authUser?.username ?? "");
    setAvatarPreview(authUser?.avatarUrl);
    setEditing(false);
  };

  return (
    <div className="animate-page-in pt-4 pb-8 px-4" data-ocid="profile.page">
      {/* Back */}
      <button
        type="button"
        className="flex items-center gap-1.5 mb-6 active:scale-95 transition-transform"
        style={{ color: "oklch(0.55 0.01 264)" }}
        onClick={onBack}
        data-ocid="profile.cancel_button"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Back</span>
      </button>

      {/* Avatar */}
      <div className="flex flex-col items-center gap-4 mb-8">
        <div className="relative">
          <Avatar className="w-24 h-24">
            {avatarPreview ? (
              <AvatarImage src={avatarPreview} alt={authUser?.name} />
            ) : null}
            <AvatarFallback
              className="text-2xl font-bold"
              style={{
                background: "oklch(0.548 0.222 27)",
                color: "oklch(0.98 0 0)",
              }}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          {editing && (
            <button
              type="button"
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-transform"
              style={{ background: "oklch(0.548 0.222 27)" }}
              onClick={() => fileRef.current?.click()}
              data-ocid="profile.upload_button"
            >
              <Camera className="w-4 h-4 text-white" />
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
            data-ocid="profile.dropzone"
          />
        </div>

        {!editing && (
          <>
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground">
                {authUser?.name || authUser?.username}
              </h2>
              <p style={{ color: "oklch(0.55 0.01 264)" }} className="text-sm">
                @{authUser?.username}
              </p>
            </div>
            <Button
              variant="outline"
              className="rounded-xl border-border text-foreground active:scale-95 transition-transform"
              onClick={() => setEditing(true)}
              data-ocid="profile.edit_button"
            >
              Edit Profile
            </Button>
          </>
        )}
      </div>

      {/* Edit form */}
      {editing && (
        <div
          className="rounded-2xl p-5 flex flex-col gap-4 mb-8"
          style={{
            background: "oklch(0.178 0.005 264)",
            border: "1px solid oklch(0.24 0.006 264)",
          }}
          data-ocid="profile.panel"
        >
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium text-foreground">
              Display Name
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 rounded-xl bg-input border-border text-foreground"
              placeholder="Your name"
              data-ocid="profile.input"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium text-foreground">
              Username
            </Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-11 rounded-xl bg-input border-border text-foreground"
              placeholder="@username"
              data-ocid="profile.search_input"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 h-11 rounded-xl border-border text-foreground active:scale-95 transition-transform"
              onClick={handleCancel}
              disabled={saving}
              data-ocid="profile.close_button"
            >
              <X className="w-4 h-4 mr-1.5" /> Cancel
            </Button>
            <Button
              className="flex-1 h-11 rounded-xl text-white font-semibold active:scale-95 transition-transform"
              style={{ background: "oklch(0.548 0.222 27)" }}
              onClick={handleSave}
              disabled={saving}
              data-ocid="profile.save_button"
            >
              <Check className="w-4 h-4 mr-1.5" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      )}

      {/* My Videos */}
      {!editing && (
        <div data-ocid="profile.my_videos_section">
          <div className="flex items-center gap-2 mb-4">
            <VideoIcon
              className="w-4 h-4"
              style={{ color: "oklch(0.548 0.222 27)" }}
            />
            <h3 className="text-base font-semibold text-foreground">
              My Videos
            </h3>
            {myVideos.length > 0 && (
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: "oklch(0.548 0.222 27 / 0.15)",
                  color: "oklch(0.548 0.222 27)",
                }}
              >
                {myVideos.length}
              </span>
            )}
          </div>

          {myVideos.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-12 rounded-2xl gap-3"
              style={{
                background: "oklch(0.178 0.005 264)",
                border: "1px solid oklch(0.24 0.006 264)",
              }}
            >
              <VideoIcon
                className="w-10 h-10"
                style={{ color: "oklch(0.38 0.008 264)" }}
              />
              <p
                className="text-sm font-medium"
                style={{ color: "oklch(0.55 0.01 264)" }}
              >
                No uploads yet
              </p>
              <p className="text-xs" style={{ color: "oklch(0.42 0.008 264)" }}>
                Your uploaded videos will appear here
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {myVideos.map((video) => (
                <button
                  key={video.id}
                  type="button"
                  className="flex gap-3 items-start w-full text-left rounded-2xl p-3 active:scale-[0.98] transition-transform"
                  style={{
                    background: "oklch(0.178 0.005 264)",
                    border: "1px solid oklch(0.24 0.006 264)",
                  }}
                  onClick={() => onVideoSelect?.(video)}
                  data-ocid="profile.video_card"
                >
                  {/* Thumbnail */}
                  <div
                    className="relative flex-shrink-0 rounded-xl overflow-hidden"
                    style={{ width: 120, aspectRatio: "16/9" }}
                  >
                    {video.thumbnailUrl ? (
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{ background: "oklch(0.22 0.006 264)" }}
                      >
                        <Play
                          className="w-5 h-5"
                          style={{ color: "oklch(0.548 0.222 27)" }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <p
                      className="text-sm font-semibold text-foreground leading-snug"
                      style={{
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {video.title}
                    </p>
                    {video.date && (
                      <p
                        className="text-xs"
                        style={{ color: "oklch(0.42 0.008 264)" }}
                      >
                        {video.date}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
