import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { nanoid } from "nanoid";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const CONVERSATION_ID_PREFIX = 'conv_';
export const CONVERSATION_ID_LENGTH = 21;
export function generateConversationId(): string {
  return CONVERSATION_ID_PREFIX + nanoid(CONVERSATION_ID_LENGTH);
}