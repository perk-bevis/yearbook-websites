import { useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { ClerkProvider, SignIn, SignUp, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { Layout } from '@/components/layout';

import Home from '@/pages/home';
import Students from '@/pages/students';
import StudentDetail from '@/pages/student-detail';
import Gallery from '@/pages/gallery';
import Memories from '@/pages/memories';
import Events from '@/pages/events';
import Teachers from '@/pages/teachers';
import Frames from '@/pages/frames';
import Admin from '@/pages/admin';
import Feed from '@/pages/feed';
import Profile from '@/pages/profile';
import PublicProfile from '@/pages/public-profile';
import Subscribe from '@/pages/subscribe';
import Onboarding from '@/pages/onboarding';
import RoleSelect from '@/pages/role-select';
import Messages from '@/pages/messages';
import Friends from '@/pages/friends';
import NotFound from '@/pages/not-found';

// ── Clerk config ─────────────────────────────────────────────────────────────
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

if (!clerkPubKey) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY');

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk' as const,
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: 'hsl(9, 85%, 62%)',
    colorForeground: 'hsl(20, 20%, 20%)',
    colorMutedForeground: 'hsl(25, 15%, 45%)',
    colorDanger: 'hsl(0, 84%, 60%)',
    colorBackground: 'hsl(0, 0%, 100%)',
    colorInput: 'hsl(40, 15%, 93%)',
    colorInputForeground: 'hsl(20, 20%, 20%)',
    colorNeutral: 'hsl(40, 15%, 80%)',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    borderRadius: '0.75rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-lg',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'font-bold text-foreground',
    headerSubtitle: 'text-muted-foreground',
    socialButtonsBlockButtonText: 'text-foreground font-medium',
    formFieldLabel: 'text-foreground font-medium',
    footerActionLink: 'text-primary font-semibold hover:text-primary/80',
    footerActionText: 'text-muted-foreground',
    dividerText: 'text-muted-foreground',
    identityPreviewEditButton: 'text-primary',
    formFieldSuccessText: 'text-green-600',
    alertText: 'text-foreground',
    logoBox: 'mb-2',
    logoImage: 'w-14 h-14',
    socialButtonsBlockButton: 'border border-border bg-card hover:bg-muted transition-colors',
    formButtonPrimary: 'bg-primary text-white hover:bg-primary/90 transition-colors font-semibold',
    formFieldInput: 'border border-input bg-muted/50 text-foreground focus:ring-2 focus:ring-primary',
    footerAction: 'bg-muted/30',
    dividerLine: 'bg-border',
    alert: 'border border-destructive/20 bg-destructive/5',
    otpCodeFieldInput: 'border border-input bg-muted/50',
  },
};

// ── Query client ──────────────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, staleTime: 5 * 60 * 1000 } },
});

// ── UserSync: call /api/auth/sync on sign-in, redirect to role-select if needed ─
function UserSync() {
  const { user } = useClerk();
  const syncedUserId = useRef<string | null>(null);
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!user) {
      syncedUserId.current = null;
      queryClient.clear();
      return;
    }
    if (syncedUserId.current === user.id) return;
    syncedUserId.current = user.id;
    fetch(`${basePath}/api/auth/sync`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.primaryEmailAddress?.emailAddress, full_name: user.fullName }),
    })
      .then(r => r.json())
      .then(data => {
        // If role not set yet, redirect to role selection
        if (data && (data.role === 'unknown' || !data.role)) {
          setLocation('/chon-vai-tro');
        }
      })
      .catch(() => {});
  }, [user, queryClient, setLocation]);

  return null;
}

// ── Router ────────────────────────────────────────────────────────────────────
function Router() {
  return (
    <Switch>
      {/* Clerk auth pages (outside Layout) — match both exact and sub-paths */}
      <Route path="/sign-in">
        <div className="min-h-[100dvh] flex items-center justify-center bg-muted/20 px-4 py-12">
          <SignIn routing="path" path={`${basePath}/sign-in`} />
        </div>
      </Route>
      <Route path="/sign-in/:rest*">
        <div className="min-h-[100dvh] flex items-center justify-center bg-muted/20 px-4 py-12">
          <SignIn routing="path" path={`${basePath}/sign-in`} />
        </div>
      </Route>
      <Route path="/sign-up">
        <div className="min-h-[100dvh] flex items-center justify-center bg-muted/20 px-4 py-12">
          <SignUp routing="path" path={`${basePath}/sign-up`} />
        </div>
      </Route>
      <Route path="/sign-up/:rest*">
        <div className="min-h-[100dvh] flex items-center justify-center bg-muted/20 px-4 py-12">
          <SignUp routing="path" path={`${basePath}/sign-up`} />
        </div>
      </Route>

      {/* Main app (inside Layout) */}
      <Route>
        <Layout>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/students/:id" component={StudentDetail} />
            <Route path="/students" component={Students} />
            <Route path="/gallery" component={Gallery} />
            <Route path="/memories" component={Memories} />
            <Route path="/events" component={Events} />
            <Route path="/teachers" component={Teachers} />
            <Route path="/frames" component={Frames} />
            <Route path="/feed" component={Feed} />
            <Route path="/ban-be" component={Friends} />
            <Route path="/profile" component={Profile} />
            <Route path="/profile/:userId" component={PublicProfile} />
            <Route path="/subscribe" component={Subscribe} />
            <Route path="/onboarding" component={Onboarding} />
            <Route path="/chon-vai-tro" component={RoleSelect} />
            <Route path="/tin-nhan/nhom/:groupId" component={Messages} />
            <Route path="/tin-nhan/:partnerId" component={Messages} />
            <Route path="/tin-nhan" component={Messages} />
            {/* Admin at a hidden path — not linked in nav */}
            <Route path="/quan-tri-admin" component={Admin} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: 'Chào mừng trở lại', subtitle: 'Đăng nhập vào tài khoản của bạn' } },
        signUp: { start: { title: 'Tạo tài khoản', subtitle: 'Bắt đầu lưu giữ kỷ niệm học trò' } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <UserSync />
          <Router />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}
