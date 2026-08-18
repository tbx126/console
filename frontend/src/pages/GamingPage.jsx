import { useRef, useState } from 'react';
import { Card } from '../components/ui/Card';
import GamingStats from '../components/gaming/GamingStats';
import GameList from '../components/gaming/GameList';
import GameDetail from '../components/gaming/GameDetail';

const GamingPage = () => {
  const [selectedGame, setSelectedGame] = useState(null);
  const detailCacheRef = useRef({});

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <div className="bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
        <div className="container mx-auto px-6 py-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Gaming
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Track your Steam games, playtime and achievements
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        <GamingStats refresh={0} />
      </div>

      <div className="container mx-auto px-6 pb-6">
        <Card className="shadow-sm p-6">
          <GameList refresh={0} onGameSelect={setSelectedGame} />
        </Card>
      </div>

      {selectedGame && (
        <GameDetail
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
          cacheRef={detailCacheRef}
        />
      )}
    </div>
  );
};

export default GamingPage;
