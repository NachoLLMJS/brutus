import { createBrowserRouter } from 'react-router-dom';
import { Landing } from '@/views/Landing';
import { CharacterCreator } from '@/views/CharacterCreator';
import { Profile } from '@/views/Profile';
import { Arena } from '@/views/Arena';
import { FightViewer } from '@/views/FightViewer';
import { Tournament } from '@/views/Tournament';
import { LevelUp } from '@/views/LevelUp';

export const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  { path: '/create', element: <CharacterCreator /> },
  { path: '/brute/:id', element: <Profile /> },
  { path: '/brute/:id/arena', element: <Arena /> },
  { path: '/brute/:id/fight/:fid', element: <FightViewer /> },
  { path: '/brute/:id/tournament', element: <Tournament /> },
  { path: '/brute/:id/levelup', element: <LevelUp /> },
]);
