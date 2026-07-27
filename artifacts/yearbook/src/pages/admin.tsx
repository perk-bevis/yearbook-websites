import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueryClient } from "@tanstack/react-query";
import { getListStudentsQueryKey, getListPhotosQueryKey, getListMemoriesQueryKey, getListEventsQueryKey, getListTeacherMessagesQueryKey, getListFramesQueryKey } from "@workspace/api-client-react";
import { ShieldCheck, Eye, EyeOff, LogOut, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { StudentAdmin } from "./admin-tabs/student-admin";
import { PhotoAdmin } from "./admin-tabs/photo-admin";
import { MemoryAdmin } from "./admin-tabs/memory-admin";
import { EventAdmin } from "./admin-tabs/event-admin";
import { TeacherAdmin } from "./admin-tabs/teacher-admin";
import { FrameAdmin } from "./admin-tabs/frame-admin";

const STORAGE_KEY = "ky_yeu_admin_token";
const BASE = import.meta.env.BASE_URL;

function AdminLogin({ onLogin }: { onLogin: (token: string) => void }) {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE}api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem(STORAGE_KEY, data.token);
        onLogin(data.token);
      } else {
        setError(data.detail || "Sai mật khẩu. Vui lòng thử lại.");
      }
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-primary/5 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-4">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Bảng Quản Trị</h1>
          <p className="text-muted-foreground text-sm mt-1">Kỷ Yếu Lớp 9A — THCS Vũ Lăng</p>
        </div>

        <div className="bg-card border border-border rounded-3xl shadow-lg p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <Label className="flex items-center gap-1.5 mb-2">
                <Lock className="w-3.5 h-3.5" /> Mật khẩu quản trị
              </Label>
              <div className="relative">
                <Input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu..."
                  className="pr-10"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading || !password}>
              {loading ? "Đang kiểm tra..." : "Đăng nhập quản trị"}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Khu vực chỉ dành cho quản trị viên
        </p>
      </div>
    </div>
  );
}

export default function Admin() {
  const [token, setToken] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [activeTab, setActiveTab] = useState("students");
  const queryClient = useQueryClient();

  // Verify stored token on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) { setChecking(false); return; }
    fetch(`${BASE}api/admin/verify?token=${encodeURIComponent(stored)}`)
      .then(r => r.ok ? setToken(stored) : localStorage.removeItem(STORAGE_KEY))
      .catch(() => localStorage.removeItem(STORAGE_KEY))
      .finally(() => setChecking(false));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
  };

  const handleRefresh = () => {
    const map: Record<string, () => void> = {
      students: () => queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() }),
      photos: () => queryClient.invalidateQueries({ queryKey: getListPhotosQueryKey() }),
      memories: () => queryClient.invalidateQueries({ queryKey: getListMemoriesQueryKey() }),
      events: () => queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() }),
      teachers: () => queryClient.invalidateQueries({ queryKey: getListTeacherMessagesQueryKey() }),
      frames: () => queryClient.invalidateQueries({ queryKey: getListFramesQueryKey() }),
    };
    map[activeTab]?.();
  };

  if (checking) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!token) {
    return <AdminLogin onLogin={setToken} />;
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display">Bảng Quản Trị</h1>
            <p className="text-muted-foreground text-sm">Kỷ Yếu Lớp 9A — THCS Vũ Lăng</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10">
          <LogOut className="w-4 h-4" /> Đăng xuất
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-8 flex flex-wrap h-auto bg-muted/50 p-1 rounded-2xl">
          {["students","photos","memories","events","teachers","frames"].map((tab, i) => {
            const labels = ["Học sinh","Gallery","Kỷ niệm","Sự kiện","Thầy cô","Khung ảnh"];
            return (
              <TabsTrigger key={tab} value={tab} className="rounded-xl px-5 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                {labels[i]}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <div className="bg-card rounded-[2rem] border shadow-sm p-6 md:p-8 min-h-[500px]">
          <TabsContent value="students" className="mt-0 outline-none"><StudentAdmin /></TabsContent>
          <TabsContent value="photos" className="mt-0 outline-none"><PhotoAdmin /></TabsContent>
          <TabsContent value="memories" className="mt-0 outline-none"><MemoryAdmin /></TabsContent>
          <TabsContent value="events" className="mt-0 outline-none"><EventAdmin /></TabsContent>
          <TabsContent value="teachers" className="mt-0 outline-none"><TeacherAdmin /></TabsContent>
          <TabsContent value="frames" className="mt-0 outline-none"><FrameAdmin /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
