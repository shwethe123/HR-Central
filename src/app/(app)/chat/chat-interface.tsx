
// src/app/(app)/chat/chat-interface.tsx
'use client';

import React, { useState, useEffect, useRef, useActionState, useCallback } from 'react';
import { useFormStatus } from 'react-dom';
import type { User } from 'firebase/auth';
import { db, storage } from '@/lib/firebase'; // Added storage
import { collection, query, where, orderBy, onSnapshot, Timestamp, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage'; // Added Firebase Storage functions
import type { ChatMessage } from '@/types';
import { sendMessage, type SendMessageFormState } from './actions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, isValid } from 'date-fns';
import { Send, Loader2, MessageSquare, AlertTriangle, Check, CheckCheck, PanelRightClose, PanelLeftClose, BellRing, BellOff, Paperclip, Image as ImageIcon, X } from 'lucide-react'; // Added Paperclip, ImageIcon, X
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input'; // Added Input for file
import NextImage from 'next/image'; // Renamed to avoid conflict with Lucide's Image
import { Progress } from '@/components/ui/progress'; // Added Progress

interface ChatInterfaceProps {
  conversationId: string | null;
  chatTargetName: string | null;
  currentUser: User | null;
  isGeneralChat?: boolean;
  effectiveChatTitle?: string;
  isChatListCollapsed?: boolean;
  onToggleChatList?: () => void;
}

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} size="icon">
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      <span className="sr-only">Send Message</span>
    </Button>
  );
}

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_FILE_TYPES = [
    ...ALLOWED_IMAGE_TYPES,
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip'
];


