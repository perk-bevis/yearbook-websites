
import { Link, useLocation } from 'wouter';
import {
  Menu,
  X,
  Image as ImageIcon,
  BookHeart,
  Clock,
  Users,
  UsersRound,
  GraduationCap,
  Frame,
  LogIn,
  UserCircle,
  Crown,
  Gem,
  LogOut,
  BookOpen,
  Newspaper,
  MessageCircle,
  Search,
  Bell,
  Home,
  ChevronDown,
  Sparkles,
  Wallet,
  CalendarDays, 
  Lightbulb,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useUser, useClerk, Show } from '@clerk/react';
import { cn } from '@/lib/utils';
import { AvatarGradient } from '@/components/ui/avatar-gradient';
import { AiChatWidget } from '@/components/ai-chat-widget';

const BASE = import.meta.env.BASE_URL;

const NAV_MAIN = [
  { href: '/', label: 'Trang chủ', icon: Home },
  { href: '/yearbooks/mine', label: 'Kỷ yếu của tôi', icon: BookOpen },
  { href: '/ban-be', label: 'Bạn bè', icon: UsersRound },
  { href: '/tin-nhan', label: 'Tin nhắn', icon: MessageCircle },
  { href: '/quy-lop', label: 'Quỹ lớp', icon: Wallet },
  { href: '/events', label: 'Sự kiện', icon: CalendarDays },
];

const NAV_DISCOVER = [
  { href: '/students', label: 'Bạn học', icon: Users },
  { href: '/gallery', label: 'Album ảnh', icon: ImageIcon },
  { href: '/memories', label: 'Kỷ niệm', icon: BookHeart },
  { href: '/events', label: 'Dòng thời gian', icon: Clock },
  { href: '/teachers', label: 'Lời thầy cô', icon: GraduationCap },
  { href: '/frames', label: 'Khung ảnh', icon: Frame },
  { href: '/feed', label: 'Bảng tin', icon: Newspaper },
  {
    href: '/de-xuat-tinh-nang',
    label: 'Đề xuất tính năng',
    icon: Lightbulb,
  },
];

