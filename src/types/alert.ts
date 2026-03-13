export interface AlertConfig {
  id: string;
  serverId: string;
  enabled: boolean;
  channels: AlertChannel[];
  events: AlertEvent[];
}

export interface AlertChannel {
  type: AlertChannelType;
  enabled: boolean;
  config: Record<string, string>;
}

export type AlertChannelType = 
  | "discord"
  | "email"
  | "telegram"
  | "slack"
  | "pushbullet"
  | "pushover"
  | "ifttt"
  | "rocket.chat";

export interface AlertEvent {
  type: AlertEventType;
  enabled: boolean;
}

export type AlertEventType = 
  | "server_started"
  | "server_stopped"
  | "server_crashed"
  | "update_available"
  | "update_applied"
  | "low_disk_space"
  | "high_cpu"
  | "high_memory"
  | "player_threshold"
  | "query_failed";

export interface AlertHistoryItem {
  id: string;
  serverId: string;
  serverName: string;
  event: AlertEventType;
  channel: AlertChannelType;
  message: string;
  sentAt: string;
  success: boolean;
  error?: string;
}

export interface DiscordConfig {
  webhookUrl: string;
}

export interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  fromEmail: string;
  toEmail: string;
}

export interface TelegramConfig {
  botToken: string;
  chatId: string;
}

export interface SlackConfig {
  webhookUrl: string;
  channel?: string;
}

export interface PushbulletConfig {
  apiKey: string;
}

export interface PushoverConfig {
  apiKey: string;
  userKey: string;
  priority?: number;
}

export interface IFTTTConfig {
  webhookUrl: string;
  eventName: string;
}

export interface RocketChatConfig {
  webhookUrl: string;
  channel?: string;
}
