import { Link, useLocation } from 'wouter';
import { Menu, X, Image as ImageIcon, BookHeart, Clock, Users, GraduationCap, Frame, LogIn, UserCircle, Crown, LogOut, BookOpen, Newspaper, MessageCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useUser, useClerk, Show } from '@clerk/react';
import { cn } from '@/lib/utils';
import { AvatarGradient } from '@/components/ui/avatar-gradient';
import { AiChatWidget } from '@/components/ai-chat-widget';

const BASE = import.meta.env.BASE_URL;

const NAV_LINKS = [
  { href: '/', label: 'Trang chủ', icon: BookHeart },
  { href: '/students', label: 'Bạn học', icon: Users },
  { href: '/gallery', label: 'Album ảnh', icon: ImageIcon },
  { href: '/memories', label: 'Kỷ niệm', icon: BookHeart },
  { href: '/events', label: 'Dòng thời gian', icon: Clock },
  { href: '/teachers', label: 'Lời thầy cô', icon: GraduationCap },
  { href: '/frames', label: 'Khung ảnh', icon: Frame },
  { href: '/feed', label: 'Bảng tin', icon: Newspaper },
];

function MessagesIcon() {
  const [unread, setUnread] = useState(0);
  const { user } = useUser();

  useEffect(() => {
    if (!user) return;
    const fetch_ = () =>
      fetch(`${BASE}api/messages/unread-count`, { credentials: 'include' })
        .then(r => r.json())
        .then(d => setUnread(d.count || 0))
        .catch(() => {});
    fetch_();
    const t = setInterval(fetch_, 8000);
    return () => clearInterval(t);
  }, [user]);

  return (
    <Link href="/tin-nhan">
      <button className="relative flex items-center gap-1.5 px-3 py-2 rounded-full hover:bg-muted transition-colors text-sm font-medium text-muted-foreground" title="Tin nhắn">
        <MessageCircle className="w-5 h-5 text-muted-foreground" />
         <span className="hidden lg:inline">Tin nhắn</span>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
    </Link>
  );
}

function UserMenu() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
  const signInUrl = `${window.location.origin}${basePath}/sign-in`;

  const displayName = user?.firstName || user?.fullName || 'Tài khoản';
  const avatar = user?.imageUrl;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 p-1.5 rounded-full hover:bg-muted transition-colors"
      >
        {avatar
          ? <img src={avatar} alt={displayName} className="w-8 h-8 rounded-full object-cover" />
          : <AvatarGradient name={displayName} className="w-8 h-8" textClassName="text-sm" />
        }
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <p className="font-semibold text-sm truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.primaryEmailAddress?.emailAddress}</p>
            </div>
            <div className="p-1.5 flex flex-col gap-0.5">
              <Link href="/profile" onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm hover:bg-muted transition-colors">
                <UserCircle className="w-4 h-4 text-muted-foreground" />Hồ sơ cá nhân
              </Link>
              <Link href="/tin-nhan" onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm hover:bg-muted transition-colors">
                <MessageCircle className="w-4 h-4 text-muted-foreground" />Tin nhắn
              </Link>
              <Link href="/subscribe" onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm hover:bg-muted transition-colors">
                <Crown className="w-4 h-4 text-amber-500" />Nâng cấp Premium
              </Link>
              <Link href="/feed" onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm hover:bg-muted transition-colors">
                <Newspaper className="w-4 h-4 text-muted-foreground" />Bảng tin lớp
              </Link>
              <Link href="/onboarding" onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm hover:bg-muted transition-colors">
                <BookOpen className="w-4 h-4 text-muted-foreground" />Tạo kỷ yếu mới
              </Link>
              <div className="border-t border-border my-1" />
              <button
                onClick={() => {
                  setOpen(false);
                  signOut({ redirectUrl: signInUrl });
                }}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm hover:bg-destructive/10 text-destructive transition-colors w-full text-left"
              >
                <LogOut className="w-4 h-4" />Đăng xuất
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
  const { user } = useUser();
  const isMessagesPage = location.startsWith('/tin-nhan');

  useEffect(() => {
    if (!user) return;
    const touch = () => {
      fetch(`${BASE}api/auth/presence`, { method: 'POST', credentials: 'include' }).catch(() => {});
    };
    touch();
    const timer = setInterval(touch, 30000);
    return () => clearInterval(timer);
  }, [user?.id]);

  return (
    <div className="min-h-[100dvh] flex flex-col relative overflow-hidden bg-background">
      {/* Navbar */}
      <header className={cn(
        'sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md',
        isMessagesPage && 'hidden md:block',
      )}>
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
              const isActive = location === link.href || (link.href !== '/' && location.startsWith(link.href));
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'px-3 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5',
                    isActive
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Auth area */}
          <div className="flex items-center gap-1">
            <MessagesIcon />
            <Show when="signed-out">
              <Link href="/sign-in">
                <button className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-full text-sm font-semibold hover:bg-primary/90 transition-colors">
                  <LogIn className="w-3.5 h-3.5" />Đăng nhập
                </button>
              </Link>
            </Show>
            <Show when="signed-in">
              <UserMenu />
            </Show>

            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-2 rounded-full hover:bg-muted transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t bg-background/95 backdrop-blur-md">
            <nav className="container mx-auto px-4 py-4 flex flex-col gap-1">
              {NAV_LINKS.map((link) => {
                const isActive = location === link.href || (link.href !== '/' && location.startsWith(link.href));
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-colors',
                      isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted',
                    )}
                  >
                    <Icon className="w-4 h-4" />{link.label}
                  </Link>
                );
              })}
              <Show when="signed-in">
                <Link href="/tin-nhan" onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-muted-foreground hover:bg-muted">
                  <MessageCircle className="w-4 h-4" />Tin nhắn
                </Link>
              </Show>
              <Show when="signed-out">
                <Link href="/sign-in" onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-primary bg-primary/10">
                  <LogIn className="w-4 h-4" />Đăng nhập
                </Link>
              </Show>
            </nav>
          </div>
        )}
      </header>

      {/* Page content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className={cn('border-t bg-muted/20 mt-auto', isMessagesPage && 'hidden md:block')}>
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="font-display text-2xl font-bold text-primary mb-1">Kỷ Yếu Lớp 9A</p>
          <p className="text-muted-foreground text-sm">THCS Vũ Lăng • Khóa 2016 - 2019</p>
          <p className="text-muted-foreground text-xs mt-2">Lưu giữ những năm tháng thanh xuân tươi đẹp nhất.</p>
        </div>
      </footer>

      {/* Floating AI chat widget — only for signed-in users */}
      <Show when="signed-in">
        {!isMessagesPage && <AiChatWidget />}
      </Show>
    </div>
  );
}
