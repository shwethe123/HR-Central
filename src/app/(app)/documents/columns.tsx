
// src/app/(app)/documents/columns.tsx
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { DocumentMetadata } from "@/types";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Download, FileArchive, FileQuestion, FileText, ImageIcon as LucideImageIcon, Presentation as LucidePresentation, Sheet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import Image from 'next/image';

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIconForTable = (fileType: string, downloadURL: string, fileName: string) => {
  const commonIconClass = "h-6 w-6"; // Slightly smaller for table rows
  if (fileType.startsWith('image/')) {
    return (
      <div className="w-10 h-10 relative rounded overflow-hidden bg-muted flex items-center justify-center">
        <Image
            src={downloadURL}
            alt={fileName}
            fill
            sizes="40px"
            className="object-contain"
            data-ai-hint="document thumbnail"
            onError={(e) => {
                // In case of error, hide image and show fallback icon (handled by showing generic icon)
                const parent = e.currentTarget.parentElement;
                if (parent) {
                    const fallback = parent.querySelector('[data-fallback-icon="true"]');
                    if(fallback) (fallback as HTMLElement).style.display = 'flex';
                    e.currentTarget.style.display = 'none';
                }
            }}
        />
        <LucideImageIcon className={`${commonIconClass} text-muted-foreground absolute hidden`} data-fallback-icon="true"/>
      </div>
    );
  }
  if (fileType === 'application/pdf') return <FileText className={`${commonIconClass} text-red-500`} />;
  if (fileType.includes('wordprocessingml') || fileType === 'application/msword') return <FileText className={`${commonIconClass} text-blue-700`} />;
  if (fileType.includes('spreadsheetml') || fileType === 'application/vnd.ms-excel') return <Sheet className={`${commonIconClass} text-green-600`} />;
  if (fileType.includes('presentationml') || fileType === 'application/vnd.ms-powerpoint') return <LucidePresentation className={`${commonIconClass} text-orange-500`} />;
  if (fileType === 'application/zip' || fileType === 'application/x-zip-compressed') return <FileArchive className={`${commonIconClass} text-yellow-500`} />;
  if (fileType === 'text/plain' || fileType === 'text/csv') return <FileText className={`${commonIconClass} text-gray-600`} />;
  return <FileQuestion className={`${commonIconClass} text-gray-500`} />;
};

export const getDocumentColumns = (): ColumnDef<DocumentMetadata>[] => [
  {
    id: "icon",
    header: "",
    cell: ({ row }) => {
      const doc = row.original;
      return getFileIconForTable(doc.fileType, doc.downloadURL, doc.fileName);
    },
    enableSorting: false,
    enableHiding: false,
    size: 60, // Fixed size for icon column
  },
  {
    accessorKey: "fileName",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        File Name <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div className="font-medium truncate max-w-xs" title={row.original.fileName}>{row.original.fileName}</div>,
  },
  {
    accessorKey: "category",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Category <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <Badge variant="outline" className="capitalize">{row.original.category}</Badge>,
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: "fileSize",
    header: "Size",
    cell: ({ row }) => formatFileSize(row.original.fileSize),
  },
  {
    accessorKey: "uploadedAt",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Uploaded Date <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const timestamp = row.original.uploadedAt;
      if (timestamp instanceof Timestamp) {
        return format(timestamp.toDate(), "MMM d, yyyy HH:mm");
      }
      return 'N/A';
    },
  },
  {
    accessorKey: "uploadedByName",
    header: "Uploaded By",
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const doc = row.original;
      return (
        <Button variant="outline" size="sm" asChild>
          <a href={doc.downloadURL} target="_blank" rel="noopener noreferrer" download={doc.fileName}>
            <Download className="mr-2 h-4 w-4" /> Download
          </a>
        </Button>
      );
    },
  },
];
