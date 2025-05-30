
// src/lib/chatUtils.ts
'use server'; // Can be used in server components/actions if needed, but also fine for client

export function getOneToOneConversationId(uid1: string, uid2: string): string {
  if (!uid1 || !uid2) {
    console.error("Both UIDs must be provided to getOneToOneConversationId. UID1:", uid1, "UID2:", uid2);
    // Returning a fallback or throwing an error might be appropriate depending on strictness
    // For now, let's return a value that indicates an issue but doesn't crash the app immediately
    // if it's used in a non-critical path for UI generation.
    return `invalid_conversation_uids_${uid1}_${uid2}`; 
  }
  if (uid1 === uid2) {
    console.warn("Attempted to create a 1-on-1 conversation ID with the same user UID:", uid1);
    // This scenario should ideally be prevented before calling this function.
    // Returning a specific format to indicate self-chat if it needs to be handled.
    return `self_chat_${uid1}`;
  }
  return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
}
