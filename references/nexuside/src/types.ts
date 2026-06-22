export interface FileItem {
  name: string;
  path: string;
  content: string;
  icon: string;
  isFolder?: boolean;
  children?: string[]; // Keys of children in the file system map
}

export interface FileSystemMap {
  [path: string]: FileItem;
}

export interface ChatMessage {
  id: string;
  role: "user" | "model" | "system";
  text: string;
  timestamp?: string;
  toolLogs?: {
    action: string;
    status: "success" | "error" | "pending";
    detail?: string;
  }[];
}

export interface BuildStep {
  id: string;
  name: string;
  status: "success" | "error" | "pending" | "running";
  time?: string;
  duration?: string;
  children?: BuildStep[];
}
