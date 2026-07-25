import { Link, useLocation } from "wouter";
import { Menu, X, Image as ImageIcon, BookHeart, Clock, Users, GraduationCap, Frame, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Trang chủ", icon: BookHeart },
  { href: "/students", label: "Bạn học", icon: Users },
  { href: "/gallery", label: "Album ảnh", icon: ImageIcon },
  { href: "/memories", label: "Kỷ niệm", icon: BookHeart },
  { href: "/events", label: "Dòng thời gian", icon: Clock },
  { href: "/teachers", label: "Lời thầy cô", icon: GraduationCap },
  { href: "/frames", label: "Khung ảnh", icon: Frame },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-[100dvh] flex flex-col relative overflow-hidden bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-display text-xl font-bold group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              9A
            </div>
            <span className="font-display text-2xl tracking-tight hidden sm:block text-foreground">
              Kỷ Yếu Vũ Lăng
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const isActive = location === link.href || (link.href !== "/" && location.startsWith(link.href));
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "px-3 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
            <div className="w-px h-6 bg-border mx-2" />
            <Link
              href="/admin"
              className={cn(
                "p-2 rounded-full transition-colors flex items-center justify-center",
                location.startsWith("/admin")
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              title="Quản trị"
            >
              <ShieldCheck className="w-5 h-5" />
            </Link>
          </nav>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 text-muted-foreground hover:bg-muted rounded-full"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t bg-background absolute top-full left-0 w-full p-4 flex flex-col gap-2 shadow-lg animate-in slide-in-from-top-2">
            {NAV_LINKS.map((link) => {
              const isActive = location === link.href || (link.href !== "/" && location.startsWith(link.href));
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "px-4 py-3 rounded-xl text-base font-medium flex items-center gap-3 transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {link.label}
                </Link>
              );
            })}
            <Link
              href="/admin"
              onClick={() => setIsMobileMenuOpen(false)}
              className={cn(
                "px-4 py-3 rounded-xl text-base font-medium flex items-center gap-3 transition-colors",
                location.startsWith("/admin")
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <ShieldCheck className="w-5 h-5" />
              Quản trị
            </Link>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t bg-background mt-auto py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="font-display text-3xl mb-2 text-primary">Kỷ Yếu Lớp 9A</div>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            THCS Vũ Lăng • Khóa 2016 - 2019
            <br />
            Lưu giữ những năm tháng thanh xuân tươi đẹp nhất.
          </p>
        </div>
      </footer>
    </div>
  );
}
