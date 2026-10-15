import { Routes, Route, NavLink, Link, useNavigate } from 'react-router-dom';
import Home from './pages/Home.jsx';
import ReportItem from './pages/ReportItem.jsx';
import ItemDetail from './pages/ItemDetail.jsx';
import ClaimsDashboard from './pages/ClaimsDashboard.jsx';
import MyClaims from './pages/MyClaims.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Status from './pages/Status.jsx';
import { RequireAuth, useAuth } from './auth.jsx';

function Nav() {
  const { user, isAdmin, isStudent, logout } = useAuth();
  const navigate = useNavigate();

  function signOut() {
    logout();
    navigate('/');
  }

  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link to="/" className="brand" aria-label="LostLink home">
          <span className="brand-mark" aria-hidden="true" />
          LostLink
          {isAdmin && <span className="brand-role">Admin desk</span>}
        </Link>
        <nav aria-label="Main">
          <NavLink to="/" end>Board</NavLink>
          {isStudent && <NavLink to="/my-claims">My claims</NavLink>}
          {isAdmin && <NavLink to="/claims">Claims desk</NavLink>}
          {isAdmin && <NavLink to="/status">System</NavLink>}
          {user ? (
            <>
              {isStudent && <span className="who" title={user.email}>{user.name.split(' ')[0]}</span>}
              <button className="nav-link-btn" onClick={signOut}>Log out</button>
            </>
          ) : (
            <NavLink to="/login">Log in</NavLink>
          )}
          {!isAdmin && <Link to="/report" className="btn btn-primary btn-sm nav-cta">Report an item</Link>}
        </nav>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <>
      <Nav />
      <main className="container main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<Login forceAdmin />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/items/:id" element={<ItemDetail />} />
          <Route path="/report" element={<RequireAuth><ReportItem /></RequireAuth>} />
          <Route path="/items/:id/edit" element={<RequireAuth><ReportItem /></RequireAuth>} />
          <Route path="/my-claims" element={<RequireAuth role="student"><MyClaims /></RequireAuth>} />
          <Route path="/claims" element={<RequireAuth role="admin"><ClaimsDashboard /></RequireAuth>} />
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
          <span className="footer-links">
            <Link to="/status">System status</Link>
            <Link to="/admin">Admin desk login</Link>
          </span>
        </div>
      </footer>
    </>
  );
}
