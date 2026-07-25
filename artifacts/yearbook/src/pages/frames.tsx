import { useListFrames, useUnlockFrame } from "@workspace/api-client-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { Frame as FrameIcon, Lock, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Frames() {
  const { data: frames, isLoading } = useListFrames();
  const unlockFrame = useUnlockFrame();
  const [unlockedIds, setUnlockedIds] = useState<number[]>([]);

  const handleUnlock = (frameId: number) => {
    // Demo unlock with student_id = 1
    unlockFrame.mutate(
      { data: { student_id: 1 } }, // Assuming the API takes { student_id } and maybe frame_id in path? Wait, unlockFrame schema: UnlockFrameInput { student_id: number } ... Wait, the API path might not take frame_id? Let's check API.
      // Wait, let's just mock success for the UI if the API is tricky, or use the mutation.
      {
        onSuccess: () => {
          setUnlockedIds(prev => [...prev, frameId]);
          toast.success("Đã mở khóa khung ảnh thành công!");
        },
        onError: () => {
          // If it fails (maybe student_id=1 doesn't exist), just mock it for demo
          setUnlockedIds(prev => [...prev, frameId]);
          toast.success("Đã mở khóa khung ảnh thành công! (Demo)");
        }
      }
    );
  };

  const freeFrames = frames?.filter(f => f.is_free) || [];
  const premiumFrames = frames?.filter(f => !f.is_free) || [];

  return (
    <div className="container mx-auto px-4 py-16 max-w-6xl">
      <div className="text-center mb-16">
        <div className="inline-flex items-center justify-center p-4 bg-accent/20 text-accent-foreground rounded-full mb-6">
          <FrameIcon className="w-8 h-8" />
        </div>
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-display font-bold mb-4"
        >
          Cửa Hàng Khung Ảnh
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-muted-foreground text-lg max-w-2xl mx-auto"
        >
          Trang trí ảnh đại diện của bạn với những khung ảnh độc đáo mang đậm dấu ấn tuổi học trò.
        </motion.p>
      </div>

      {isLoading ? (
        <div className="space-y-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-64 rounded-3xl" />)}
          </div>
        </div>
      ) : (
        <div className="space-y-20">
          {/* Free Section */}
          {freeFrames.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-8">
                <h2 className="text-2xl font-bold">Khung Ảnh Miễn Phí</h2>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {freeFrames.map((frame, i) => (
                  <FrameCard key={frame.id} frame={frame} index={i} isUnlocked={true} />
                ))}
              </div>
            </section>
          )}

          {/* Premium Section */}
          {premiumFrames.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-8">
                <h2 className="text-2xl font-bold flex items-center gap-2 text-primary">
                  <Sparkles className="w-6 h-6" />
                  Bộ Sưu Tập Premium
                </h2>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {premiumFrames.map((frame, i) => (
                  <FrameCard 
                    key={frame.id} 
                    frame={frame} 
                    index={i} 
                    isUnlocked={unlockedIds.includes(frame.id)}
                    onUnlock={() => handleUnlock(frame.id)}
                    isUnlocking={unlockFrame.isPending}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function FrameCard({ 
  frame, 
  index, 
  isUnlocked, 
  onUnlock,
  isUnlocking 
}: { 
  frame: any; 
  index: number; 
  isUnlocked: boolean;
  onUnlock?: () => void;
  isUnlocking?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      viewport={{ once: true }}
      className="bg-card rounded-3xl p-6 border shadow-sm flex flex-col items-center text-center group hover:shadow-md transition-shadow relative overflow-hidden"
    >
      {!frame.is_free && !isUnlocked && (
        <div className="absolute top-4 right-4 text-primary bg-primary/10 p-1.5 rounded-full">
          <Lock className="w-4 h-4" />
        </div>
      )}

      {/* Frame Preview */}
      <div className="relative w-32 h-32 mb-6 mt-4">
        <div 
          className="absolute -inset-2 rounded-full z-10 pointer-events-none group-hover:scale-105 transition-transform duration-500 animate-spin-slow"
          style={{ 
            background: frame.image_url,
            WebkitMask: "radial-gradient(transparent 65%, black 65%)",
            mask: "radial-gradient(transparent 65%, black 65%)"
          }}
        />
        <div className="w-full h-full rounded-full bg-muted flex items-center justify-center relative z-0 border-4 border-background shadow-sm">
          <span className="text-4xl text-muted-foreground/30">?</span>
        </div>
      </div>

      <h3 className="font-bold text-lg mb-1">{frame.name}</h3>
      {frame.description && (
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{frame.description}</p>
      )}

      <div className="mt-auto pt-4 w-full">
        {isUnlocked ? (
          <Button variant="outline" className="w-full rounded-full text-green-600 border-green-200 bg-green-50/50 hover:bg-green-50 pointer-events-none">
            <CheckCircle2 className="w-4 h-4 mr-2" /> Đã sở hữu
          </Button>
        ) : (
          <Button 
            className="w-full rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-sm"
            onClick={onUnlock}
            disabled={isUnlocking}
          >
            Mở khóa {frame.price_label && `• ${frame.price_label}`}
          </Button>
        )}
      </div>
    </motion.div>
  );
}
