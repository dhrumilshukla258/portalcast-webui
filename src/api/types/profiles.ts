export type ConfigProfile = {
  id: number;
  name: string;
  description?: string;
  config: {
    hostname: string;
    port: string | number;
    contextPath: string;
    mac: string;
    deviceId1?: string;
    deviceId2?: string;
    serialNumber?: string;
    stbType: string;
    groups: string[];
    proxy: boolean;
    tokens: string[];
    playCensored: boolean;
    providerType?: 'stalker' | 'xtream';
    username?: string;
    password?: string;
  };
  isActive: boolean;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export interface CreateProfilePayload {
  name: string;
  description?: string;
  config: ConfigProfile['config'];
}
