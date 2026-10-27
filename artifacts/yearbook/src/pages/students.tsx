// import { useListStudents, useListFrames } from "@workspace/api-client-react";
// import { Link } from "wouter";
// import { useState } from "react";
// import { motion } from "framer-motion";
// import { Search, UserCircle2 } from "lucide-react";
// import { Input } from "@/components/ui/input";
// import { Skeleton } from "@/components/ui/skeleton";
// import { AvatarGradient } from "@/components/ui/avatar-gradient";
// import { Badge } from "@/components/ui/badge";

// export default function Students() {
//   const { data: students, isLoading } = useListStudents();
//   const { data: frames } = useListFrames();
//   const [search, setSearch] = useState("");

//   const filteredStudents = students?.filter(s => 
//     s.name.toLowerCase().includes(search.toLowerCase()) || 
//     (s.nickname && s.nickname.toLowerCase().includes(search.toLowerCase()))
//   ) || [];

//   const getRoleBadge = (role: string) => {
//     switch (role) {
//       case "monitor": return <Badge className="bg-primary/20 text-primary hover:bg-primary/30 border-none">Lớp trưởng</Badge>;
//       case "vice_monitor": return <Badge className="bg-secondary/40 text-secondary-foreground hover:bg-secondary/50 border-none">Lớp phó</Badge>;
//       default: return null;
//     }
//   };

//   const getStudentFrame = (frameId?: number | null) => {
//     if (!frameId || !frames) return null;
//     return frames.find(f => f.id === frameId);
//   };

//   return (
//     <div className="container mx-auto px-4 py-12">
//       <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-12 gap-6">
//         <div>
//           <motion.h1 
//             initial={{ opacity: 0, y: 20 }}
//             animate={{ opacity: 1, y: 0 }}
//             className="text-4xl md:text-5xl font-display font-bold mb-4"
//           >
//             Tập thể 9A
//           </motion.h1>
//           <motion.p 
//             initial={{ opacity: 0, y: 20 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ delay: 0.1 }}
//             className="text-muted-foreground text-lg max-w-xl"
//           >
//             Gặp lại những gương mặt thân thương đã cùng nhau đi qua những năm tháng rực rỡ nhất của tuổi học trò.
//           </motion.p>
//         </div>
        
//         <motion.div 
//           initial={{ opacity: 0, x: 20 }}
//           animate={{ opacity: 1, x: 0 }}
//           transition={{ delay: 0.2 }}
//           className="relative w-full md:w-72"
//         >
//           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
//           <Input 
//             type="search" 
//             placeholder="Tìm kiếm bạn bè..." 
//             className="pl-10 h-12 rounded-full bg-card"
//             value={search}
//             onChange={(e) => setSearch(e.target.value)}
//           />
//         </motion.div>
//       </div>

//       <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
//         {isLoading ? (
//           Array(10).fill(0).map((_, i) => (
//             <div key={i} className="flex flex-col items-center">
//               <Skeleton className="w-32 h-32 rounded-full mb-4" />
//               <Skeleton className="h-6 w-24 mb-2" />
//               <Skeleton className="h-4 w-16" />
//             </div>
//           ))
//         ) : filteredStudents.length === 0 ? (
//           <div className="col-span-full py-20 text-center flex flex-col items-center">
//             <UserCircle2 className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
//             <h3 className="text-xl font-bold mb-2">Không tìm thấy bạn học nào</h3>
//             <p className="text-muted-foreground">Thử tìm với một tên khác xem sao.</p>
//           </div>
//         ) : (
//           filteredStudents.map((student, i) => {
//             const frame = getStudentFrame(student.active_frame_id);
//             return (
//               <motion.div
//                 key={student.id}
//                 initial={{ opacity: 0, scale: 0.9 }}
//                 animate={{ opacity: 1, scale: 1 }}
//                 transition={{ delay: i * 0.05 }}
//               >
//                 <Link 
//                   href={`/students/${student.id}`}
//                   className="flex flex-col items-center p-6 rounded-3xl bg-card border hover:shadow-md transition-all hover:-translate-y-1 group"
//                 >
//                   <div className="relative w-32 h-32 mb-5">
//                     {frame && (
//                       <div 
//                         className="absolute -inset-2 rounded-full z-10 pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity animate-spin-slow"
//                         style={{ 
//                           background: frame.image_url,
//                           WebkitMask: "radial-gradient(transparent 65%, black 65%)",
//                           mask: "radial-gradient(transparent 65%, black 65%)"
//                         }}
//                       />
//                     )}
//                     <div className="w-full h-full rounded-full overflow-hidden border-4 border-background shadow-sm relative z-0">
//                       {student.photo_url ? (
//                         <img src={student.photo_url} alt={student.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
//                       ) : (
//                         <AvatarGradient name={student.name} className="w-full h-full" textClassName="text-4xl" />
//                       )}
//                     </div>
//                   </div>
                  
//                   <div className="text-center">
//                     <h3 className="text-lg font-bold group-hover:text-primary transition-colors line-clamp-1">{student.name}</h3>
//                     {student.nickname && <p className="text-sm text-muted-foreground mb-2">({student.nickname})</p>}
//                     <div className="mt-2 h-6 flex items-center justify-center">
//                       {getRoleBadge(student.role)}
//                     </div>
//                   </div>
//                 </Link>
//               </motion.div>
//             );
//           })
//         )}
//       </div>
//     </div>
//   );
// }

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

  // VÁ LỖI: Đảm bảo luôn ép thành mảng an toàn tránh lỗi map/filter không phải function
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
```[cite: 10]

#### 2. File `student-detail_2.tsx` (Đã sửa an toàn hàm check mảng và parse date)[cite: 7]:
```typescript
import { useGetStudent, useListFrames } from "@workspace/api-client-react";
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
  if (!str) return new Date();
  const d = parse(str, "dd/MM/yyyy", new Date());
  return isValid(d) ? d : new Date(str);
};

export default function StudentDetail() {
  const { id } = useParams();
  const studentId = parseInt(id || "0", 10);
  
  const { data: student, isLoading } = useGetStudent(studentId, { query: { enabled: !!studentId } });
  const { data: frames } = useListFrames();
  
  // VÁ LỖI: Đảm bảo frames luôn là mảng an toàn trước khi gọi .find()
  const safeFrames = Array.isArray(frames) ? frames : [];
  const frame = safeFrames.find(f => f.id === student?.active_frame_id);

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
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 pointer-events-none" />

        <div className="flex flex-col md:flex-row gap-10 md:gap-16 items-center md:items-start relative z-10">
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