export default function ChatInterface({
  conversationId,
  chatTargetName,
  currentUser,
  isGeneralChat = false,
  effectiveChatTitle: propEffectiveChatTitle,
  isChatListCollapsed,
  onToggleChatList,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for file input
  const { toast } = useToast();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);


  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'default'>('default');
  const notifiedMessageIdsRef = useRef<Set<string>>(new Set());


  const initialState: SendMessageFormState = { message: null, errors: {}, success: false };
  const [state, formAction] = useActionState(sendMessage, initialState);

  const [localEffectiveChatTitle, setLocalEffectiveChatTitle] = useState("Chat");

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const showNotification = useCallback((title: string, body: string, icon?: string) => {
    if (notificationPermission === 'granted') {
      const options: NotificationOptions = { body };
      if (icon) options.icon = icon;
      try {
        new Notification(title, options);
      } catch (err) {
        console.error("Error showing notification:", err);
        if ((err as Error).name === 'TypeError' && (err as Error).message.includes('Notification constructor')) {
            console.warn("Notification constructor failed. Ensure site is HTTPS and service worker (if used) is correct.");
        }
      }
    }
  }, [notificationPermission]); 

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast({ title: "Browser Notifications Not Supported", description: "Your browser does not support desktop notifications.", variant: "destructive" });
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === 'granted') {
      toast({ title: "Notifications Enabled", description: "You will now receive notifications for new messages." });
      showNotification("Notifications Enabled!", "You'll be notified of new messages when this tab isn't active.");
    } else if (permission === 'denied') {
      toast({ title: "Notifications Denied", description: "You have blocked notifications. Please enable them in your browser settings if you change your mind.", variant: "destructive" });
    } else {
      toast({ title: "Notifications Dismissed", description: "You can enable notifications later by clicking the bell icon.", variant: "default" });
    }
  };

  const clearOldNotifiedMessageIds = useCallback(() => {
    const MAX_KEPT_IDS = 50;
    if (notifiedMessageIdsRef.current.size > MAX_KEPT_IDS) {
      const oldestIds = Array.from(notifiedMessageIdsRef.current).slice(0, notifiedMessageIdsRef.current.size - MAX_KEPT_IDS);
      oldestIds.forEach(id => notifiedMessageIdsRef.current.delete(id));
    }
  }, []);


  useEffect(() => {
    if (propEffectiveChatTitle) {
        setLocalEffectiveChatTitle(propEffectiveChatTitle);
    } else if (isGeneralChat) {
      setLocalEffectiveChatTitle("Company General Chat");
    } else if (chatTargetName) {
      setLocalEffectiveChatTitle(`Chat with ${decodeURIComponent(chatTargetName)}`);
    } else if (!conversationId) {
      setLocalEffectiveChatTitle("Select a conversation");
    }
     else {
      setLocalEffectiveChatTitle("Chat");
    }
  }, [conversationId, chatTargetName, isGeneralChat, propEffectiveChatTitle]);

  useEffect(() => {
    if (!conversationId || !currentUser) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'chatMessages'),
      where('conversationId', '==', conversationId),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedMessages: ChatMessage[] = [];
      const updates: Promise<void>[] = [];
      let newUnreadMessagesForNotification: ChatMessage[] = [];

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const message: ChatMessage = {
          id: docSnap.id,
          conversationId: data.conversationId,
          senderId: data.senderId,
          senderName: data.senderName,
          senderPhotoURL: data.senderPhotoURL || null,
          text: data.text,
          createdAt: data.createdAt,
          readAt: data.readAt || null,
          messageType: data.messageType || 'text', // Default to text for older messages
          fileURL: data.fileURL,
          fileName: data.fileName,
          fileType: data.fileType,
          fileSize: data.fileSize,
        };
        fetchedMessages.push(message);

        if (message.senderId !== currentUser.uid && !message.readAt) {
          const messageRef = doc(db, 'chatMessages', docSnap.id);
          updates.push(
            updateDoc(messageRef, { readAt: serverTimestamp() })
              .catch(err => {
                console.error(`[ChatInterface] Failed to mark message ${docSnap.id} as read:`, err.code, err.message);
              })
          );

          if (!notifiedMessageIdsRef.current.has(message.id)) {
            newUnreadMessagesForNotification.push(message);
          }
        }
      });

      setMessages(fetchedMessages);

      if (newUnreadMessagesForNotification.length > 0 && notificationPermission === 'granted' && document.hidden) {
        newUnreadMessagesForNotification.forEach(msg => {
          if (!notifiedMessageIdsRef.current.has(msg.id) && msg.text) {
            const title = `New message from ${msg.senderName}`;
            const body = msg.text.length > 100 ? msg.text.substring(0, 97) + "..." : msg.text;
            showNotification(title, body, msg.senderPhotoURL || undefined);
            notifiedMessageIdsRef.current.add(msg.id);
          } else if (!notifiedMessageIdsRef.current.has(msg.id) && msg.messageType !== 'text' && msg.fileName) {
             const title = `New ${msg.messageType} from ${msg.senderName}`;
             const body = msg.fileName;
             showNotification(title, body, msg.senderPhotoURL || undefined);
             notifiedMessageIdsRef.current.add(msg.id);
          }
        });
        clearOldNotifiedMessageIds();
      }


      if (updates.length > 0) {
        Promise.all(updates)
          .catch(error => {
            console.error("[ChatInterface] Error in batch processing message read status updates:", error);
          });
      }
    }, (error) => {
      console.error("[ChatInterface] Error fetching messages: ", error.code, error.message);
       if (error.code === 'permission-denied') {
        console.error("[ChatInterface] Firestore permission denied while fetching messages. Check security rules for read access to 'chatMessages'.");
      } else if (error.code === 'failed-precondition') {
        console.error("[ChatInterface] Firestore query for messages failed. This often means a required index is missing:", error.message);
      }
    });

    return () => unsubscribe();
  }, [conversationId, currentUser, notificationPermission, showNotification, clearOldNotifiedMessageIds]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if(scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  }, [messages.length]);

  useEffect(() => {
    if (state?.success) {
      setNewMessage('');
      setSelectedFile(null);
      setFilePreview(null);
      setUploadProgress(null);
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      formRef.current?.reset(); // Reset the form which includes hidden fields
    }
    if (state?.errors?._form) {
      console.error("Form error from sendMessage action:", state.errors._form.join(', '));
      toast({ title: "Message Not Sent", description: state.errors._form.join(', ') || "An error occurred.", variant: "destructive"});
      setIsUploading(false);
      setUploadProgress(null);
    } else if (state?.errors && Object.keys(state.errors).length > 0 && !state.success){
        const firstErrorField = Object.keys(state.errors)[0] as keyof typeof state.errors;
        const errorMessage = state.errors[firstErrorField]?.[0];
        toast({ title: "Validation Error", description: errorMessage || "Please check your input.", variant: "destructive"});
        setIsUploading(false);
        setUploadProgress(null);
    }
  }, [state, toast]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({ title: "File Too Large", description: `File size cannot exceed ${MAX_FILE_SIZE_MB}MB.`, variant: "destructive" });
        return;
      }
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        toast({ title: "Invalid File Type", description: `Only specific image and document types are allowed. You provided: ${file.type}`, variant: "destructive" });
        return;
      }
      setSelectedFile(file);
      if (ALLOWED_IMAGE_TYPES.includes(file.type)) {
        const reader = new FileReader();
        reader.onloadend = () => setFilePreview(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null); // No preview for non-image files
      }
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // Prevent default form submission

    if (!currentUser || !currentUser.uid || !conversationId) {
      toast({ title: "Error", description: "User or conversation not identified.", variant: "destructive" });
      return;
    }

    const formData = new FormData(formRef.current!); // Use current form values

    if (selectedFile) {
      setIsUploading(true);
      setUploadProgress(0);

      const filePath = `chat_attachments/${conversationId}/${currentUser.uid}_${Date.now()}_${selectedFile.name}`;
      const fileStorageRef = storageRef(storage, filePath);
      const uploadTask = uploadBytesResumable(fileStorageRef, selectedFile);

      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error("Upload Error:", error);
          toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
          setIsUploading(false);
          setUploadProgress(null);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          formData.set('fileURL', downloadURL);
          formData.set('fileName', selectedFile.name);
          formData.set('fileType', selectedFile.type);
          formData.set('fileSize', String(selectedFile.size));
          formData.set('messageType', ALLOWED_IMAGE_TYPES.includes(selectedFile.type) ? 'image' : 'file');
          // Text can be caption for file/image
          if (!newMessage.trim()) formData.delete('text');
          else formData.set('text', newMessage);

          formAction(formData); // Call the server action
        }
      );
    } else {
      if (!newMessage.trim()) {
        toast({ title: "Empty Message", description: "Cannot send an empty message.", variant: "default" });
        return;
      }
      formData.set('text', newMessage);
      formData.set('messageType', 'text');
      formAction(formData); // Call the server action
    }
  };


  if (!currentUser) {
     return (
      <Card className="w-full h-full flex flex-col items-center justify-center shadow-xl rounded-lg border-0">
        <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Please log in to use chat.</p>
      </Card>
    );
  }

  if (!conversationId) {
    return (
      <Card className="w-full h-full flex flex-col items-center justify-center shadow-xl rounded-lg border-0">
        {isChatListCollapsed && onToggleChatList && (
           <div className="absolute top-4 left-4">
             <Button variant="ghost" size="icon" onClick={onToggleChatList}>
                {isChatListCollapsed ? <PanelRightClose className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
             </Button>
           </div>
        )}
        <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Select a user or conversation to start chatting.</p>
      </Card>
    );
  }

  const getFormattedTimestamp = (timestamp: Timestamp | undefined | null): string => {
    if (timestamp && typeof timestamp.toDate === 'function') {
      const date = timestamp.toDate();
      if (isValid(date)) {
        return format(date, 'p');
      }
    }
    return 'Sending...';
  };


  return (
    <TooltipProvider delayDuration={100}>
      <Card className="w-full h-full flex flex-col shadow-xl rounded-lg border-0">
        <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center">
                {isChatListCollapsed && onToggleChatList && (
                    <Button variant="ghost" size="icon" onClick={onToggleChatList} className="mr-2 md:inline-flex">
                        <PanelRightClose className="h-5 w-5" />
                        <span className="sr-only">Show Chat List</span>
                    </Button>
                )}
                <CardTitle>{localEffectiveChatTitle}</CardTitle>
            </div>
             {typeof window !== 'undefined' && 'Notification' in window && conversationId && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={requestNotificationPermission}
                            className={notificationPermission === 'granted' ? "text-green-500 hover:text-green-600" : notificationPermission === 'denied' ? "text-red-500 hover:text-red-600" : ""}
                        >
                            {notificationPermission === 'granted' ? <BellRing className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
                            <span className="sr-only">
                                {notificationPermission === 'granted' ? "Notifications Enabled" :
                                 notificationPermission === 'denied' ? "Notifications Denied" :
                                 "Enable Notifications"}
                            </span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>
                            {notificationPermission === 'granted' ? "Desktop notifications are ON" :
                             notificationPermission === 'denied' ? "Notifications are blocked by you" :
                             "Click to enable desktop notifications"}
                        </p>
                    </TooltipContent>
                </Tooltip>
            )}
        </CardHeader>
        <CardContent className="flex-grow overflow-hidden p-0">
          <ScrollArea ref={scrollAreaRef} className="h-full p-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <MessageSquare className="h-12 w-12 mb-2" />
                <p>No messages yet.</p>
                <p className="text-sm">Be the first to send a message!</p>
              </div>
            )}
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 ${
                    msg.senderId === currentUser?.uid ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {msg.senderId !== currentUser?.uid && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={msg.senderPhotoURL || undefined} alt={msg.senderName} data-ai-hint="person avatar"/>
                          <AvatarFallback>{msg.senderName?.substring(0, 1).toUpperCase() || 'U'}</AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{msg.senderName || 'Unknown User'}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  <div
                    className={`max-w-[70%] rounded-lg px-3 py-2 text-sm shadow-md ${
                      msg.senderId === currentUser?.uid
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card text-card-foreground border'
                    }`}
                  >
                    {msg.senderId !== currentUser?.uid && (
                       <p className="text-xs font-semibold mb-0.5 text-primary">{msg.senderName || 'Anonymous'}</p>
                    )}
                    {msg.messageType === 'image' && msg.fileURL && (
                      <div className="my-1.5 max-w-xs max-h-64 overflow-hidden rounded-md cursor-pointer" onClick={() => window.open(msg.fileURL, '_blank')}>
                        <NextImage src={msg.fileURL} alt={msg.fileName || 'Sent image'} width={200} height={200} className="object-contain rounded" data-ai-hint="chat image" />
                      </div>
                    )}
                    {msg.messageType === 'file' && msg.fileURL && msg.fileName && (
                      <a href={msg.fileURL} target="_blank" rel="noopener noreferrer" className="block my-1.5 p-2.5 rounded-md bg-muted hover:bg-muted/80 transition-colors">
                        <div className="flex items-center gap-2">
                          <Paperclip className="h-5 w-5 text-primary" />
                          <div className="flex-grow overflow-hidden">
                            <p className="font-medium truncate text-foreground">{msg.fileName}</p>
                            <p className="text-xs text-muted-foreground">{msg.fileSize ? (msg.fileSize / 1024).toFixed(1) + ' KB' : ''}</p>
                          </div>
                        </div>
                      </a>
                    )}
                    {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
                    <div className={`text-xs mt-1 flex items-center gap-1 ${msg.senderId === currentUser?.uid ? 'text-primary-foreground/70 justify-end' : 'text-muted-foreground/80 justify-start'}`}>
                      <span>{getFormattedTimestamp(msg.createdAt)}</span>
                      {msg.senderId === currentUser?.uid && (
                        <>
                          {msg.readAt ? (
                            <Tooltip>
                              <TooltipTrigger>
                                <CheckCheck className="h-3.5 w-3.5 text-blue-400" />
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="text-xs p-1">
                                <p>Seen at {getFormattedTimestamp(msg.readAt)}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <Tooltip>
                                <TooltipTrigger>
                                    <Check className="h-3.5 w-3.5" />
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="text-xs p-1">
                                    <p>Delivered</p>
                                </TooltipContent>
                            </Tooltip>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                   {msg.senderId === currentUser?.uid && currentUser && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={currentUser.photoURL || undefined} alt={currentUser.displayName || 'Me'} data-ai-hint="person avatar"/>
                          <AvatarFallback>{currentUser.displayName?.substring(0, 1).toUpperCase() || 'M'}</AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{currentUser.displayName || 'You'}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
        <CardFooter className="p-4 border-t">
          <form
            ref={formRef}
            action={formAction}
            onSubmit={handleFormSubmit}
            className="flex flex-col w-full gap-2"
          >
             {/* Hidden fields common to all message types */}
            <input type="hidden" name="conversationId" value={conversationId || ''} />
            <input type="hidden" name="senderId" value={currentUser.uid} />
            <input type="hidden" name="senderName" value={currentUser.displayName || 'Anonymous User'} />
            <input type="hidden" name="senderPhotoURL" value={currentUser.photoURL || ''} />
            {/* The messageType field will be dynamically set by handleFormSubmit if a file is attached,
                otherwise, it should default to 'text' if only text is present.
                For pure text messages, it's now set in handleFormSubmit before calling formAction. */}

            {/* File Preview & Upload Progress */}
            {selectedFile && (
              <div className="p-2 border rounded-md bg-muted/50 relative">
                <div className="flex items-center gap-2">
                  {filePreview ? (
                    <NextImage src={filePreview} alt="Preview" width={40} height={40} className="rounded object-cover" data-ai-hint="upload preview"/>
                  ) : (
                    <Paperclip className="h-8 w-8 text-muted-foreground" />
                  )}
                  <div className="flex-grow overflow-hidden">
                    <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(1)} KB - {selectedFile.type}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={removeSelectedFile} className="h-7 w-7">
                    <X className="h-4 w-4" />
                    <span className="sr-only">Remove file</span>
                  </Button>
                </div>
                {isUploading && uploadProgress !== null && (
                  <Progress value={uploadProgress} className="w-full h-1.5 mt-2" />
                )}
              </div>
            )}
            
            {/* Message Input and Send Button */}
            <div className="flex w-full items-center gap-2">
              <Textarea
                name="text"
                placeholder={selectedFile ? "Add a caption... (optional)" : "Type your message..."}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                rows={1}
                className="flex-grow resize-none min-h-[40px]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if ((newMessage.trim() || selectedFile) && currentUser && currentUser.uid) {
                      formRef.current?.requestSubmit(); // Programmatically submit the form
                    }
                  }
                }}
              />
              <Input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                id="chat-file-input"
                accept={ALLOWED_FILE_TYPES.join(',')}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                    <Paperclip className="h-4 w-4" />
                    <span className="sr-only">Attach file</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Attach Image or File (Max {MAX_FILE_SIZE_MB}MB)</p></TooltipContent>
              </Tooltip>
              <SubmitButton disabled={isUploading || (!newMessage.trim() && !selectedFile)} />
            </div>
             <input type="hidden" name="messageType" value={selectedFile ? (ALLOWED_IMAGE_TYPES.includes(selectedFile.type) ? 'image' : 'file') : 'text'} />
          </form>
        </CardFooter>
      </Card>
    </TooltipProvider>
  );
}

    