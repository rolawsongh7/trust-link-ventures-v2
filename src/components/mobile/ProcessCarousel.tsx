import { useEffect, useState, useCallback } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { processSteps } from "@/data/processCarouselSlides";
import { cn } from "@/lib/utils";

interface ProcessCarouselProps {
  className?: string;
}

export function ProcessCarousel({ className }: ProcessCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  const onSelect = useCallback(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
  }, [api]);

  useEffect(() => {
    if (!api) return;

    onSelect();
    api.on("select", onSelect);

    return () => {
      api.off("select", onSelect);
    };
  }, [api, onSelect]);

  // Auto-scroll every 5 seconds
  useEffect(() => {
    if (!api) return;

    const interval = setInterval(() => {
      if (api.canScrollNext()) {
        api.scrollNext();
      } else {
        api.scrollTo(0);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [api]);

  const scrollTo = (index: number) => {
    api?.scrollTo(index);
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Section Header */}
      <div className="px-4 mb-3">
        <h2 className="text-lg font-semibold text-foreground">How It Works</h2>
        <p className="text-sm text-muted-foreground">Your journey from browse to delivery</p>
      </div>

      <Carousel
        setApi={setApi}
        opts={{
          align: "start",
          loop: true,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-0">
          {processSteps.map((step, index) => (
            <CarouselItem key={step.step} className="pl-0 basis-full">
              <div className="relative h-48 overflow-hidden rounded-lg mx-4">
                {/* Background Image */}
                <img
                  src={step.image}
                  alt={step.title}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading={index === 0 ? "eager" : "lazy"}
                />

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                {/* Content Overlay */}
                <div className="absolute inset-0 flex flex-col justify-end p-4">
                  {/* Step Badge */}
                  <span className="inline-flex items-center justify-center w-8 h-8 mb-2 text-xs font-bold rounded-full bg-primary text-primary-foreground">
                    {step.step}
                  </span>

                  {/* Title */}
                  <h3 className="text-lg font-bold text-white mb-1">
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-white/80 line-clamp-2">
                    {step.description}
                  </p>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* Dot Indicators */}
      <div className="flex justify-center gap-1.5 mt-3">
        {processSteps.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollTo(index)}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              current === index
                ? "w-6 bg-primary"
                : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
            )}
            aria-label={`Go to step ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
