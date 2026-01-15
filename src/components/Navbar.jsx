import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
  const location = useLocation();

  const navStyle = {
    height: '60px',
    backgroundColor: '#9C3A32',
    color: '#F8F1DC',
    display: 'flex',
    alignItems: 'center',
    padding: '0 20px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
    zIndex: 1000,
    position: 'relative',
    fontFamily: 'Gladolia, system-ui, sans-serif'
  };

  const linkStyle = (isActive) => ({
    color: isActive ? '#D1CCB9' : '#F8F1DC',
    textDecoration: 'none',
    marginRight: '20px',
    fontWeight: isActive ? 'bold' : 'normal',
    fontSize: '18px',
    transition: 'color 0.3s'
  });

  return (
    <nav style={navStyle}>
      <h2 style={{ margin: '0 40px 0 0', color: '#F8F1DC' }}>StreetArtView</h2>
      
      <div className="nav-links">
        <Link to="/map" style={linkStyle(location.pathname === '/map')}>
          Map
        </Link>
        
        <Link to="/profile" style={linkStyle(location.pathname === '/profile')}>
          Profile
        </Link>

        <Link to="/insights" style={linkStyle(location.pathname === '/insights')}>
          Insights
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
