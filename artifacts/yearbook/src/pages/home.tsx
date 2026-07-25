import { useGetStats, useListStudents, useListMemories, useListEvents } from "@workspace/api-client-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Calendar, Heart, Image as ImageIcon, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

function AnimatedStat({ value, label, icon: Icon }: { value: number; label: string; icon: any }) {
  return (
    <motion.div variants={itemVariants} className="flex flex-col items-center p-6 bg-card rounded-3xl shadow-sm border border-border/50 text-center group hover:-translate-y-1 transition-transform">
      <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        <Icon className="w-6 h-6" />
      </div>
      <div className="text-4xl font-bold text-foreground mb-1 font-display">{value}</div>
      <div className="text-sm text-muted-foreground font-medium">{label}</div>
    </motion.div>
  );
}

export default function Home() {
  const { data: stats, isLoading: statsLoading } = useGetStats();
  const { data: students, isLoading: studentsLoading } = useListStudents();
  const { data: memories, isLoading: memoriesLoading } = useListMemories();
  const { data: events, isLoading: eventsLoading } = useListEvents();

  const featuredStudents = students?.slice(0, 4) || [];
  const latestMemories = memories?.slice(0, 3) || [];
  const latestEvents = events?.slice(0, 3) || [];

  return (
    <div className="flex-1">
      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/attached_assets/generated_images/hero-classroom.jpg" 
            alt="Classroom" 
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm dark:bg-background/90" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        </div>

        <div className="container relative z-10 px-4 py-20 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, type: "spring" }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 dark:bg-black/50 backdrop-blur-md border border-white/20 shadow-xl mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-semibold tracking-wide">Kỷ Niệm 2016 – 2019</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl md:text-7xl lg:text-8xl font-display font-bold text-foreground mb-6 drop-shadow-sm"
          >
            Tập Thể <span className="text-primary">Lớp 9A</span>
            <br />
            <span className="text-4xl md:text-5xl lg:text-6xl text-muted-foreground mt-4 block">THCS Vũ Lăng</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-lg md:text-xl text-foreground/80 max-w-2xl mx-auto mb-10 font-medium"
          >
            Nơi lưu giữ những năm tháng thanh xuân rực rỡ nhất. Tiếng ve kêu, hoa phượng đỏ, và những nụ cười sẽ còn mãi nơi đây.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-wrap items-center justify-center gap-4"
          >
            <Link href="/students">
              <Button size="lg" className="rounded-full px-8 text-base h-14 bg-primary hover:bg-primary/90 text-primary-foreground">
                Xem Danh Sách Lớp
              </Button>
            </Link>
            <Link href="/gallery">
              <Button size="lg" variant="outline" className="rounded-full px-8 text-base h-14 bg-background/50 backdrop-blur-md">
                Mở Album Ảnh
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-background relative z-20 -mt-10">
        <div className="container px-4 mx-auto">
          {statsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-40 rounded-3xl" />)}
            </div>
          ) : stats ? (
            <motion.div 
              variants={containerVariants} 
              initial="hidden" 
              whileInView="show" 
              viewport={{ once: true, margin: "-100px" }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8"
            >
              <AnimatedStat value={stats.student_count} label="Thành viên" icon={Users} />
              <AnimatedStat value={stats.photo_count} label="Bức ảnh" icon={ImageIcon} />
              <AnimatedStat value={stats.memory_count} label="Kỷ niệm" icon={Heart} />
              <AnimatedStat value={stats.event_count} label="Sự kiện" icon={Calendar} />
            </motion.div>
          ) : null}
        </div>
      </section>

      {/* Featured Students */}
      <section className="py-24 bg-muted/30">
        <div className="container px-4 mx-auto">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">Gương Mặt Thân Quen</h2>
              <p className="text-muted-foreground">Những người bạn đã cùng nhau trải qua 3 năm tuổi trẻ.</p>
            </div>
            <Link href="/students" className="hidden md:flex items-center gap-2 text-primary font-medium hover:underline">
              Xem tất cả <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {studentsLoading ? (
               [1, 2, 3, 4].map(i => <Skeleton key={i} className="aspect-square rounded-3xl" />)
            ) : (
              featuredStudents.map((student, i) => (
                <Link key={student.id} href={`/students/${student.id}`}>
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    viewport={{ once: true }}
                    className="group relative aspect-square rounded-3xl overflow-hidden bg-card cursor-pointer"
                  >
                    {student.photo_url ? (
                      <img src={student.photo_url} alt={student.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/40 flex items-center justify-center text-6xl font-display font-bold text-primary/50 transition-transform duration-500 group-hover:scale-110">
                        {student.name.charAt(0)}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80" />
                    <div className="absolute inset-x-0 bottom-0 p-6 text-white translate-y-2 group-hover:translate-y-0 transition-transform">
                      <div className="font-bold text-xl">{student.name}</div>
                      {student.nickname && <div className="text-white/80 text-sm">({student.nickname})</div>}
                    </div>
                  </motion.div>
                </Link>
              ))
            )}
          </div>
          <div className="mt-8 flex justify-center md:hidden">
            <Link href="/students">
              <Button variant="outline" className="rounded-full">Xem tất cả bạn học</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Latest Memories & Events */}
      <section className="py-24 bg-background">
        <div className="container px-4 mx-auto">
          <div className="grid lg:grid-cols-2 gap-16">
            
            {/* Memories */}
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-accent/20 text-accent-foreground flex items-center justify-center">
                  <Heart className="w-6 h-6" />
                </div>
                <h2 className="text-3xl font-display font-bold">Ký Ức Đọng Lại</h2>
              </div>
              
              <div className="space-y-6">
                {memoriesLoading ? (
                  [1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)
                ) : (
                  latestMemories.map((memory, i) => (
                    <motion.div 
                      key={memory.id}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      viewport={{ once: true }}
                      className="p-6 rounded-3xl bg-card border shadow-sm hover:shadow-md transition-shadow flex gap-6"
                    >
                      {memory.photo_url && (
                        <div className="w-24 h-24 rounded-2xl overflow-hidden shrink-0 hidden sm:block">
                          <img src={memory.photo_url} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div>
                        <h3 className="text-lg font-bold mb-2 line-clamp-1">{memory.title}</h3>
                        <p className="text-muted-foreground text-sm line-clamp-2 mb-4">{memory.content}</p>
                        <div className="flex items-center gap-2 text-xs font-medium text-primary">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                            {memory.author.charAt(0)}
                          </div>
                          {memory.author}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
              <div className="mt-8">
                <Link href="/memories">
                  <Button variant="ghost" className="text-primary hover:text-primary rounded-full group">
                    Đọc thêm kỷ niệm <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Events */}
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-secondary text-secondary-foreground flex items-center justify-center">
                  <Calendar className="w-6 h-6" />
                </div>
                <h2 className="text-3xl font-display font-bold">Dấu Ấn Thời Gian</h2>
              </div>
              
              <div className="space-y-6 relative before:absolute before:inset-y-4 before:left-[19px] before:w-0.5 before:bg-border">
                {eventsLoading ? (
                  [1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl ml-12" />)
                ) : (
                  latestEvents.map((event, i) => (
                    <motion.div 
                      key={event.id}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      viewport={{ once: true }}
                      className="relative pl-12"
                    >
                      <div className="absolute left-3.5 top-2 w-3 h-3 rounded-full bg-secondary ring-4 ring-background" />
                      <div className="p-5 rounded-2xl bg-card border shadow-sm hover:shadow-md transition-shadow">
                        <div className="text-sm font-semibold text-secondary-foreground mb-1">
                          {format(new Date(event.event_date), "dd MMMM, yyyy", { locale: vi })}
                        </div>
                        <h3 className="text-lg font-bold mb-2">{event.title}</h3>
                        {event.description && <p className="text-muted-foreground text-sm line-clamp-2">{event.description}</p>}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
              <div className="mt-8 pl-12">
                <Link href="/events">
                  <Button variant="ghost" className="text-secondary-foreground hover:text-secondary-foreground rounded-full group">
                    Xem dòng thời gian <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
