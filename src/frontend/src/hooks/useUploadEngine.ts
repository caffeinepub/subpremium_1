import { type Video as BackendVideo, ExternalBlob } from "@/backend";
import { useAuth } from "@/context/AuthContext";
import { useVideos } from "@/context/VideoContext";
import { useActor } from "@/hooks/useActor";
import {
  deleteFileBlobFromIDB,
  deleteSession,
  getAllSessions,
  getFileBlobFromIDB,
  getSession,
  saveFileBlobToIDB,
  saveSession,
} from "@/utils/uploadIDB";
import React, {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

export type UploadState =
  | "idle"
  | "uploading"
  | "processing"
  | "done"
  | "error";

interface UploadParams {
  file: File;
  title: string;
  description: string;
  thumbnail: File;
  hlsUrl?: string;
  uploadId?: string;
}

interface UploadEngineContextValue {
  uploadState: UploadState;
  progress: number;
  statusText: string;
  errorMsg: string;
  startUpload: (params: UploadParams) => void;
  reset: () => void;
}

const UploadEngineContext = createContext<UploadEngineContextValue | null>(
  null,
);

const CHUNK_SIZE = 2 * 1024 * 1024;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function dataUrlToFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(",");
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
  const bstr = atob(arr[1]);
  const n = bstr.length;
  const u8arr = new Uint8Array(n);
  for (let i = 0; i < n; i++) u8arr[i] = bstr.charCodeAt(i);
  return new File([u8arr], filename, { type: mime });
}

function clearUploadLocalStorage(uploadId: string) {
  localStorage.removeItem("activeUpload");
  localStorage.removeItem(`upload_progress_${uploadId}`);
}

