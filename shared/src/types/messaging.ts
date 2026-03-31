export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  sender: { id: string; fullName: string; avatarUrl?: string };
  body: string;
  sentAt: string;
}

export interface MessageThread {
  id: string;
  directoryId: string;
  subject?: string;
  type: "DIRECT" | "BROADCAST";
  createdAt: string;
  messages: Message[];
  participants: { userId: string; user: { id: string; fullName: string; avatarUrl?: string } }[];
}
