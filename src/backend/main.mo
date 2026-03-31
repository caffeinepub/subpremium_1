import Time "mo:core/Time";
import Array "mo:core/Array";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Iter "mo:core/Iter";

import Runtime "mo:core/Runtime";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";


actor {
  include MixinStorage();
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // Legacy Video type — structurally identical to the original Video type (no hlsUrl).
  // Keeping the same structure preserves stable-variable compatibility for `videos`.
  type VideoV1 = {
    id : Text;
    owner : Principal;
    ownerName : Text;
    title : Text;
    description : Text;
    thumbnail : Storage.ExternalBlob;
    video : Storage.ExternalBlob;
    createdAt : Int;
  };

  // Current Video type — adds the hlsUrl field.
  type Video = {
    id : Text;
    owner : Principal;
    ownerName : Text;
    title : Text;
    description : Text;
    thumbnail : Storage.ExternalBlob;
    video : Storage.ExternalBlob;
    hlsUrl : ?Text;
    createdAt : Int;
  };

  // URL-only video record — no blob storage required.
  type VideoUrlRecord = {
    id : Text;
    owner : Principal;
    ownerName : Text;
    title : Text;
    description : Text;
    thumbnailUrl : Text;
    videoUrl : Text;
    hlsUrl : ?Text;
    createdAt : Int;
  };

  public type UserProfile = {
    name : Text;
  };

  // `videos` retains its original VideoV1 type so the stable variable is compatible
  // with existing canister state.  No new entries are added here after the migration.
  let videos = Map.empty<Text, VideoV1>();

  // `videosV2` holds all Video records going forward (new uploads + migrated data).
  let videosV2 = Map.empty<Text, Video>();

  // `videoUrlRecords` holds URL-only video entries (no blob uploads needed).
  let videoUrlRecords = Map.empty<Text, VideoUrlRecord>();

  let userProfiles = Map.empty<Principal, UserProfile>();

  // After upgrade: copy every VideoV1 record from `videos` into `videosV2`,
  // setting hlsUrl = null.  The duplicate-check ensures subsequent upgrades
  // do not re-insert already-migrated records.
  system func postupgrade() {
    let legacy = videos.values().toArray();
    for (v in legacy.vals()) {
      switch (videosV2.get(v.id)) {
        case null {
          videosV2.add(v.id, {
            id = v.id;
            owner = v.owner;
            ownerName = v.ownerName;
            title = v.title;
            description = v.description;
            thumbnail = v.thumbnail;
            video = v.video;
            hlsUrl = null;
            createdAt = v.createdAt;
          });
        };
        case (?_) {};
      };
    };
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public shared ({ caller }) func uploadVideo(
    title : Text,
    description : Text,
    thumbnail : Storage.ExternalBlob,
    video : Storage.ExternalBlob,
    ownerName : Text,
    hlsUrl : ?Text
  ) : async Text {
    let id = caller.toText() # "." # Time.now().toText();
    let newVideo : Video = {
      id;
      owner = caller;
      ownerName;
      title;
      description;
      thumbnail;
      video;
      hlsUrl;
      createdAt = Time.now();
    };
    videosV2.add(id, newVideo);
    id;
  };

  // Add a video by URL only — no blob upload required.
  public shared ({ caller }) func addVideoUrl(
    title : Text,
    description : Text,
    thumbnailUrl : Text,
    videoUrl : Text,
    ownerName : Text,
    hlsUrl : ?Text
  ) : async Text {
    let id = caller.toText() # ".url." # Time.now().toText();
    videoUrlRecords.add(id, {
      id;
      owner = caller;
      ownerName;
      title;
      description;
      thumbnailUrl;
      videoUrl;
      hlsUrl;
      createdAt = Time.now();
    });
    id;
  };

  public query ({ caller }) func getVideo(id : Text) : async ?Video {
    videosV2.get(id);
  };

  public query ({ caller }) func getAllVideos() : async [Video] {
    videosV2.values().toArray();
  };

  public query func getAllVideoUrlRecords() : async [VideoUrlRecord] {
    videoUrlRecords.values().toArray();
  };
};
