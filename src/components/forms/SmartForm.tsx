import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  AlertCircle,
  Info,
  Save,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FieldConfig {
  name: string;
  label: string;
  type: 'text' | 'email' | 'number' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'file';
  placeholder?: string;
  required?: boolean;
  validation?: z.ZodType<any>;
  options?: Array<{ value: string; label: string }>;
  helpText?: string;
  dependencies?: string[]; // Fields this field depends on
  conditional?: (values: any) => boolean; // Show field conditionally
  autoSave?: boolean;
}

interface SmartFormProps {
  fields: FieldConfig[];
  onSubmit: (data: any) => Promise<void> | void;
  onAutoSave?: (data: any) => Promise<void> | void;
  defaultValues?: Record<string, any>;
  className?: string;
  showProgress?: boolean;
  title?: string;
  description?: string;
  submitLabel?: string;
  isLoading?: boolean;
}

export const SmartForm: React.FC<SmartFormProps> = ({
  fields,
  onSubmit,
  onAutoSave,
  defaultValues = {},
  className,
  showProgress = true,
  title,
  description,
  submitLabel = 'Submit',
  isLoading = false,
}) => {
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [completionPercentage, setCompletionPercentage] = useState(0);

  // Create dynamic schema based on field configurations
  const createSchema = () => {
    const schemaFields: Record<string, z.ZodType<any>> = {};
    
    fields.forEach((field) => {
      let validator = field.validation || z.string();
      
      if (field.required) {
        if (validator instanceof z.ZodString) {
          validator = validator.min(1, `${field.label} is required`);
        }
      } else {
        validator = validator.optional();
      }
      
      schemaFields[field.name] = validator;
    });
    
    return z.object(schemaFields);
  };

  const schema = createSchema();
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onChange',
  });

  const { handleSubmit, watch, control, formState: { errors, isValid, dirtyFields } } = form;
  const watchedValues = watch();

  // Calculate completion percentage
  useEffect(() => {
    const visibleFields = fields.filter(field => 
      !field.conditional || field.conditional(watchedValues)
    );
    const completedFields = visibleFields.filter(field => 
      watchedValues[field.name] && String(watchedValues[field.name]).trim() !== ''
    );
    
    const percentage = visibleFields.length > 0 
      ? Math.round((completedFields.length / visibleFields.length) * 100)
      : 0;
    
    setCompletionPercentage(percentage);
  }, [watchedValues, fields]);

  // Auto-save functionality
  useEffect(() => {
    if (!onAutoSave || Object.keys(dirtyFields).length === 0) return;

    const autoSaveFields = fields.filter(field => field.autoSave);
    const hasAutoSaveChanges = autoSaveFields.some(field => dirtyFields[field.name]);
    
    if (!hasAutoSaveChanges) return;

    const timeoutId = setTimeout(async () => {
      setAutoSaveStatus('saving');
      try {
        await onAutoSave(watchedValues);
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
      } catch (error) {
        setAutoSaveStatus('error');
        setTimeout(() => setAutoSaveStatus('idle'), 3000);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [watchedValues, onAutoSave, dirtyFields, fields]);

  const renderField = (field: FieldConfig) => {
    // Check if field should be shown
    if (field.conditional && !field.conditional(watchedValues)) {
      return null;
    }

    const error = errors[field.name];
    const hasError = !!error;
    const errorMessage = error?.message ? String(error.message) : 'Invalid input';

    return (
      <div key={field.name} className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={field.name} className="text-sm font-medium">
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          {field.autoSave && (
            <Badge variant="outline" className="text-xs">
              Auto-save
            </Badge>
          )}
        </div>

        <Controller
          name={field.name}
          control={control}
          render={({ field: formField }) => {
            switch (field.type) {
              case 'textarea':
                return (
                  <Textarea
                    {...formField}
                    id={field.name}
                    placeholder={field.placeholder}
                    className={cn(hasError && "border-destructive")}
                  />
                );

              case 'select':
                return (
                  <Select onValueChange={formField.onChange} value={formField.value}>
                    <SelectTrigger className={cn(hasError && "border-destructive")}>
                      <SelectValue placeholder={field.placeholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                );

              case 'checkbox':
                return (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={field.name}
                      checked={formField.value}
                      onCheckedChange={formField.onChange}
                    />
                    <Label htmlFor={field.name} className="text-sm">
                      {field.placeholder}
                    </Label>
                  </div>
                );

              case 'radio':
                return (
                  <RadioGroup
                    value={formField.value}
                    onValueChange={formField.onChange}
                  >
                    {field.options?.map((option) => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <RadioGroupItem value={option.value} id={option.value} />
                        <Label htmlFor={option.value} className="text-sm">
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                );

              default:
                return (
                  <Input
                    {...formField}
                    id={field.name}
                    type={field.type}
                    placeholder={field.placeholder}
                    className={cn(hasError && "border-destructive")}
                  />
                );
            }
          }}
        />

        {hasError && (
          <div className="flex items-center space-x-1 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{errorMessage}</span>
          </div>
        )}

        {field.helpText && !hasError && (
          <div className="flex items-center space-x-1 text-sm text-muted-foreground">
            <Info className="h-4 w-4" />
            <span>{field.helpText}</span>
          </div>
        )}
      </div>
    );
  };

  const getAutoSaveStatusIcon = () => {
    switch (autoSaveStatus) {
      case 'saving':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'saved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getAutoSaveStatusText = () => {
    switch (autoSaveStatus) {
      case 'saving':
        return 'Saving...';
      case 'saved':
        return 'Saved';
      case 'error':
        return 'Save failed';
      default:
        return '';
    }
  };

  return (
    <Card className={cn("p-6", className)}>
      {(title || description) && (
        <div className="mb-6">
          {title && <h2 className="text-2xl font-bold mb-2">{title}</h2>}
          {description && <p className="text-muted-foreground">{description}</p>}
        </div>
      )}

      {showProgress && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Completion Progress</span>
            <span className="text-sm text-muted-foreground">{completionPercentage}%</span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {fields.map(renderField)}

        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center space-x-2 text-sm">
            {getAutoSaveStatusIcon()}
            <span className="text-muted-foreground">{getAutoSaveStatusText()}</span>
          </div>

          <Button
            type="submit"
            disabled={!isValid || isLoading}
            className="min-w-24"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {submitLabel}
              </>
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
};