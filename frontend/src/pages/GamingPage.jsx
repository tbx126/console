import { useRef, useState } from 'react';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import GamingStats from '../components/gaming/GamingStats';
import GameList from '../components/gaming/GameList';
import GameDetail from '../components/gaming/GameDetail';

const GamingPage = () => {
  const [selectedGame, setSelectedGame] = useState(null);
  const detailCacheRef = useRef({});

  return (
    <div className="page">
      <PageHeader eyebrow="Game library" title="游戏" description="Steam 游戏库、游玩时长与成就。" />

      <div className="mb-5">
        <GamingStats refresh={0} />
      </div>

      <Card className="p-6">
        <GameList refresh={0} onGameSelect={setSelectedGame} />
      </Card>

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
