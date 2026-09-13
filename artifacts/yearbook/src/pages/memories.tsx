import { useListMemories } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Heart, Quote } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

export default function Memories() {
  const { data: memories, isLoading } = useListMemories();

  return (
    <div className="flex-1 bg-muted/20 pb-12 md:pb-24">
      {/* Memories Hero */}
      <section className="relative h-[30vh] min-h-[220px] md:h-[40vh] md:min-h-[300px] flex items-center justify-center overflow-hidden mb-8 md:mb-16">
        <div className="absolute inset-0 z-0">
          <img 
            src="/attached_assets/generated_images/memories-group.jpg" 
            alt="Memories" 
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" />
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        </div>
        
        <div className="relative z-10 text-center px-4">
          <div className="w-12 h-12 md:w-16 md:h-16 mx-auto bg-primary text-primary-foreground rounded-2xl flex items-center justify-center mb-4 md:mb-6 rotate-12 shadow-xl">
            <Heart className="w-6 h-6 md:w-8 md:h-8 fill-current" />
          </div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-5xl font-display font-bold mb-2 md:mb-4"
          >
            Sổ Lưu Bút
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-foreground/80 text-sm md:text-lg max-w-xl mx-auto font-medium leading-relaxed"
          >
            Những tâm tư, tình cảm và kỷ niệm đẹp nhất gửi lại nơi đây.
          </motion.p>
        </div>
      </section>

      <div className="container mx-auto px-4 max-w-3xl">
        {isLoading ? (
          <div className="space-y-8">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-3xl" />)}
          </div>
        ) : memories?.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            Chưa có kỷ niệm nào được chia sẻ.
          </div>
        ) : (
          <div className="space-y-6 md:space-y-12">
            {memories?.map((memory, i) => (
              <motion.div
                key={memory.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true, margin: "-50px" }}
                className="bg-card rounded-3xl md:rounded-[2.5rem] p-5 sm:p-7 md:p-10 border shadow-sm relative"
              >
                <Quote className="absolute top-5 right-5 md:top-8 md:right-8 w-8 h-8 md:w-12 md:h-12 text-primary/10 rotate-180" />
                
                <div className="flex items-center gap-3 mb-4 md:mb-6">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold text-base md:text-xl shadow-md">
                    {memory.author.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-sm md:text-lg">{memory.author}</div>
                    <div className="text-xs md:text-sm text-muted-foreground">
                      {format(new Date(memory.created_at), "dd MMMM, yyyy", { locale: vi })}
                    </div>
                  </div>
                </div>

                <h3 className="text-xl md:text-2xl font-display font-bold mb-3 md:mb-4 text-foreground pr-8">{memory.title}</h3>
                
                <div className="prose prose-sm md:prose-lg dark:prose-invert max-w-none mb-4 md:mb-6">
                  <p className="whitespace-pre-line leading-relaxed text-muted-foreground text-sm md:text-base">
                    {memory.content}
                  </p>
                </div>

                {memory.photo_url && (
                  <div className="rounded-2xl overflow-hidden mt-6 border">
                    <img 
                      src={memory.photo_url} 
                      alt={memory.title} 
                      className="w-full h-auto max-h-[400px] object-cover" 
                    />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
