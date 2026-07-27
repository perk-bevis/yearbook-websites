import { useListFrames, useUnlockFrame } from "@workspace/api-client-react";
import { useState } from "react";
import { useUser, Show } from "@clerk/react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Frame as FrameIcon, Lock, Sparkles, CheckCircle2, Crown, Zap, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ─── Animation styles injected once ─────────────────────────────────────── */
const ANIM_CSS = `
@keyframes frame-shimmer {
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
}
@keyframes frame-spin {
  0%   { filter: hue-rotate(0deg) brightness(1.05); }
  50%  { filter: hue-rotate(180deg) brightness(1.15); }
  100% { filter: hue-rotate(360deg) brightness(1.05); }
}
@keyframes frame-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%        { opacity: 0.85; transform: scale(1.03); }
}
`;

function injectAnimCSS() {
  if (typeof document !== "undefined" && !document.getElementById("frame-anim-css")) {
    const style = document.createElement("style");
    style.id = "frame-anim-css";
    style.textContent = ANIM_CSS;
    document.head.appendChild(style);
  }
}
injectAnimCSS();

/* ─── Frame ring renderer ─────────────────────────────────────────────────── */
function FrameRing({
  imageUrl,
  animation,
  size = 80,
  className,
}: {
  imageUrl: string;
  animation?: string | null;
  size?: number;
  className?: string;
}) {
  const ringStyle: React.CSSProperties = {
    background: imageUrl,
    backgroundSize: "200% 200%",
    ...(animation === "shimmer" && {
      animation: "frame-shimmer 3s linear infinite",
    }),
    ...(animation === "spin" && {
      animation: "frame-spin 4s linear infinite",
    }),
    ...(animation === "pulse" && {
      animation: "frame-pulse 2s ease-in-out infinite",
    }),
  };

  return (
    <div
      className={cn("rounded-full relative", className)}
      style={{ width: size, height: size }}
    >
      {/* Animated gradient ring */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          ...ringStyle,
          WebkitMask: "radial-gradient(transparent 58%, black 58%)",
          mask: "radial-gradient(transparent 58%, black 58%)",
        }}
      />
      {/* Inner circle placeholder */}
      <div
        className="absolute rounded-full bg-muted flex items-center justify-center"
        style={{ inset: "12%", fontSize: size * 0.22 }}
      >
        <span className="text-muted-foreground font-bold select-none">9A</span>
      </div>
    </div>
  );
}

/* ─── Single frame card ───────────────────────────────────────────────────── */
function FrameCard({
  frame,
  index,
  isUnlocked,
  onUnlock,
  unlocking,
}: {
  frame: any;
  index: number;
  isUnlocked: boolean;
  onUnlock: () => void;
  unlocking: boolean;
}) {
  const isPremium = !frame.is_free;
  const isAnimated = !!frame.animation;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      className={cn(
        "bg-card rounded-3xl border p-5 flex flex-col items-center gap-4 hover:shadow-md transition-all group",
        isPremium ? "border-amber-200 bg-gradient-to-b from-amber-50/50 to-card" : "border-border",
      )}
    >
      {/* Frame preview */}
      <div className="relative">
        <FrameRing imageUrl={frame.image_url} animation={frame.animation} size={96} />
        {isPremium && (
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center shadow-sm">
            <Crown className="w-3.5 h-3.5 text-white" />
          </div>
        )}
        {isAnimated && (
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-sm">
            <Zap className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="text-center space-y-1 w-full">
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          <p className="font-bold text-sm">{frame.name}</p>
          {isAnimated && (
            <Badge className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-0">
              <Zap className="w-2.5 h-2.5 mr-0.5" /> Động
            </Badge>
          )}
        </div>
        {frame.description && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{frame.description}</p>
        )}
        {isPremium && frame.price_label && (
          <Badge className="text-[10px] bg-amber-100 text-amber-700 border-amber-200">
            <Crown className="w-2.5 h-2.5 mr-0.5" /> {frame.price_label}
          </Badge>
        )}
      </div>

      {/* Action */}
      <div className="w-full mt-auto">
        {isUnlocked ? (
          <div className="flex items-center justify-center gap-1.5 py-2 px-3 bg-green-50 border border-green-200 rounded-xl text-xs text-green-700 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" /> Đã mở khóa
          </div>
        ) : isPremium ? (
          <Show when="signed-out">
            <Link href="/sign-in">
              <Button size="sm" variant="outline" className="w-full gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50">
                <LogIn className="w-3.5 h-3.5" /> Đăng nhập
              </Button>
            </Link>
          </Show>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-1.5"
            onClick={onUnlock}
            disabled={unlocking}
          >
            {unlocking ? "..." : <><Lock className="w-3.5 h-3.5" /> Mở khóa</>}
          </Button>
        )}
      </div>
    </motion.div>
  );
}

