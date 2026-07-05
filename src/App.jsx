import { useEffect, useState } from 'react';
import Header from './components/Header.jsx';
import Hero from './components/Hero.jsx';
import HowItWorks from './components/HowItWorks.jsx';
import Benefits from './components/Benefits.jsx';
import Contact from './components/Contact.jsx';
import Footer from './components/Footer.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';

function getCurrentRoute() {
  if (typeof window === 'undefined') return 'home';

  const hashRoute = window.location.hash.replace(/^#/, '');
  const directAdminPath = window.location.pathname.replace(/\/$/, '').endsWith('/admin');

  return hashRoute === '/admin' || directAdminPath ? 'admin' : 'home';
}

export default function App() {
  const [route, setRoute] = useState(getCurrentRoute);

  useEffect(() => {
    const handleRouteChange = () => setRoute(getCurrentRoute());

    window.addEventListener('hashchange', handleRouteChange);
    window.addEventListener('popstate', handleRouteChange);

    return () => {
      window.removeEventListener('hashchange', handleRouteChange);
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  return (
    <>
      <Header />
      {route === 'admin' ? (
        <AdminDashboard />
      ) : (
        <main>
          <Hero />
          <HowItWorks />
          <Benefits />
          <Contact />
        </main>
      )}
      <Footer />
    </>
  );
}
