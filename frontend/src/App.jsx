import { Routes, Route, NavLink, Link } from 'react-router-dom';
import Home from './pages/Home.jsx';
import ReportItem from './pages/ReportItem.jsx';
import ItemDetail from './pages/ItemDetail.jsx';
import ClaimsDashboard from './pages/ClaimsDashboard.jsx';
import Status from './pages/Status.jsx';

export default function App() {
  return (
    <>
      <header className="nav">
        <div className="container nav-inner">
          <Link to="/" className="brand" aria-label="LostLink home">
            <span className="brand-mark" aria-hidden="true" />
            LostLink
          </Link>
          <nav aria-label="Main">
            <NavLink to="/" end>Board</NavLink>
            <NavLink to="/claims">Claims</NavLink>
            <NavLink to="/status">System</NavLink>
            <Link to="/report" className="btn btn-primary btn-sm nav-cta">Report an item</Link>
          </nav>
        </div>
      </header>

      <main className="container main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/report" element={<ReportItem />} />
          <Route path="/items/:id" element={<ItemDetail />} />
          <Route path="/items/:id/edit" element={<ReportItem />} />
          <Route path="/claims" element={<ClaimsDashboard />} />
          <Route path="/status" element={<Status />} />
          <Route
            path="*"
            element={
              <div className="empty">
                <h2>This page doesn't exist</h2>
                <Link to="/" className="btn">Back to the board</Link>
              </div>
            }
          />
        </Routes>
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <span>LostLink, the campus lost and found</span>
          <span>Item Service and Claim Service run as separate microservices</span>
        </div>
      </footer>
    </>
  );
}
