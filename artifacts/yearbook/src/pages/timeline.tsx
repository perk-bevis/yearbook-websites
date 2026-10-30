import { useListEvents } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { CalendarDays } from "lucide-react";
import { format, parse, isValid } from "date-fns";
import { vi } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function Events() {
  const { data: events, isLoading } = useListEvents();

  // Parse "dd/MM/yyyy" string to Date
  const parseDate = (str: string) => {
    const d = parse(str, "dd/MM/yyyy", new Date());
    return isValid(d) ? d : new Date(str);
  };

  // Sort events by date ascending
  const sortedEvents = events
    ? [...events].sort((a, b) => parseDate(a.event_date).getTime() - parseDate(b.event_date).getTime())
    : [];

  return (
    <div className="container mx-auto px-4 py-16 max-w-5xl">
      <div className="text-center mb-20">
        <div className="inline-flex items-center justify-center p-4 bg-secondary/20 text-secondary-foreground rounded-full mb-6">
          <CalendarDays className="w-8 h-8" />
        </div>
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-display font-bold mb-4"
        >
          Dòng Thời Gian
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-muted-foreground text-lg max-w-xl mx-auto"
        >
          Nhìn lại hành trình 3 năm gắn bó, từ những ngày bỡ ngỡ đầu tiên đến lúc chia xa.
        </motion.p>
      </div>

      {isLoading ? (
        <div className="space-y-12 relative before:absolute before:inset-y-0 before:left-1/2 before:-translate-x-px before:w-0.5 before:bg-border">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex justify-center relative">
              <Skeleton className="w-5 h-5 rounded-full absolute left-1/2 -translate-x-1/2 mt-6 z-10" />
              <div className={cn("w-1/2 px-8", i % 2 === 0 ? "text-right" : "text-left ml-auto")}>
                <Skeleton className="h-40 rounded-3xl w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : sortedEvents.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          Chưa có sự kiện nào được ghi nhận.
        </div>
      ) : (
        <div className="relative before:absolute before:inset-y-0 before:left-8 md:before:left-1/2 before:-translate-x-px before:w-0.5 before:bg-border/50 space-y-12">
          {sortedEvents.map((event, i) => {
            const isEven = i % 2 === 0;
            return (
              <motion.div 
                key={event.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                viewport={{ once: true, margin: "-100px" }}
                className="relative flex flex-col md:flex-row items-start md:items-center justify-between group"
              >
                {/* Timeline Dot */}
                <div className="absolute left-8 md:left-1/2 -translate-x-1/2 mt-6 md:mt-0 w-4 h-4 rounded-full bg-secondary ring-8 ring-background group-hover:scale-125 transition-transform z-10" />
                
                {/* Content Left (Even) */}
                <div className={cn(
                  "w-full md:w-1/2 pl-20 md:px-12",
                  isEven ? "md:text-right" : "md:order-last"
                )}>
                  <div className="bg-card rounded-[2rem] p-6 shadow-sm border group-hover:shadow-md transition-all group-hover:-translate-y-1">
                    <div className={cn("inline-block px-4 py-1.5 rounded-full bg-secondary/20 text-secondary-foreground text-sm font-bold mb-4")}>
                      {format(parseDate(event.event_date), "dd/MM/yyyy", { locale: vi })}
                    </div>
                    <h3 className="text-2xl font-bold mb-3">{event.title}</h3>
                    {event.description && (
                      <p className="text-muted-foreground leading-relaxed mb-4">
                        {event.description}
                      </p>
                    )}
                    {event.photo_url && (
                      <div className="rounded-xl overflow-hidden">
                        <img 
                          src={event.photo_url} 
                          alt={event.title} 
                          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-700" 
                        />
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
