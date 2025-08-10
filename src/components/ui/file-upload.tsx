import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Upload,
  X,
  File,
  FileText,
  Image,
  FileArchive,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileWithPreview extends File {
  preview?: string;
  progress?: number;
  status?: 'uploading' | 'success' | 'error';
  error?: string;
}

interface FileUploadProps {
  onFilesChange?: (files: FileWithPreview[]) => void;
  onUpload?: (files: FileWithPreview[]) => Promise<void>;
  maxFiles?: number;
  maxSize?: number; // in bytes
  acceptedFileTypes?: string[];
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
  showPreview?: boolean;
}

const getFileIcon = (file: File) => {
  const type = file.type;
  if (type.startsWith('image/')) return Image;
  if (type.includes('pdf') || type.includes('document')) return FileText;
  if (type.includes('zip') || type.includes('archive')) return FileArchive;
  return File;
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const FileUpload: React.FC<FileUploadProps> = ({
  onFilesChange,
  onUpload,
  maxFiles = 10,
  maxSize = 10 * 1024 * 1024, // 10MB
  acceptedFileTypes = [],
  multiple = true,
  disabled = false,
  className,
  showPreview = true,
}) => {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles = acceptedFiles.map((file) => {
        const fileWithPreview = Object.assign(file, {
          preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
          progress: 0,
          status: 'uploading' as const,
        });
        return fileWithPreview;
      });

      const updatedFiles = multiple ? [...files, ...newFiles].slice(0, maxFiles) : newFiles;
      setFiles(updatedFiles);
      onFilesChange?.(updatedFiles);
    },
    [files, multiple, maxFiles, onFilesChange]
  );

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragReject,
    fileRejections,
  } = useDropzone({
    onDrop,
    accept: acceptedFileTypes.length > 0 ? acceptedFileTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}) : undefined,
    maxSize,
    multiple,
    disabled: disabled || isUploading,
  });

  const removeFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    onFilesChange?.(updatedFiles);
  };

  const handleUpload = async () => {
    if (!onUpload || files.length === 0) return;

    setIsUploading(true);
    try {
      // Simulate upload progress
      const updatedFiles = files.map((file) => ({
        ...file,
        status: 'uploading' as const,
        progress: 0,
      }));
      setFiles(updatedFiles);

      // Simulate progress updates
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        setFiles((prev) =>
          prev.map((file) => ({
            ...file,
            progress,
            status: progress === 100 ? 'success' : 'uploading',
          }))
        );
      }

      await onUpload(files);
    } catch (error) {
      setFiles((prev) =>
        prev.map((file) => ({
          ...file,
          status: 'error',
          error: error instanceof Error ? error.message : 'Upload failed',
        }))
      );
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusIcon = (file: FileWithPreview) => {
    switch (file.status) {
      case 'uploading':
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-success animate-bounce-in" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive error-shake" />;
      default:
        return null;
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <Card
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed p-8 text-center transition-all duration-300 cursor-pointer",
          "hover:scale-[1.02] hover:shadow-md",
          isDragActive && "border-primary bg-primary/5 animate-pulse-glow",
          isDragReject && "border-destructive bg-destructive/5 error-shake",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center space-y-4">
          <Upload className={cn(
            "h-12 w-12 text-muted-foreground transition-all duration-300",
            isDragActive && "scale-110 text-primary"
          )} />
          <div className="space-y-2">
            <h3 className="text-lg font-medium">
              {isDragActive
                ? "Drop files here"
                : "Drag & drop files here, or click to select"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {acceptedFileTypes.length > 0 && (
                <>Accepted: {acceptedFileTypes.join(', ')} • </>
              )}
              Max size: {formatFileSize(maxSize)} • Max files: {maxFiles}
            </p>
          </div>
        </div>
      </Card>

      {fileRejections.length > 0 && (
        <Alert variant="destructive" className="animate-fade-in">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {fileRejections.map(({ file, errors }) => (
                <div key={file.name}>
                  {file.name}: {errors.map((e) => e.message).join(', ')}
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {files.length > 0 && (
        <div className="space-y-4 animate-fade-in">
          <div className="space-y-2">
            {files.map((file, index) => {
              const FileIcon = getFileIcon(file);
              return (
                <Card key={index} className="p-4 transition-all duration-200 hover:shadow-md">
                  <div className="flex items-center space-x-4">
                    {showPreview && file.preview ? (
                      <img
                        src={file.preview}
                        alt={file.name}
                        className="h-12 w-12 rounded object-cover"
                      />
                    ) : (
                      <FileIcon className="h-12 w-12 text-muted-foreground" />
                    )}
                    
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(file)}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                            disabled={isUploading}
                            className="hover:scale-110 transition-transform"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                      
                      {file.status === 'uploading' && file.progress !== undefined && (
                        <Progress value={file.progress} className="h-2" />
                      )}
                      
                      {file.status === 'error' && file.error && (
                        <p className="text-xs text-destructive">{file.error}</p>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {onUpload && (
            <Button
              onClick={handleUpload}
              disabled={isUploading || files.every((f) => f.status === 'success')}
              className="w-full transition-all duration-200 hover:scale-105"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload Files'
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};