export function UploadEngineProvider({ children }: { children: ReactNode }) {
  const { actor } = useActor();
  const { authUser } = useAuth();
  const { addVideo, updateVideo, removeVideo } = useVideos();

  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const actorRef = useRef(actor);
  const authUserRef = useRef(authUser);
  const addVideoRef = useRef(addVideo);
  const updateVideoRef = useRef(updateVideo);
  const removeVideoRef = useRef(removeVideo);
  const isUploadingRef = useRef(false);
  // Ref to doUpload so the restore effect can call it without being a dependency
  const doUploadRef = useRef<(params: UploadParams) => Promise<void>>(
    async () => {},
  );

  actorRef.current = actor;
  authUserRef.current = authUser;
  addVideoRef.current = addVideo;
  updateVideoRef.current = updateVideo;
  removeVideoRef.current = removeVideo;

  const doUpload = useCallback(async (params: UploadParams) => {
    if (isUploadingRef.current) {
      toast.error("An upload is already in progress.");
      return;
    }
    isUploadingRef.current = true;

    const { file, title, description, thumbnail, hlsUrl } = params;
    const currentUser = authUserRef.current;

    // 2GB file size limit
    if (file.size > 2 * 1024 * 1024 * 1024) {
      isUploadingRef.current = false;
      setErrorMsg("Max file size is 2GB.");
      setUploadState("error");
      toast.error("Max file size is 2GB.");
      return;
    }

    const uploadId = params.uploadId || crypto.randomUUID();
    const isResume = !!params.uploadId;

    let currentProgress = 0;

    try {
      // 1. Persist to localStorage immediately
      localStorage.setItem(
        "activeUpload",
        JSON.stringify({
          uploadId,
          fileName: file.name,
          fileSize: file.size,
          title: title.trim(),
          ownerId: currentUser?.id || "",
          ownerName: currentUser?.name || currentUser?.username || "",
        }),
      );

      // 2. Store file blob in IDB for cross-refresh resume
      if (!isResume) {
        await saveFileBlobToIDB(uploadId, file);
      }

      // 3. Thumbnail as dataUrl for persistence
      const thumbDataUrl = await blobToDataUrl(thumbnail);

      // 4. Save full session to IDB
      const startChunk = isResume
        ? Number(localStorage.getItem(`upload_progress_${uploadId}`) || 0)
        : 0;

      await saveSession({
        videoId: uploadId,
        title: title.trim(),
        ownerId: currentUser?.id || "",
        ownerName: currentUser?.name || currentUser?.username || "",
        uploadedBytes: startChunk * CHUNK_SIZE,
        lastChunkIndex: startChunk,
        status: "uploading",
        createdAt: Date.now(),
        thumbnailDataUrl: thumbDataUrl,
        fileName: file.name,
        fileSize: file.size,
      });

      // 5. Add/update temp card in feed
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      const resumePct = Math.round((startChunk / totalChunks) * 95);

      if (isResume) {
        updateVideoRef.current(uploadId, {
          progress: resumePct,
          status: "uploading",
          uploading: true,
          thumbnailUrl: thumbDataUrl,
        });
      } else {
        addVideoRef.current({
          id: uploadId,
          title: title.trim(),
          creator: currentUser?.name || currentUser?.username || "",
          username: currentUser?.username || "",
          ownerId: currentUser?.id || "",
          views: 0,
          description: description.trim(),
          date: new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          }),
          thumbnailUrl: thumbDataUrl,
          videoUrl: "",
          duration: "",
          status: "uploading",
          uploading: true,
          progress: 0,
        });
      }

      setUploadState("uploading");
      setProgress(resumePct);
      setStatusText(`Uploading ${resumePct}%`);
      currentProgress = resumePct;

      // 6. Actual upload via ExternalBlob (putFileBlob streams chunks — no full memory load)
      const currentActor = actorRef.current;
      if (!currentActor) {
        throw new Error("Upload service not ready. Please try again.");
      }

      const thumbBytes = await thumbnail
        .arrayBuffer()
        .then((b) => new Uint8Array(b));
      const thumbBlob = ExternalBlob.fromBytes(thumbBytes);

      // fromBlob keeps _rawBlob; config.ts routes to putFileBlob (slice-based, memory-safe)
      const videoBlob = ExternalBlob.fromBlob(file);
      videoBlob.withUploadProgress((pct) => {
        // pct is 0-100 from the real chunk upload; reserve 99% for processing
        const combined = Math.round(Math.min(pct, 98));
        const safeProgress = Math.max(combined, currentProgress);
        if (safeProgress >= 99) return;
        currentProgress = safeProgress;
        setProgress(safeProgress);
        setStatusText(`Uploading ${safeProgress}%`);
        updateVideoRef.current(uploadId, { progress: safeProgress });
      });

      let backendId: string | null = null;
      let lastError: Error | null = null;

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          if (attempt > 0) await sleep(500 * attempt);
          backendId = await (currentActor as any).uploadVideo(
            title.trim(),
            description.trim(),
            thumbBlob,
            videoBlob,
            currentUser?.username || "",
            hlsUrl || null,
          );
          lastError = null;
          break;
        } catch (e) {
          lastError = e instanceof Error ? e : new Error(String(e));
          console.warn(
            `Upload attempt ${attempt + 1}/3 failed:`,
            lastError.message,
          );
        }
      }

      if (!backendId || lastError) {
        throw lastError || new Error("Upload failed after 3 attempts");
      }

      // 8. Poll until READY
      setProgress(99);
      setStatusText("Processing...");
      setUploadState("processing");
      updateVideoRef.current(uploadId, {
        progress: 99,
        status: "uploading",
        uploading: true,
      });

      const FINALIZE_TIMEOUT = 30_000;
      const POLL_INTERVAL = 2_000;
      const pollStart = Date.now();
      let realVideo: BackendVideo | null = null;

      while (Date.now() - pollStart < FINALIZE_TIMEOUT) {
        await sleep(POLL_INTERVAL);
        try {
          const v = await currentActor.getVideo(backendId);
          if (v) {
            realVideo = v;
            break;
          }
        } catch {
          /* keep polling */
        }
      }

      if (!realVideo) {
        for (let i = 0; i < 2; i++) {
          await sleep(5_000);
          try {
            const v = await currentActor.getVideo(backendId);
            if (v) {
              realVideo = v;
              break;
            }
          } catch {
            /* keep trying */
          }
        }
      }

      if (!realVideo) {
        setErrorMsg("Upload timed out. Please try again.");
        setUploadState("error");
        removeVideoRef.current(uploadId);
        await deleteSession(uploadId).catch(() => {});
        clearUploadLocalStorage(uploadId);
        await deleteFileBlobFromIDB(uploadId).catch(() => {});
        toast.error("Upload timed out. Your video may still be processing.");
        return;
      }

      // 9. Success
      updateVideoRef.current(uploadId, {
        id: backendId,
        title: realVideo.title,
        videoUrl: realVideo.video.getDirectURL(),
        thumbnailUrl: realVideo.thumbnail.getDirectURL(),
        hlsUrl: (realVideo as any).hlsUrl ?? undefined,
        status: "READY",
        uploading: false,
        progress: 100,
        creator:
          currentUser?.name || currentUser?.username || realVideo.ownerName,
        username: currentUser?.username || realVideo.ownerName,
      });

      setProgress(100);
      setUploadState("done");
      setStatusText("Ready to watch");
      toast.success("Video uploaded successfully!");

      // 10. Cleanup
      await deleteSession(uploadId).catch(() => {});
      await deleteFileBlobFromIDB(uploadId).catch(() => {});
      clearUploadLocalStorage(uploadId);

      setTimeout(() => {
        setUploadState("idle");
        setProgress(0);
        setStatusText("");
        setErrorMsg("");
      }, 2_000);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Upload failed. Please try again.";
      setErrorMsg(msg);
      setUploadState("error");
      removeVideoRef.current(uploadId);
      toast.error(msg);
      // Keep localStorage + IDB so resume is possible on next visit
    } finally {
      isUploadingRef.current = false;
    }
  }, []);

  // Keep ref in sync so restore effect can call latest doUpload
  doUploadRef.current = doUpload;

  // Restore incomplete sessions on app load (runs once)
  useEffect(() => {
    const restore = async () => {
      try {
        const savedRaw = localStorage.getItem("activeUpload");
        if (savedRaw) {
          const saved = JSON.parse(savedRaw) as {
            uploadId: string;
            fileName: string;
            fileSize: number;
            title: string;
            ownerId: string;
            ownerName: string;
          };

          const { uploadId, fileSize, title, ownerId, ownerName } = saved;
          const savedChunk = Number(
            localStorage.getItem(`upload_progress_${uploadId}`) || 0,
          );
          const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);
          const pct = Math.round((savedChunk / totalChunks) * 95);

          const session = await getSession(uploadId).catch(() => null);
          const thumbDataUrl = session?.thumbnailDataUrl || "";

          addVideoRef.current({
            id: uploadId,
            title,
            creator: ownerName,
            username: ownerId,
            ownerId,
            views: 0,
            description: "",
            date: new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            }),
            thumbnailUrl: thumbDataUrl,
            videoUrl: "",
            duration: "",
            status: "uploading",
            uploading: true,
            progress: pct,
          });

          setProgress(pct);
          setStatusText(`Uploading ${pct}%`);
          setUploadState("uploading");

          const savedFile = await getFileBlobFromIDB(uploadId).catch(
            () => null,
          );
          if (savedFile && !isUploadingRef.current) {
            const thumbFile = thumbDataUrl
              ? dataUrlToFile(thumbDataUrl, "thumbnail.jpg")
              : new File([], "thumbnail.jpg", { type: "image/jpeg" });
            doUploadRef.current({
              file: savedFile,
              title: session?.title || title,
              description: "",
              thumbnail: thumbFile,
              uploadId,
            });
          }
          return;
        }

        // Fallback: IDB sessions (legacy path)
        const sessions = await getAllSessions();
        for (const session of sessions) {
          if (session.status === "tombstone") continue;
          const thumbDataUrl = session.thumbnailDataUrl || "";
          addVideoRef.current({
            id: session.videoId,
            title: session.title,
            creator: session.ownerName || session.ownerId,
            username: session.ownerId,
            ownerId: session.ownerId,
            views: 0,
            description: "",
            date: new Date(session.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            }),
            thumbnailUrl: thumbDataUrl,
            videoUrl: "",
            duration: "",
            status: "uploading",
            uploading: true,
            progress: session.uploadedBytes > 0 ? 50 : 5,
          });

          const savedFile = await getFileBlobFromIDB(session.videoId).catch(
            () => null,
          );
          if (savedFile && !isUploadingRef.current) {
            const thumbFile = thumbDataUrl
              ? dataUrlToFile(thumbDataUrl, "thumbnail.jpg")
              : new File([], "thumbnail.jpg", { type: "image/jpeg" });
            doUploadRef.current({
              file: savedFile,
              title: session.title,
              description: "",
              thumbnail: thumbFile,
              uploadId: session.videoId,
            });
          }
        }
      } catch (err) {
        console.warn("Failed to restore upload sessions:", err);
      }
    };
    restore();
  }, []);

  const startUpload = useCallback(
    (params: UploadParams) => {
      doUpload(params);
    },
    [doUpload],
  );

  const reset = useCallback(() => {
    if (isUploadingRef.current) return;
    setUploadState("idle");
    setProgress(0);
    setStatusText("");
    setErrorMsg("");
  }, []);

  const ctxValue: UploadEngineContextValue = {
    uploadState,
    progress,
    statusText,
    errorMsg,
    startUpload,
    reset,
  };

  return React.createElement(
    UploadEngineContext.Provider,
    { value: ctxValue },
    children,
  );
}

export function useUploadEngine(): UploadEngineContextValue {
  const ctx = useContext(UploadEngineContext);
  if (!ctx)
    throw new Error("useUploadEngine must be used within UploadEngineProvider");
  return ctx;
}
