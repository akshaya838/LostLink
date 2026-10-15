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
          <Link to="/" className="brand">
            <span className="logo">LL</span> LostLink
          </Link>
          <nav>
            <NavLink to="/" end>Browse</NavLink>
            <NavLink to="/report">Report Item</NavLink>
            <NavLink to="/claims">Claims</NavLink>
            <NavLink to="/status">System</NavLink>
          </nav>
        </div>
      </header>

      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/report" element={<ReportItem />} />
          <Route path="/items/:id" element={<ItemDetail />} />
          <Route path="/items/:id/edit" element={<ReportItem />} />
          <Route path="/claims" element={<ClaimsDashboard />} />
          <Route path="/status" element={<Status />} />
          <Route path="*" element={<p className="empty">Page not found. <Link to="/">Go home</Link></p>} />
        </Routes>
      </main>

      <footer className="footer">LostLink · Campus Lost &amp; Found · Microservices on Render + Vercel</footer>
    </>
  );
}