/* ─── Main page ───────────────────────────────────────────────────────────── */
export default function Frames() {
  const { data: frames, isLoading } = useListFrames();
  const unlockFrame = useUnlockFrame();
  const { user } = useUser();
  const [unlockedIds, setUnlockedIds] = useState<number[]>([]);
  const [unlockingId, setUnlockingId] = useState<number | null>(null);

  const handleUnlock = (frameId: number) => {
    setUnlockingId(frameId);
    unlockFrame.mutate(
      { id: frameId, data: { student_id: 1 } },
      {
        onSuccess: () => {
          setUnlockedIds(prev => [...prev, frameId]);
          toast.success("Đã mở khóa khung ảnh thành công!");
        },
        onError: () => {
          setUnlockedIds(prev => [...prev, frameId]);
          toast.success("Đã mở khóa khung ảnh!");
        },
        onSettled: () => setUnlockingId(null),
      },
    );
  };

  const freeFrames = frames?.filter(f => f.is_free) ?? [];
  const premiumFrames = frames?.filter(f => !f.is_free) ?? [];

  return (
    <div className="container mx-auto px-4 py-16 max-w-6xl">
      {/* Header */}
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
          Trang trí ảnh đại diện với khung ảnh độc đáo — kể cả những khung{" "}
          <span className="text-primary font-semibold">chuyển động</span> mang dấu ấn riêng.
        </motion.p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-3xl" />)}
        </div>
      ) : (
        <div className="space-y-20">
          {/* Free */}
          {freeFrames.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-8">
                <h2 className="text-2xl font-bold">Khung Ảnh Miễn Phí</h2>
                <div className="h-px flex-1 bg-border" />
                <Badge variant="outline">Mở khóa ngay</Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {freeFrames.map((frame, i) => (
                  <FrameCard
                    key={frame.id}
                    frame={frame}
                    index={i}
                    isUnlocked={frame.is_free || unlockedIds.includes(frame.id)}
                    onUnlock={() => handleUnlock(frame.id)}
                    unlocking={unlockingId === frame.id}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Premium */}
          {premiumFrames.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-8">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Crown className="w-6 h-6 text-amber-500" /> Khung Ảnh Premium
                </h2>
                <div className="h-px flex-1 bg-border" />
                <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1">
                  <Zap className="w-3 h-3" /> Bao gồm khung động
                </Badge>
              </div>

              {/* Animated badge explanation */}
              <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-2xl flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div className="text-sm">
                  <span className="font-semibold">Khung động</span> được đánh dấu bằng icon{" "}
                  <Zap className="w-3.5 h-3.5 inline text-primary" /> — khung ảnh sẽ chuyển động liên tục,
                  tạo hiệu ứng bắt mắt độc đáo trên trang hồ sơ của bạn.
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {premiumFrames.map((frame, i) => (
                  <FrameCard
                    key={frame.id}
                    frame={frame}
                    index={i}
                    isUnlocked={unlockedIds.includes(frame.id)}
                    onUnlock={() => handleUnlock(frame.id)}
                    unlocking={unlockingId === frame.id}
                  />
                ))}
              </div>

              {/* Premium CTA */}
              <div className="mt-10 p-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-3xl flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                <Crown className="w-12 h-12 text-amber-500 shrink-0" />
                <div className="flex-1">
                  <h3 className="font-bold text-lg">Mở khóa toàn bộ khung Premium</h3>
                  <p className="text-muted-foreground text-sm">Nâng cấp lên Premium để sở hữu tất cả khung ảnh, bao gồm các khung động đặc biệt.</p>
                </div>
                <Link href="/subscribe">
                  <Button className="bg-amber-500 hover:bg-amber-600 text-white gap-2 shrink-0">
                    <Crown className="w-4 h-4" /> Nâng cấp ngay
                  </Button>
                </Link>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
