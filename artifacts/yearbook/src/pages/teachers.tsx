import { useState } from "react";
import { useUser, Show } from "@clerk/react";
import { useListTeacherMessages } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { GraduationCap, Quote, Plus, X, Send } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AvatarGradient } from "@/components/ui/avatar-gradient";

const BASE = import.meta.env.BASE_URL;

export default function Teachers() {
  const { data: messages, isLoading, refetch } = useListTeacherMessages();
  const { user } = useUser();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ teacher_name: "", subject: "", message: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Check if current user is a teacher
  const [role, setRole] = useState<string | null>(null);
  const [roleLoaded, setRoleLoaded] = useState(false);

  // Fetch role on mount if signed in
  if (user && !roleLoaded) {
    setRoleLoaded(true);
    fetch(`${BASE}api/auth/me`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setRole(d.role || "unknown"))
      .catch(() => setRole("unknown"));
  }

  const handleSubmit = async () => {
    if (!form.teacher_name.trim() || !form.message.trim()) {
      setError("Vui lòng điền họ tên và nội dung lời nhắn.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${BASE}api/teacher-messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacher_name: form.teacher_name,
          subject: form.subject || undefined,
          message: form.message,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Không thể gửi lời nhắn.");
        return;
      }
      setForm({ teacher_name: "", subject: "", message: "" });
      setShowForm(false);
      refetch();
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

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

        {/* Teacher-only: button to add message */}
        <Show when="signed-in">
          {role === "teacher" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mt-6">
              <Button onClick={() => setShowForm(true)} className="gap-2">
                <Plus className="w-4 h-4" /> Gửi lời nhắn của bạn
              </Button>
            </motion.div>
          )}
        </Show>
      </div>

      {/* Submit form (teacher only) */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 bg-card border rounded-3xl p-6 md:p-8 max-w-2xl mx-auto relative"
        >
          <button
            onClick={() => setShowForm(false)}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <h3 className="font-bold text-lg mb-5">Gửi lời nhắn của bạn</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block">Họ và tên <span className="text-destructive">*</span></Label>
                <Input
                  value={form.teacher_name}
                  onChange={(e) => setForm((f) => ({ ...f, teacher_name: e.target.value }))}
                  placeholder="VD: Nguyễn Văn A"
                />
              </div>
              <div>
                <Label className="mb-1.5 block">Môn dạy</Label>
                <Input
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  placeholder="VD: Toán, Văn..."
                />
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block">Lời nhắn <span className="text-destructive">*</span></Label>
              <Textarea
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                placeholder="Chia sẻ lời nhắn, tình cảm của bạn gửi đến học trò..."
                rows={4}
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button onClick={handleSubmit} disabled={saving} className="gap-2">
              {saving ? "Đang gửi..." : <><Send className="w-4 h-4" /> Gửi lời nhắn</>}
            </Button>
          </div>
        </motion.div>
      )}

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64 rounded-3xl" />
          ))}
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
                <p className="text-muted-foreground leading-relaxed italic">"{msg.message}"</p>
              </div>

              {/* Decorative */}
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-secondary/10 rounded-full blur-2xl" />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
