import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, LucideIcon } from "lucide-react";
import { MiniLineChart } from "./MiniLineChart";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: number;
  history?: number[];
  delay?: number;
  variant?: 'default' | 'success' | 'warning' | 'error';
}

export const MetricCard = ({ 
  icon: Icon, 
  label, 
  value, 
  trend, 
  history, 
  delay = 0,
  variant = 'default'
}: MetricCardProps) => {
  const variantStyles = {
    default: 'bg-primary/5',
    success: 'bg-green-500/10',
    warning: 'bg-yellow-500/10',
    error: 'bg-red-500/10'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
    >
      <Card className="relative overflow-hidden">
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <div className={cn("p-2 rounded-lg", variantStyles[variant])}>
              <Icon className="h-5 w-5" />
            </div>
            {trend !== undefined && (
              <Badge variant={trend >= 0 ? "default" : "secondary"} className="flex items-center gap-1">
                {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(trend)}%
              </Badge>
            )}
          </div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
          
          {history && history.length > 0 && (
            <div className="mt-2">
              <MiniLineChart data={history} />
            </div>
          )}
        </CardContent>
        
        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full" />
      </Card>
    </motion.div>
  );
};
