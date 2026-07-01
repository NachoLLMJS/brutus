import { createBrowserRouter, Outlet } from 'react-router-dom';
import { Landing } from '@/views/Landing';
import { CharacterCreator } from '@/views/CharacterCreator';
import { Profile } from '@/views/Profile';
import { Arena } from '@/views/Arena';
import { FightViewer } from '@/views/FightViewer';
import { Tournament } from '@/views/Tournament';
import { LevelUp } from '@/views/LevelUp';
import { Docs } from '@/views/Docs';
import { SymbolDebugger } from '@/views/SymbolDebugger';
import { BrutePartsViewer } from '@/views/BrutePartsViewer';
import { Topbar } from '@/components/Topbar';

function RootLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Topbar />
      <main className="flex-1 px-3 pb-12">
        <Outlet />
      </main>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <Landing /> },
      { path: '/create', element: <CharacterCreator /> },
      { path: '/brute/:id', element: <Profile /> },
      { path: '/brute/:id/arena', element: <Arena /> },
      { path: '/brute/:id/fight/:fid', element: <FightViewer /> },
      { path: '/brute/:id/tournament', element: <Tournament /> },
      { path: '/brute/:id/levelup', element: <LevelUp /> },
      { path: '/docs', element: <Docs /> },
      // Dev tool — sin link visible en la nav. Para identificar Symbols
      // del fork brutus-fla-parser cuando se reskinea sprites.
      { path: '/debug/symbols', element: <SymbolDebugger /> },
      { path: '/debug/brute-parts', element: <BrutePartsViewer /> },
    ],
  },
]);
