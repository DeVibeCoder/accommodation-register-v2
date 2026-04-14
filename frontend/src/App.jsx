import MealExclusion from './pages/MealExclusion';
import MealHistory from './pages/MealHistory';




import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Rooms from './pages/Rooms';
import Occupancy from './pages/Occupancy';
import StayHistory from './pages/StayHistory';
import MealEligibility from './pages/MealEligibility';
import Settings from './pages/Settings';
import PlaceholderPage from './pages/PlaceholderPage';

function App({ user, onLogout }) {
  return (
    <Routes>
      <Route path="/" element={<Layout user={user} onLogout={onLogout} />}>
        <Route index element={<Dashboard />} />
        <Route path="rooms" element={<Rooms />} />
        <Route path="occupancy" element={<Occupancy />} />
        <Route path="stay-history" element={<StayHistory />} />
        <Route path="meal-exclusion" element={<MealExclusion />} />
        <Route path="meal-history" element={<MealHistory />} />
        <Route path="meal" element={<MealEligibility />} />
        <Route path="settings" element={<Settings user={user} setUser={user => { if (typeof window !== 'undefined') localStorage.setItem('tic_user', JSON.stringify(user)); window.location.reload(); }} />} />
      </Route>
    </Routes>
  );
}

export default App;
