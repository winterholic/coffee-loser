import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import GameLayout from './components/layout/GameLayout';
import RaceGame from './pages/games/RaceGame';
import LadderGame from './pages/games/LadderGame';
import PenaltyPicker from './pages/games/PenaltyPicker';
import TeamDivider from './pages/games/TeamDivider';
import DartGame from './pages/games/DartGame';

function App() {
    return (
        <Router>
            <div className="app-container">
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/game" element={<GameLayout />}>
                        <Route index element={<Navigate to="race" replace />} />
                        <Route path="race" element={<RaceGame />} />
                        <Route path="ladder" element={<LadderGame />} />
                        <Route path="penalty" element={<PenaltyPicker />} />
                        <Route path="team" element={<TeamDivider />} />
                        <Route path="dart" element={<DartGame />} />
                    </Route>
                </Routes>
            </div>
        </Router>
    );
}

export default App;
