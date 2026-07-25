import { useListTeacherMessages } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { GraduationCap, Quote } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AvatarGradient } from "@/components/ui/avatar-gradient";

export default function Teachers() {
  const { data: messages, isLoading } = useListTeacherMessages();

  return (
    <div className="container mx-auto px-4 py-16 max-w-6xl">
      <div className="text-center mb-16">
        <div className="inline-flex items-center justify-center p-4 bg-primary/10 text-primary rounded-full mb-6">
          <GraduationCap className="w-8 h-8" />
        </div>
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-display font-bold mb-4"
        >
          Lời Nhắn Gửi Từ Thầy Cô
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-muted-foreground text-lg max-w-2xl mx-auto"
        >
          Những hành trang tri thức và tình cảm thầy cô dành tặng, là bệ phóng vững chắc cho chúng em vào đời.
        </motion.p>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-64 rounded-3xl" />)}
        </div>
      ) : messages?.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          Chưa có lời nhắn nào từ thầy cô.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {messages?.map((msg, i) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              viewport={{ once: true }}
              className="bg-card rounded-3xl p-8 border shadow-sm relative overflow-hidden group hover:-translate-y-1 transition-transform"
            >
              <Quote className="absolute top-6 right-6 w-16 h-16 text-primary/5 -rotate-12 group-hover:rotate-0 transition-transform duration-500" />
              
              <div className="flex items-center gap-4 mb-6 relative z-10">
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-background shadow-sm shrink-0">
                  {msg.photo_url ? (
                    <img src={msg.photo_url} alt={msg.teacher_name} className="w-full h-full object-cover" />
                  ) : (
                    <AvatarGradient name={msg.teacher_name} className="w-full h-full" textClassName="text-2xl" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">{msg.teacher_name}</h3>
                  {msg.subject && (
                    <div className="text-sm font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-md inline-block mt-1">
                      GV {msg.subject}
                    </div>
                  )}
                </div>
              </div>

              <div className="relative z-10">
                <p className="text-muted-foreground leading-relaxed italic">
                  "{msg.message}"
                </p>
              </div>
              
              {/* Decorative bottom corner */}
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-secondary/10 rounded-full blur-2xl" />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
