// Minimal ambient type declaration for hls.js used in WatchPage
declare module "hls.js" {
  interface HlsConfig {
    enableWorker?: boolean;
    lowLatencyMode?: boolean;
  }

  interface Level {
    height: number;
    width?: number;
    bitrate?: number;
  }

  interface LevelSwitchedData {
    level: number;
  }

  const Events: {
    MANIFEST_PARSED: string;
    LEVEL_SWITCHING: string;
    LEVEL_SWITCHED: string;
    [key: string]: string;
  };

  class Hls {
    static isSupported(): boolean;
    static Events: typeof Events;
    levels: Level[];
    currentLevel: number;
    constructor(config?: HlsConfig);
    loadSource(url: string): void;
    attachMedia(el: HTMLMediaElement): void;
    on(
      event: string,
      callback: (event: string, data: LevelSwitchedData) => void,
    ): void;
    destroy(): void;
  }

  export default Hls;
}
