export const formatHours = (minutes = 0) => (minutes < 60 ? `${minutes} 分钟` : `${Math.round(minutes / 60).toLocaleString('zh-CN')} 小时`);
export const lastPlayed = (game) => (game.rtime_last_played ? new Date(game.rtime_last_played * 1000).toISOString().slice(0, 10) : null);
