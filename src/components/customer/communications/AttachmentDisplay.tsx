import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Image as ImageIcon, 
  File,
  Download,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

interface AttachmentDisplayProps {
  attachments: Attachment[];
  className?: string;
}

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

export const AttachmentDisplay: React.FC<AttachmentDisplayProps> = ({
  attachments,
  className
}) => {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
        <FileText className="h-3 w-3" />
        Attachments ({attachments.length})
      </p>
      <div className="flex flex-wrap gap-2">
        {attachments.map((attachment) => (
          <a
            key={attachment.id}
            href={attachment.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group"
          >
            {attachment.type.startsWith('image/') ? (
              // Image preview
              <div className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-border hover:border-primary/50 transition-colors">
                <img
                  src={attachment.url}
                  alt={attachment.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ExternalLink className="h-4 w-4 text-white" />
                </div>
              </div>
            ) : (
              // File badge
              <Badge
                variant="secondary"
                className="flex items-center gap-2 py-1.5 px-3 bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
              >
                {getFileIcon(attachment.type)}
                <span className="text-xs max-w-[100px] truncate">{attachment.name}</span>
                <Download className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Badge>
            )}
          </a>
        ))}
      </div>
    </div>
  );
};