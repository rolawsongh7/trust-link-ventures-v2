import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface BookPage {
  icon?: React.ComponentType<any>;
  title: string;
  content: string;
  gradient?: string;
}

interface FlippingBookProps {
  pages: BookPage[];
  className?: string;
}

export const FlippingBook = React.forwardRef<HTMLDivElement, FlippingBookProps>(
  ({ pages, className }, ref) => {
    const [currentPage, setCurrentPage] = React.useState(0);
    const [isFlipping, setIsFlipping] = React.useState(false);

    // Auto-flip pages every 5 seconds
    React.useEffect(() => {
      const interval = setInterval(() => {
        setCurrentPage((prev) => (prev + 1) % pages.length);
      }, 5000);
      
      return () => clearInterval(interval);
    }, [pages.length]);

    const handlePageChange = (newPage: number) => {
      if (newPage !== currentPage && !isFlipping) {
        setIsFlipping(true);
        setTimeout(() => {
          setCurrentPage(newPage);
          setTimeout(() => setIsFlipping(false), 300);
        }, 150);
      }
    };

    const nextPage = () => {
      const next = (currentPage + 1) % pages.length;
      handlePageChange(next);
    };

    const prevPage = () => {
      const prev = (currentPage - 1 + pages.length) % pages.length;
      handlePageChange(prev);
    };

    const currentPageData = pages[currentPage];

    return (
      <div ref={ref} className={cn("relative mx-auto", className)}>
        {/* Book Container */}
        <div className="relative w-full max-w-2xl mx-auto">
          {/* Book Base */}
          <div className="relative perspective-1000">
            {/* Book Cover/Pages */}
            <div 
              className={cn(
                "relative w-full h-[500px] bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20",
                "rounded-xl shadow-2xl border-l-8 border-amber-800/60",
                "transform-gpu transition-all duration-500 ease-in-out",
                "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
                "before:rounded-xl before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300",
                isFlipping && "animate-pulse"
              )}
              style={{
                boxShadow: `
                  0 0 0 1px rgba(0,0,0,0.05),
                  0 2px 4px rgba(0,0,0,0.1),
                  0 8px 16px rgba(0,0,0,0.1),
                  0 16px 32px rgba(0,0,0,0.1),
                  inset 0 0 0 1px rgba(255,255,255,0.1)
                `,
              }}
            >
              {/* Page Lines */}
              <div className="absolute left-16 top-0 bottom-0 w-px bg-red-300/40" />
              <div className="absolute left-20 top-8 right-8 space-y-1">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div key={i} className="h-px bg-blue-200/30 rounded" />
                ))}
              </div>

              {/* Page Content */}
              <div 
                className={cn(
                  "absolute inset-0 flex flex-col justify-center items-center p-12 text-center",
                  "transition-all duration-300 ease-in-out",
                  isFlipping ? "opacity-0 scale-95" : "opacity-100 scale-100"
                )}
              >
                {/* Icon */}
                {currentPageData.icon && (
                  <div className="mb-8">
                    <div className={cn(
                      "w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg",
                      currentPageData.gradient || "bg-gradient-to-br from-primary to-secondary"
                    )}>
                      <currentPageData.icon className="w-10 h-10 text-white" />
                    </div>
                  </div>
                )}

                {/* Title */}
                <h3 className="text-3xl lg:text-4xl font-poppins font-bold mb-6 text-amber-900 dark:text-amber-100">
                  {currentPageData.title}
                </h3>

                {/* Content */}
                <p className="text-lg leading-relaxed text-amber-800/80 dark:text-amber-200/80 max-w-lg">
                  {currentPageData.content}
                </p>
              </div>

              {/* Page Number */}
              <div className="absolute bottom-4 right-8 text-sm text-amber-700/60 dark:text-amber-300/60 font-mono">
                {currentPage + 1} / {pages.length}
              </div>
            </div>

            {/* Book Spine Shadow */}
            <div className="absolute left-0 top-2 bottom-2 w-2 bg-gradient-to-b from-amber-800/40 to-amber-900/60 rounded-l-lg transform -translate-x-1" />
          </div>

          {/* Navigation Controls */}
          <div className="absolute top-1/2 -translate-y-1/2 -left-16 flex flex-col gap-4">
            <button
              onClick={prevPage}
              className={cn(
                "w-12 h-12 rounded-full bg-background/80 border border-border/50 shadow-lg",
                "flex items-center justify-center hover:bg-background hover:scale-110",
                "transition-all duration-200 backdrop-blur-sm"
              )}
              disabled={isFlipping}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

          <div className="absolute top-1/2 -translate-y-1/2 -right-16 flex flex-col gap-4">
            <button
              onClick={nextPage}
              className={cn(
                "w-12 h-12 rounded-full bg-background/80 border border-border/50 shadow-lg",
                "flex items-center justify-center hover:bg-background hover:scale-110",
                "transition-all duration-200 backdrop-blur-sm"
              )}
              disabled={isFlipping}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Page Indicators */}
          <div className="flex justify-center mt-8 space-x-2">
            {pages.map((_, index) => (
              <button
                key={index}
                onClick={() => handlePageChange(index)}
                className={cn(
                  "w-3 h-3 rounded-full transition-all duration-200",
                  currentPage === index 
                    ? "bg-primary scale-125" 
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
                disabled={isFlipping}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }
);

FlippingBook.displayName = "FlippingBook";