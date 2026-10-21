export type SaveState = "saved" | "saving" | "offline";

export type ModalKind = "new-file" | "new-space" | "share" | "profile" | null;

export type RoomTab = "room" | "board";

export interface ToastMessage {
  id: number;
  message: string;
  tone: "info" | "error" | "success";
}
