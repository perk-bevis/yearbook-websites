import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';
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
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/students" component={Students} />
        <Route path="/students/:id" component={StudentDetail} />
        <Route path="/gallery" component={Gallery} />
        <Route path="/memories" component={Memories} />
        <Route path="/events" component={Events} />
        <Route path="/teachers" component={Teachers} />
        <Route path="/frames" component={Frames} />
        <Route path="/admin" component={Admin} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
