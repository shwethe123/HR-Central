
// src/app/(app)/employees/ImagePreviewDialog.tsx
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose, // Keep if you want a visible close button, though overlay click and Escape also close
} from '@/components/ui/dialog';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface ImagePreviewDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  imageUrl: string | null | undefined;
  altText: string;
}

export function ImagePreviewDialog({
  isOpen,
  onOpenChange,
  imageUrl,
  altText,
}: ImagePreviewDialogProps) {
  if (!isOpen || !imageUrl) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[90vw] md:max-w-[70vw] lg:max-w-[50vw] xl:max-w-[40vw] p-2 rounded-lg shadow-2xl bg-background/90 backdrop-blur-sm">
        {/* Using sr-only for accessibility as the content is primarily visual */}
        <DialogHeader className="sr-only">
          <DialogTitle>Image Preview: {altText}</DialogTitle>
        </DialogHeader>
        <div className="relative aspect-square w-full h-auto max-h-[80vh] rounded-md overflow-hidden">
          <Image
            src={imageUrl}
            alt={altText}
            fill
            sizes="(max-width: 768px) 90vw, (max-width: 1200px) 70vw, 50vw"
            className="object-contain"
            data-ai-hint="employee avatar large"
            onError={(e) => {
              // In case the large image also fails to load, hide the img tag
              // The dialog might still show a broken image icon from the browser itself.
              // More robust error handling could replace with a placeholder or error message.
              e.currentTarget.style.display = 'none';
              console.error(`Error loading large preview image for ${altText}: ${imageUrl}`);
            }}
          />
        </div>
        {/* Explicit close button for better UX on all devices */}
        <DialogClose asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3 rounded-full h-7 w-7 bg-background/70 hover:bg-accent text-muted-foreground hover:text-foreground"
            aria-label="Close image preview"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
