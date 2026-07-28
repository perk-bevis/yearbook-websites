import { useListFrames, useUnlockFrame } from "@workspace/api-client-react";
import { useState, useEffect } from "react";
import { useUser, Show } from "@clerk/react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Frame as FrameIcon, Lock, Sparkles, CheckCircle2, Crown, Zap, LogIn, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL;

/* ─── Inject animation CSS ────────────────────────────────────────────────── */
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
  50%       { opacity: 0.82; transform: scale(1.04); }
}`;

if (typeof document !== "undefined" && !document.getElementById("frame-anim-css")) {
  const s = document.createElement("style");
  s.id = "frame-anim-css";
  s.textContent = ANIM_CSS;
  document.head.appendChild(s);
}

/* ─── Premium upgrade modal ───────────────────────────────────────────────── */
function PremiumModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Crown className="w-8 h-8 text-amber-500" />
        </div>
        <h2 className="text-xl font-bold mb-2">Khung ảnh Premium</h2>
        <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
          Nâng cấp lên <strong>Premium</strong> để sở hữu tất cả khung ảnh đẹp, bao gồm các khung động lung linh!
        </p>
        <div className="space-y-2">
          <Link href="/subscribe" onClick={onClose}>
            <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white gap-2">
              <Crown className="w-4 h-4" />Nâng cấp Premium — $4.99/tháng
            </Button>
          </Link>
          <Button variant="ghost" onClick={onClose} className="w-full text-muted-foreground">Để sau</Button>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Frame ring ──────────────────────────────────────────────────────────── */
function FrameRing({ imageUrl, animation, size = 88 }: { imageUrl: string; animation?: string | null; size?: number }) {
  const style: React.CSSProperties = {
    background: imageUrl,
    backgroundSize: "200% 200%",
    ...(animation === "shimmer" && { animation: "frame-shimmer 3s linear infinite" }),
    ...(animation === "spin" && { animation: "frame-spin 4s linear infinite" }),
    ...(animation === "pulse" && { animation: "frame-pulse 2s ease-in-out infinite" }),
  };
  return (
    <div className="rounded-full relative" style={{ width: size, height: size }}>
      <div className="absolute inset-0 rounded-full" style={{ ...style, WebkitMask: "radial-gradient(transparent 58%, black 58%)", mask: "radial-gradient(transparent 58%, black 58%)" }} />
      <div className="absolute rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground select-none" style={{ inset: "12%", fontSize: size * 0.2 }}>9A</div>
    </div>
  );
}

/* ─── Frame card ──────────────────────────────────────────────────────────── */
function FrameCard({ frame, index, userPlan, isSignedIn, onPremiumClick, onUnlock, unlocking }: {
  frame: any; index: number; userPlan: string; isSignedIn: boolean;
  onPremiumClick: () => void; onUnlock: () => void; unlocking: boolean;
}) {
  const isFree = frame.is_free;
  const isAnimated = !!frame.animation;
  const isPremium = !isFree;
  const canUse = isFree || userPlan === 'premium';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "bg-card rounded-3xl border p-5 flex flex-col items-center gap-3 relative overflow-hidden",
        isPremium ? "border-amber-200 bg-gradient-to-b from-amber-50/60 to-card" : "border-border",
        !canUse && "cursor-pointer hover:shadow-md transition-shadow"
      )}
      onClick={isPremium && !canUse ? onPremiumClick : undefined}
    >
      {/* Lock overlay for non-premium */}
      {isPremium && !canUse && (
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-amber-50/30 rounded-3xl pointer-events-none" />
      )}

      <div className="relative">
        <FrameRing imageUrl={frame.image_url} animation={canUse ? frame.animation : null} size={88} />
        {isPremium && (
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center shadow">
            <Crown className="w-3.5 h-3.5 text-white" />
          </div>
        )}
        {isAnimated && canUse && (
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow">
            <Zap className="w-3 h-3 text-white" />
          </div>
        )}
        {isPremium && !canUse && (
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-muted-foreground/70 rounded-full flex items-center justify-center shadow">
            <Lock className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      <div className="text-center space-y-1 w-full">
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          <p className="font-bold text-sm">{frame.name}</p>
          {isAnimated && canUse && <Badge className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-0"><Zap className="w-2.5 h-2.5 mr-0.5" />Động</Badge>}
        </div>
        {frame.description && <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{frame.description}</p>}
      </div>

      {/* Action button */}
      <div className="w-full mt-auto">
        {isFree ? (
          <div className="flex items-center justify-center gap-1.5 py-2 px-3 bg-green-50 border border-green-200 rounded-xl text-xs text-green-700 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />Miễn phí
          </div>
        ) : canUse ? (
          <div className="flex items-center justify-center gap-1.5 py-2 px-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 font-semibold">
            <Crown className="w-3.5 h-3.5" />Đã sở hữu
          </div>
        ) : (
          <Button size="sm" variant="outline" className="w-full gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50 text-xs"
            onClick={e => { e.stopPropagation(); onPremiumClick(); }}>
            <Lock className="w-3.5 h-3.5" />Cần Premium
          </Button>
        )}
      </div>
    </motion.div>
  );
}

/* ─── Main page ───────────────────────────────────────────────────────────── */
export default function Frames() {
  const { data: frames, isLoading } = useListFrames();
  const { user, isLoaded } = useUser();
  const [userPlan, setUserPlan] = useState<string>('free');
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  useEffect(() => {
    if (!isLoaded || !user) return;
    fetch(`${BASE}api/whop/verify`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.plan) setUserPlan(d.plan); })
      .catch(() => {});
  }, [isLoaded, user]);

  const freeFrames = frames?.filter(f => f.is_free) ?? [];
  const premiumFrames = frames?.filter(f => !f.is_free) ?? [];

  return (
    <>
      <div className="container mx-auto px-4 py-16 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center justify-center p-4 bg-accent/20 rounded-full mb-5">
            <FrameIcon className="w-8 h-8" />
          </div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-display font-bold mb-3">
            Cửa Hàng Khung Ảnh
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-muted-foreground text-lg max-w-xl mx-auto">
            Trang trí ảnh đại diện với khung ảnh độc đáo — bao gồm khung{" "}
            <span className="text-primary font-semibold">chuyển động</span> dành cho hội viên Premium.
          </motion.p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-60 rounded-3xl" />)}
          </div>
        ) : (
          <div className="space-y-16">
            {/* Free */}
            {freeFrames.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <h2 className="text-xl font-bold">Khung Ảnh Miễn Phí</h2>
                  <div className="h-px flex-1 bg-border" />
                  <Badge variant="outline">Dành cho tất cả</Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                  {freeFrames.map((frame, i) => (
                    <FrameCard key={frame.id} frame={frame} index={i} userPlan={userPlan}
                      isSignedIn={!!user} onPremiumClick={() => setShowPremiumModal(true)} onUnlock={() => {}} unlocking={false} />
                  ))}
                </div>
              </section>
            )}

            {/* Premium */}
            {premiumFrames.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Crown className="w-5 h-5 text-amber-500" />Khung Ảnh Premium
                  </h2>
                  <div className="h-px flex-1 bg-border" />
                  {userPlan === 'premium'
                    ? <Badge className="bg-amber-100 text-amber-700 border-amber-200"><Crown className="w-3 h-3 mr-1" />Đã mở khóa</Badge>
                    : <Badge className="bg-amber-50 text-amber-600 border-amber-200 gap-1"><Lock className="w-3 h-3" />Cần Premium</Badge>
                  }
                </div>

                {userPlan !== 'premium' && (
                  <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-sm">
                    <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
                    <span className="flex-1">Nhấn vào khung để xem chi tiết và nâng cấp Premium để sở hữu.</span>
                    <Link href="/subscribe"><Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white shrink-0">Nâng cấp</Button></Link>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                  {premiumFrames.map((frame, i) => (
                    <FrameCard key={frame.id} frame={frame} index={i} userPlan={userPlan}
                      isSignedIn={!!user} onPremiumClick={() => setShowPremiumModal(true)} onUnlock={() => {}} unlocking={false} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showPremiumModal && <PremiumModal onClose={() => setShowPremiumModal(false)} />}
      </AnimatePresence>
    </>
  );
}
