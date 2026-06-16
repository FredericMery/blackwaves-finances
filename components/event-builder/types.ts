export type BlockType = "text" | "gallery";

export interface Block {
  id: string;
  type: BlockType;
  content: any;
}