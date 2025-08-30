declare module 'bonjour' {
  interface BonjourService {
    name: string;
    type: string;
    port: number;
    host?: string;
    addresses?: string[];
    txt?: Record<string, any>;
  }

  interface BonjourBrowser {
    on(event: 'up' | 'down', listener: (service: BonjourService) => void): this;
    stop(): void;
  }

  interface BonjourAdvertisement {
    stop(): void;
  }

  interface Bonjour {
    publish(options: {
      name: string;
      type: string;
      port: number;
      host?: string;
      txt?: Record<string, any>;
    }): BonjourAdvertisement;

    find(options: { type: string }): BonjourBrowser;
    findOne(options: { type: string }, callback: (service: BonjourService) => void): void;
    destroy(): void;
  }

  function bonjour(): Bonjour;
  export = bonjour;
}
