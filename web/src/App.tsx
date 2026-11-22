import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { APIProvider } from '@vis.gl/react-google-maps';
import { DataProvider } from './lib/data';
import { ListsProvider } from './lib/shortlist';
import { MAPS_KEY } from './lib/maps';
import { Empty, Footer, Header } from './components/ui';
import Home from './pages/Home';

const Search = lazy(() => import('./pages/Search'));
const ProjectPage = lazy(() => import('./pages/ProjectPage'));
const Compare = lazy(() => import('./pages/Compare'));
const Resale = lazy(() => import('./pages/Resale'));
const About = lazy(() => import('./pages/About'));
const Shortlist = lazy(() => import('./pages/Lists').then((m) => ({ default: m.Shortlist })));
const Builders = lazy(() => import('./pages/Lists').then((m) => ({ default: m.Builders })));
const BuilderPage = lazy(() => import('./pages/Lists').then((m) => ({ default: m.BuilderPage })));

function Maps({ children }: { children: ReactNode }) {
  if (!MAPS_KEY) return <>{children}</>;
  return (
    <APIProvider apiKey={MAPS_KEY} region="IN" language="en-IN">
      {children}
    </APIProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <DataProvider>
        <ListsProvider>
          <Maps>
            <a href="#main" className="skip-link">Skip to content</a>
            <Header />
            <div id="main">
              <Suspense fallback={<div className="wrap section"><div className="skeleton" style={{ height: 240 }} /></div>}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/new" element={<Search />} />
                  <Route path="/project/:id" element={<ProjectPage />} />
                  <Route path="/compare" element={<Compare />} />
                  <Route path="/resale" element={<Resale />} />
                  <Route path="/shortlist" element={<Shortlist />} />
                  <Route path="/builders" element={<Builders />} />
                  <Route path="/builders/:key" element={<BuilderPage />} />
                  <Route path="/about" element={<About />} />
                  <Route path="*" element={<div className="wrap section"><Empty title="Page not found"><Link to="/">Go home</Link></Empty></div>} />
                </Routes>
              </Suspense>
            </div>
            <Footer />
          </Maps>
        </ListsProvider>
      </DataProvider>
    </BrowserRouter>
  );
}
