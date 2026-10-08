import { useParams } from 'react-router-dom';
import PortfolioDashboard from '../features/portfolio/PortfolioDashboard';

export default function PortfolioPage() {
  const { view } = useParams();
  return <PortfolioDashboard view={view === 'insights' ? 'insights' : 'holdings'} />;
}
