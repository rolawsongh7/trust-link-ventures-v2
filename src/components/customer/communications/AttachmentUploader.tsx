import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Paperclip, 
  X, 
  FileText, 
  Image as ImageIcon, 
  File,
  Upload,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AttachmentFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  path: string;
}

interface AttachmentUploaderProps {
  attachments: AttachmentFile[];
  onAttachmentsChange: (attachments: AttachmentFile[]) => void;
  customerId: string;
  maxFiles?: number;
  maxSizeBytes?: number;
  disabled?: boolean;
}

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) {
    return <ImageIcon className="h-4 w-4 text-blue-500" />;
  }
  if (type === 'application/pdf') {
    return <FileText className="h-4 w-4 text-red-500" />;
  }
  if (type.includes('word') || type.includes('document')) {
    return <FileText className="h-4 w-4 text-blue-600" />;
  }
  if (type.includes('excel') || type.includes('spreadsheet')) {
    return <FileText className="h-4 w-4 text-green-600" />;
  }
  return <File className="h-4 w-4 text-muted-foreground" />;
};

export const AttachmentUploader: React.FC<AttachmentUploaderProps> = ({
  attachments,
  onAttachmentsChange,
  customerId,
  maxFiles = 5,
  maxSizeBytes = 10 * 1024 * 1024, // 10MB
  disabled = false
}) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadFile = async (file: File): Promise<AttachmentFile | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${customerId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('communication-attachments')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('communication-attachments')
        .getPublicUrl(data.path);

      return {
        id: data.path,
        name: file.name,
        size: file.size,
        type: file.type,
        url: urlData.publicUrl,
        path: data.path
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (disabled || uploading) return;

    // Check if we'd exceed the max files
    const remainingSlots = maxFiles - attachments.length;
    if (remainingSlots <= 0) {
      toast({
        title: "Maximum files reached",
        description: `You can only attach up to ${maxFiles} files.`,
        variant: "destructive"
      });
      return;
    }

    const filesToUpload = acceptedFiles.slice(0, remainingSlots);
    
    // Validate files
    const validFiles: File[] = [];
    for (const file of filesToUpload) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a supported file type.`,
          variant: "destructive"
        });
        continue;
      }
      if (file.size > maxSizeBytes) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds the ${formatFileSize(maxSizeBytes)} limit.`,
          variant: "destructive"
        });
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    const newAttachments: AttachmentFile[] = [];
    
    for (let i = 0; i < validFiles.length; i++) {
      try {
        const attachment = await uploadFile(validFiles[i]);
        if (attachment) {
          newAttachments.push(attachment);
        }
        setUploadProgress(((i + 1) / validFiles.length) * 100);
      } catch (error) {
        toast({
          title: "Upload failed",
          description: `Failed to upload ${validFiles[i].name}.`,
          variant: "destructive"
        });
      }
    }

    if (newAttachments.length > 0) {
      onAttachmentsChange([...attachments, ...newAttachments]);
      toast({
        title: "Files uploaded",
        description: `${newAttachments.length} file(s) attached successfully.`
      });
    }

    setUploading(false);
    setUploadProgress(0);
  }, [attachments, customerId, disabled, maxFiles, maxSizeBytes, onAttachmentsChange, toast, uploading]);

  const removeAttachment = async (attachment: AttachmentFile) => {
    try {
      await supabase.storage
        .from('communication-attachments')
        .remove([attachment.path]);

      onAttachmentsChange(attachments.filter(a => a.id !== attachment.id));
    } catch (error) {
      console.error('Error removing attachment:', error);
      // Still remove from UI even if storage delete fails
      onAttachmentsChange(attachments.filter(a => a.id !== attachment.id));
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    disabled: disabled || uploading || attachments.length >= maxFiles,
    maxFiles: maxFiles - attachments.length,
    maxSize: maxSizeBytes
  });

  return (
    <div className="space-y-3">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all duration-200",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/30",
          (disabled || uploading || attachments.length >= maxFiles) && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          {uploading ? (
            <>
              <Upload className="h-6 w-6 text-primary animate-pulse" />
              <p className="text-sm text-muted-foreground">Uploading...</p>
              <Progress value={uploadProgress} className="w-32 h-1" />
            </>
          ) : isDragActive ? (
            <>
              <Upload className="h-6 w-6 text-primary" />
              <p className="text-sm text-primary font-medium">Drop files here</p>
            </>
          ) : (
            <>
              <Paperclip className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                <span className="text-primary font-medium">Click to attach</span> or drag files
              </p>
              <p className="text-xs text-muted-foreground">
                Images, PDFs, Word, Excel (max {formatFileSize(maxSizeBytes)} each)
              </p>
            </>
          )}
        </div>
      </div>

      {/* Attachment list */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <Badge
              key={attachment.id}
              variant="secondary"
              className="flex items-center gap-2 py-1.5 px-3 bg-muted/50 hover:bg-muted"
            >
              {getFileIcon(attachment.type)}
              <span className="text-xs max-w-[120px] truncate">{attachment.name}</span>
              <span className="text-xs text-muted-foreground">
                ({formatFileSize(attachment.size)})
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeAttachment(attachment);
                }}
                className="ml-1 hover:text-destructive transition-colors"
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* File count indicator */}
      {attachments.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {attachments.length} / {maxFiles} files attached
        </p>
      )}
    </div>
  );
};