function MessagesIcon() {
  const [unread, setUnread] = useState(0);
  const { user } = useUser();

  useEffect(() => {
    if (!user) {
      setUnread(0);
      return;
    }

    let active = true;

    const fetchUnread = () => {
      fetch(`${BASE}api/messages/unread-count`, {
        credentials: 'include',
      })
        .then((res) => (res.ok ? res.json() : { count: 0 }))
        .then((data) => {
          if (active) setUnread(data.count || 0);
        })
        .catch(() => {});
    };

    fetchUnread();
    const timer = setInterval(fetchUnread, 8000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [user?.id]);

  return (
    <Link
      href="/tin-nhan"
      title="Tin nhắn"
      className="relative flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <MessageCircle className="h-[18px] w-[18px]" />
      {unread > 0 && (
        <span className="absolute right-0 top-0 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </Link>
  );
}

function UserMenu() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);

  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
  const signInUrl = `${window.location.origin}${basePath}/sign-in`;
  const displayName = user?.firstName || user?.fullName || 'Tài khoản';
  const avatar = profileAvatar || user?.imageUrl;

  useEffect(() => {
    if (!user) {
      setProfileAvatar(null);
      return;
    }

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;

    const loadAvatar = async () => {
      try {
        const response = await fetch(`${BASE}api/auth/me`, {
          credentials: 'include',
        });

        if (response.ok) {
          const profile = await response.json();
          if (!cancelled) setProfileAvatar(profile.photo_url || null);
          return;
        }
      } catch {
        // Thử lại trong thời gian ngắn khi hồ sơ đang được đồng bộ.
      }

      if (!cancelled && attempt < 3) {
        attempt += 1;
        retryTimer = setTimeout(loadAvatar, 500);
      }
    };

    const onAvatarUpdated = (event: Event) => {
      const detail = (
        event as CustomEvent<{ photoUrl?: string | null }>
      ).detail;

      setProfileAvatar(detail?.photoUrl || null);
    };

    window.addEventListener(
      'yearbook:profile-avatar-updated',
      onAvatarUpdated,
    );

    void loadAvatar();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      window.removeEventListener(
        'yearbook:profile-avatar-updated',
        onAvatarUpdated,
      );
    };
  }, [user?.id]);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Tài khoản"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-full p-1 transition-colors hover:bg-muted"
      >
        {avatar ? (
          <img
            src={avatar}
            alt={displayName}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <AvatarGradient
            name={displayName}
            className="h-8 w-8"
            textClassName="text-sm"
          />
        )}
        <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Đóng menu tài khoản"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />

          <div className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
            <div className="border-b border-border bg-muted/30 px-4 py-3">
              <p className="truncate text-sm font-semibold">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {user?.primaryEmailAddress?.emailAddress}
              </p>
            </div>

            <div className="flex flex-col gap-1 p-2">
              <Link
                href="/profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-muted"
              >
                <UserCircle className="h-4 w-4" />
                Hồ sơ cá nhân
              </Link>

              <Link
                href="/tin-nhan"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-muted"
              >
                <MessageCircle className="h-4 w-4" />
                Tin nhắn
              </Link>

              <Link
                href="/subscribe"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-muted"
              >
                <Gem className="h-4 w-4 text-amber-500" />
                Nâng cấp Premium
              </Link>

              <Link
                href="/feed"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-muted"
              >
                <Newspaper className="h-4 w-4" />
                Bảng tin lớp
              </Link>

              <Link
                href="/onboarding"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-muted"
              >
                <BookOpen className="h-4 w-4" />
                Tạo kỷ yếu mới
              </Link>

              <div className="my-1 border-t border-border" />

              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  void signOut({ redirectUrl: signInUrl });
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" />
                Đăng xuất
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function NavigationGroup({
  title,
  links,
  location,
  closeMenu,
}: {
  title?: string;
  links: typeof NAV_MAIN;
  location: string;
  closeMenu?: () => void;
}) {
  return (
    <div className="space-y-1">
      {title && (
        <p className="px-3 pb-2 pt-5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
      )}

      {links.map((link) => {
        const active =
          location === link.href ||
          (link.href !== '/' && location.startsWith(link.href));

        const Icon = link.icon;

        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={closeMenu}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors',
              active
                ? 'bg-primary/10 text-primary'
                : 'text-foreground/75 hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className="h-[17px] w-[17px] shrink-0" />
            <span className="min-w-0 flex-1 truncate">{link.label}</span>

            {link.href === '/tin-nhan' && (
              <span className="h-2 w-2 rounded-full bg-primary" />
            )}
          </Link>
        );
      })}
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useUser();
  const isMessagesPage = location.startsWith('/tin-nhan');

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  useEffect(() => {
    if (!user) return;

    const touch = () => {
      fetch(`${BASE}api/auth/presence`, {
        method: 'POST',
        credentials: 'include',
      }).catch(() => {});
    };

    touch();
    const timer = setInterval(touch, 30000);

    return () => clearInterval(timer);
  }, [user?.id]);

  useEffect(() => {
    if (!mobileOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[244px] flex-col border-r border-border/70 bg-background lg:flex">
        <Link
          href="/"
          className="flex h-[68px] shrink-0 items-center gap-3 border-b border-border/60 px-5"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BookHeart className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-tight">
              Yearbook Websites
            </p>
            <p className="text-[10px] text-muted-foreground">
              Lưu giữ thanh xuân
            </p>
          </div>
        </Link>

        <nav className="flex-1 overflow-y-auto px-3 pb-4 pt-3">
          <NavigationGroup links={NAV_MAIN} location={location} />
          <NavigationGroup
            title="Khám phá"
            links={NAV_DISCOVER}
            location={location}
          />
        </nav>

        <Show when="signed-in">
          <div className="border-t border-border/60 p-3">
            <Link
              href="/profile"
              className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-muted"
            >
              {user?.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt="Ảnh đại diện"
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <AvatarGradient
                  name={user?.fullName || 'Tài khoản'}
                  className="h-9 w-9"
                  textClassName="text-sm"
                />
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">
                  {user?.firstName || user?.fullName || 'Tài khoản'}
                </p>
                <p className="text-[10px] text-muted-foreground">Tài khoản</p>
              </div>

              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>
        </Show>
      </aside>

      {/* Main area */}
      <div className="min-h-screen lg:pl-[244px]">
        {/* Topbar */}
        <header
          className={cn(
            'sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur-xl',
            isMessagesPage && 'hidden md:block',
          )}
        >
          <div className="flex h-[60px] items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              aria-label="Mở menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl hover:bg-muted lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link href="/" className="flex shrink-0 items-center gap-2 lg:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <BookHeart className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold sm:text-sm">
                Yearbook Websites
              </span>
            </Link>

            <div className="relative ml-auto hidden w-full max-w-md sm:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                aria-label="Tìm kiếm"
                placeholder="Tìm kiếm kỷ yếu, bạn bè..."
                className="h-9 w-full rounded-full border border-border/70 bg-muted/30 pl-9 pr-4 text-xs outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    const value = event.currentTarget.value.trim();
                    if (value) {
                      window.location.href = `/yearbooks/mine?q=${encodeURIComponent(value)}`;
                    }
                  }
                }}
              />
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-1 sm:ml-2">
              <MessagesIcon />

              <button
                type="button"
                aria-label="Thông báo"
                onClick={() => {
                  // Chưa thay đổi hệ thống thông báo hiện có.
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Bell className="h-[18px] w-[18px]" />
              </button>

              <Show when="signed-out">
                <Link
                  href="/sign-in"
                  className="flex items-center gap-2 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 sm:px-4"
                >
                  <LogIn className="h-4 w-4" />
                  <span className="hidden sm:inline">Đăng nhập</span>
                </Link>
              </Show>

              <Show when="signed-in">
                <UserMenu />
              </Show>
            </div>
          </div>

          <div className="px-4 pb-3 sm:hidden">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                aria-label="Tìm kiếm"
                placeholder="Tìm kiếm kỷ yếu, bạn bè..."
                className="h-9 w-full rounded-full border border-border/70 bg-muted/30 pl-9 pr-4 text-xs outline-none focus:border-primary/50"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    const value = event.currentTarget.value.trim();
                    if (value) {
                      window.location.href = `/yearbooks/mine?q=${encodeURIComponent(value)}`;
                    }
                  }
                }}
              />
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-60px)]">{children}</main>

        <footer
          className={cn(
            'border-t border-border/60 px-5 py-5',
            isMessagesPage && 'hidden md:block',
          )}
        >
          <div className="flex flex-col items-center justify-between gap-2 text-center text-xs text-muted-foreground sm:flex-row sm:text-left">
            <p className="font-semibold text-foreground">Yearbook Websites</p>
            <p className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Cùng nhau tạo nên những kỷ niệm đẹp!
            </p>
          </div>
        </footer>
      </div>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            aria-label="Đóng menu"
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setMobileOpen(false)}
          />

          <aside className="absolute inset-y-0 left-0 flex w-[min(290px,85vw)] flex-col border-r border-border bg-background shadow-2xl">
            <div className="flex h-[68px] items-center justify-between border-b border-border/70 px-4">
              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <BookHeart className="h-5 w-5" />
                </div>
                <span className="text-sm font-bold">Yearbook Websites</span>
              </Link>

              <button
                type="button"
                aria-label="Đóng menu"
                onClick={() => setMobileOpen(false)}
                className="rounded-xl p-2 hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-3">
              <NavigationGroup
                links={NAV_MAIN}
                location={location}
                closeMenu={() => setMobileOpen(false)}
              />
              <NavigationGroup
                title="Khám phá"
                links={NAV_DISCOVER}
                location={location}
                closeMenu={() => setMobileOpen(false)}
              />
            </nav>

            <Show when="signed-in">
              <div className="border-t border-border/70 p-3">
                <Link
                  href="/profile"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 rounded-xl p-2 hover:bg-muted"
                >
                  {user?.imageUrl ? (
                    <img
                      src={user.imageUrl}
                      alt="Ảnh đại diện"
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  ) : (
                    <AvatarGradient
                      name={user?.fullName || 'Tài khoản'}
                      className="h-9 w-9"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {user?.firstName || user?.fullName || 'Tài khoản'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Hồ sơ cá nhân
                    </p>
                  </div>
                </Link>
              </div>
            </Show>
          </aside>
        </div>
      )}

      <Show when="signed-in">
        {!isMessagesPage && <AiChatWidget />}
      </Show>
    </div>
  );
}
