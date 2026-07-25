import { useGetStudent, useGetStudentActiveFrame, getGetStudentQueryKey, useListFrames, useSetStudentFrame } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Cake, Heart, Star, MessageCircleHeart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AvatarGradient } from "@/components/ui/avatar-gradient";
import { Badge } from "@/components/ui/badge";
import { format, parse, isValid } from "date-fns";
import { vi } from "date-fns/locale";

const parseDate = (str: string) => {
  const d = parse(str, "dd/MM/yyyy", new Date());
  return isValid(d) ? d : new Date(str);
};

export default function StudentDetail() {
  const { id } = useParams();
  const studentId = parseInt(id || "0", 10);
  
  const { data: student, isLoading } = useGetStudent(studentId, { query: { enabled: !!studentId } });
  const { data: frames } = useListFrames();
  
  const frame = frames?.find(f => f.id === student?.active_frame_id);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-4xl animate-pulse">
        <Skeleton className="w-10 h-10 rounded-full mb-8" />
        <div className="bg-card rounded-3xl p-8 border shadow-sm flex flex-col md:flex-row gap-12 items-center md:items-start">
          <Skeleton className="w-48 h-48 rounded-full shrink-0" />
          <div className="space-y-4 w-full">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-6 w-1/3" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="container mx-auto px-4 py-32 text-center">
        <h2 className="text-2xl font-bold mb-4">Không tìm thấy học sinh</h2>
        <Link href="/students">
          <Button>Quay lại danh sách</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <Link href="/students">
        <Button variant="ghost" className="mb-8 pl-0 hover:bg-transparent hover:text-primary group">
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Quay lại danh sách
        </Button>
      </Link>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-[3rem] p-8 md:p-12 border shadow-sm relative overflow-hidden"
      >
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 pointer-events-none" />

        <div className="flex flex-col md:flex-row gap-10 md:gap-16 items-center md:items-start relative z-10">
          {/* Avatar Area */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="relative shrink-0"
          >
            <div className="relative w-48 h-48 md:w-56 md:h-56">
              {frame && (
                <div 
                  className="absolute -inset-4 rounded-full z-10 pointer-events-none opacity-90"
                  style={{ 
                    background: frame.image_url,
                    WebkitMask: "radial-gradient(transparent 65%, black 65%)",
                    mask: "radial-gradient(transparent 65%, black 65%)"
                  }}
                />
              )}
              <div className="w-full h-full rounded-full overflow-hidden border-8 border-background shadow-xl relative z-0">
                {student.photo_url ? (
                  <img src={student.photo_url} alt={student.name} className="w-full h-full object-cover" />
                ) : (
                  <AvatarGradient name={student.name} className="w-full h-full" textClassName="text-6xl" />
                )}
              </div>
            </div>
            
            <div className="absolute -bottom-4 inset-x-0 flex justify-center z-20">
              {student.role === "monitor" && (
                <Badge className="px-4 py-1.5 text-sm bg-primary/20 text-primary border-none shadow-sm backdrop-blur-md">Lớp trưởng</Badge>
              )}
              {student.role === "vice_monitor" && (
                <Badge className="px-4 py-1.5 text-sm bg-secondary/40 text-secondary-foreground border-none shadow-sm backdrop-blur-md">Lớp phó</Badge>
              )}
            </div>
          </motion.div>

          {/* Info Area */}
          <div className="flex-1 w-full text-center md:text-left pt-2 md:pt-4">
            <motion.h1 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl md:text-5xl font-display font-bold mb-2"
            >
              {student.name}
            </motion.h1>
            
            {student.nickname && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="text-xl text-muted-foreground font-medium mb-8"
              >
                "{student.nickname}"
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              {student.birth_date && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-background/50 rounded-2xl p-4 border"
                >
                  <div className="flex items-center gap-2 text-muted-foreground mb-1 text-sm font-medium">
                    <Cake className="w-4 h-4" /> Sinh ngày
                  </div>
                  <div className="font-semibold text-lg">
                    {format(parseDate(student.birth_date), "dd MMMM, yyyy", { locale: vi })}
                  </div>
                </motion.div>
              )}

              {student.hobbies && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="bg-background/50 rounded-2xl p-4 border"
                >
                  <div className="flex items-center gap-2 text-muted-foreground mb-1 text-sm font-medium">
                    <Heart className="w-4 h-4" /> Sở thích
                  </div>
                  <div className="font-semibold">{student.hobbies}</div>
                </motion.div>
              )}

              {student.dream && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="bg-background/50 rounded-2xl p-4 border md:col-span-2"
                >
                  <div className="flex items-center gap-2 text-muted-foreground mb-1 text-sm font-medium">
                    <Star className="w-4 h-4" /> Ước mơ
                  </div>
                  <div className="font-semibold italic text-lg text-primary/80">"{student.dream}"</div>
                </motion.div>
              )}

              {student.message && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="bg-primary/5 rounded-2xl p-5 border border-primary/10 md:col-span-2 mt-4"
                >
                  <div className="flex items-center gap-2 text-primary mb-2 text-sm font-bold uppercase tracking-wider">
                    <MessageCircleHeart className="w-5 h-5" /> Lời nhắn gửi
                  </div>
                  <p className="text-lg leading-relaxed text-foreground/90 font-medium">
                    {student.message}
                  </p>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
