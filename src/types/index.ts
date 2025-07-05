// 系统核心类型定义

export interface ProxyConfig {
  siteId: string;
  subdomain: string;
  targetUrl: string;
  description?: string;
}

export interface TunnelConnection {
  id: string;
  siteId: string;
  websocket: WebSocket;
  lastHeartbeat: number;
  isActive: boolean;
}

export interface ProxyRequest {
  id: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  timestamp: number;
}

export interface ProxyResponse {
  id: string;
  status: number;
  headers: Record<string, string>;
  body?: string;
  timestamp: number;
}

export interface HeartbeatMessage {
  type: 'heartbeat';
  timestamp: number;
  siteId: string;
}

export interface RequestMessage {
  type: 'request';
  data: ProxyRequest;
}

export interface ResponseMessage {
  type: 'response';
  data: ProxyResponse;
}

export interface RegisterMessage {
  type: 'register';
  siteId: string;
  targetUrl: string;
}

export interface ErrorMessage {
  type: 'error';
  message: string;
  code?: string;
}

export type WebSocketMessage = 
  | HeartbeatMessage 
  | RequestMessage 
  | ResponseMessage 
  | RegisterMessage 
  | ErrorMessage;

export interface ConnectionManager {
  connections: Map<string, TunnelConnection>;
  addConnection(siteId: string, websocket: WebSocket): void;
  removeConnection(siteId: string): void;
  getConnection(siteId: string): TunnelConnection | undefined;
  sendRequest(siteId: string, request: ProxyRequest): Promise<ProxyResponse>;
}
