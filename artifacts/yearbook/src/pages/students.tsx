
import { useListStudents, useListFrames } from "@workspace/api-client-react";
import { Link } from "wouter";
import { useState } from "react";
import { motion } from "framer-motion";
import { Search, UserCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AvatarGradient } from "@/components/ui/avatar-gradient";
import { Badge } from "@/components/ui/badge";

export default function Students() {
  const { data: students, isLoading } = useListStudents();
  const { data: frames } = useListFrames();
  const [search, setSearch] = useState("");

  const safeStudents = Array.isArray(students) ? students : [];
  const safeFrames = Array.isArray(frames) ? frames : [];

  const filteredStudents = safeStudents.filter(s => {
    const name = s?.name || "";
    const nickname = s?.nickname || "";
    return (
      name.toLowerCase().includes(search.toLowerCase()) || 
      nickname.toLowerCase().includes(search.toLowerCase())
    );
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "monitor": return <Badge className="bg-primary/20 text-primary hover:bg-primary/30 border-none">Lớp trưởng</Badge>;
      case "vice_monitor": return <Badge className="bg-secondary/40 text-secondary-foreground hover:bg-secondary/50 border-none">Lớp phó</Badge>;
      default: return null;
    }
  };

  const getStudentFrame = (frameId?: number | null) => {
    if (!frameId || safeFrames.length === 0) return null;
    return safeFrames.find(f => f.id === frameId);
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-12 gap-6">
        <div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-display font-bold mb-4"
          >
            Tập thể 9A
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground text-lg max-w-xl"
          >
            Gặp lại những gương mặt thân thương đã cùng nhau đi qua những năm tháng rực rỡ nhất của tuổi học trò.
          </motion.p>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="relative w-full md:w-72"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input 
            type="search" 
            placeholder="Tìm kiếm bạn bè..." 
            className="pl-10 h-12 rounded-full bg-card"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </motion.div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {isLoading ? (
          Array(10).fill(0).map((_, i) => (
            <div key={i} className="flex flex-col items-center">
              <Skeleton className="w-32 h-32 rounded-full mb-4" />
              <Skeleton className="h-6 w-24 mb-2" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))
        ) : filteredStudents.length === 0 ? (
          <div className="col-span-full py-20 text-center flex flex-col items-center">
            <UserCircle2 className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-xl font-bold mb-2">Không tìm thấy bạn học nào</h3>
            <p className="text-muted-foreground">Thử tìm với một tên khác xem sao.</p>
          </div>
        ) : (
          filteredStudents.map((student, i) => {
            const frame = getStudentFrame(student.active_frame_id);
            return (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link 
                  href={`/students/${student.id}`}
                  className="flex flex-col items-center p-6 rounded-3xl bg-card border hover:shadow-md transition-all hover:-translate-y-1 group"
                >
                  <div className="relative w-32 h-32 mb-5">
                    {frame && (
                      <div 
                        className="absolute -inset-2 rounded-full z-10 pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity animate-spin-slow"
                        style={{ 
                          background: frame.image_url,
                          WebkitMask: "radial-gradient(transparent 65%, black 65%)",
                          mask: "radial-gradient(transparent 65%, black 65%)"
                        }}
                      />
                    )}
                    <div className="w-full h-full rounded-full overflow-hidden border-4 border-background shadow-sm relative z-0">
                      {student.photo_url ? (
                        <img src={student.photo_url} alt={student.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <AvatarGradient name={student.name} className="w-full h-full" textClassName="text-4xl" />
                      )}
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <h3 className="text-lg font-bold group-hover:text-primary transition-colors line-clamp-1">{student.name}</h3>
                    {student.nickname && <p className="text-sm text-muted-foreground mb-2">({student.nickname})</p>}
                    <div className="mt-2 h-6 flex items-center justify-center">
                      {getRoleBadge(student.role)}
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
