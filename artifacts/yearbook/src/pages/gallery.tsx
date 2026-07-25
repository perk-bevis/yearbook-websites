import { useListPhotos } from "@workspace/api-client-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { id: "all", label: "Tất cả" },
  { id: "classmates", label: "Lớp học" },
  { id: "events", label: "Sự kiện" },
  { id: "trips", label: "Dã ngoại" },
  { id: "teachers", label: "Thầy cô" },
  { id: "other", label: "Khác" },
];

export default function Gallery() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [lightboxPhoto, setLightboxPhoto] = useState<{ url: string; caption?: string | null } | null>(null);

  const { data: photos, isLoading } = useListPhotos(
    activeCategory === "all" ? undefined : { category: activeCategory },
    { query: { queryKey: ["gallery", activeCategory] } }
  );

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-display font-bold mb-4"
        >
          Album Ảnh
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-muted-foreground text-lg max-w-xl mx-auto"
        >
          Từng khoảnh khắc, từng nụ cười được lưu giữ trọn vẹn.
        </motion.p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap justify-center gap-2 mb-12">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              "px-5 py-2 rounded-full text-sm font-medium transition-all duration-300",
              activeCategory === cat.id
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-card text-muted-foreground hover:bg-muted"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Photo Grid */}
      {isLoading ? (
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="bg-muted rounded-2xl animate-pulse" style={{ height: `${Math.max(150, Math.random() * 300 + 150)}px` }} />
          ))}
        </div>
      ) : photos?.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          Chưa có hình ảnh nào trong thư mục này.
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
          <AnimatePresence>
            {photos?.map((photo, i) => (
              <motion.div
                key={photo.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="break-inside-avoid"
              >
                <div 
                  className="group relative rounded-2xl overflow-hidden cursor-pointer bg-card border"
                  onClick={() => setLightboxPhoto({ url: photo.url, caption: photo.caption })}
                >
                  <img 
                    src={photo.url} 
                    alt={photo.caption || "Hình ảnh"} 
                    className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700" 
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                    {photo.caption && <p className="text-white text-sm font-medium line-clamp-2">{photo.caption}</p>}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 md:p-8"
            onClick={() => setLightboxPhoto(null)}
          >
            <button 
              className="absolute top-4 right-4 md:top-8 md:right-8 text-white/70 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-50"
              onClick={(e) => { e.stopPropagation(); setLightboxPhoto(null); }}
            >
              <X className="w-6 h-6" />
            </button>
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="relative max-w-5xl max-h-[90vh] w-full h-full flex flex-col items-center justify-center"
              onClick={e => e.stopPropagation()}
            >
              <img 
                src={lightboxPhoto.url} 
                alt={lightboxPhoto.caption || ""} 
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" 
              />
              {lightboxPhoto.caption && (
                <div className="mt-4 text-white text-lg font-medium text-center bg-black/50 px-6 py-2 rounded-full backdrop-blur-sm">
                  {lightboxPhoto.caption}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
