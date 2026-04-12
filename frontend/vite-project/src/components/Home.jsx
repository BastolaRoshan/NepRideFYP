import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Users, Gauge, Fuel, LogIn, LoaderCircle, RefreshCcw, ShieldCheck, Mail, Phone } from 'lucide-react';
import '../styles/Home.css';

const Home = () => {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [vehicleError, setVehicleError] = useState('');

  const handleLogin = () => navigate('/login');
  const scrollToSection = (sectionId) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchVehicles = async () => {
    try {
      setLoadingVehicles(true);
      setVehicleError('');

      const response = await fetch('/api/vehicles?limit=6', {
        method: 'GET',
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to load vehicle listings.');
      }

      setVehicles(Array.isArray(data.vehicles) ? data.vehicles : []);
    } catch (error) {
      setVehicleError(error.message || 'Unable to load vehicle listings.');
    } finally {
      setLoadingVehicles(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  return (
    <div className="home-container">
      <header className="home-header">
        <div className="logo-placeholder">NepRide</div>
        <button className="btn-login-gold" onClick={handleLogin}>
          <LogIn size={18} /> Login
        </button>
      </header>

      <section className="hero-section">
        <h1 className="hero-title">
          Drive the <span className="text-accent">Extraordinary</span>
        </h1>
        <div className="hero-buttons">
          <button
            className="btn-primary-accent"
            onClick={() => scrollToSection('fleet-section')}
          >
            View Collection <ArrowRight size={20} />
          </button>
          <button
            className="btn-secondary-accent"
            onClick={() => scrollToSection('public-about-section')}
          >
            About Us
          </button>
          <button
            className="btn-secondary-accent"
            onClick={() => scrollToSection('public-contact-section')}
          >
            Contact Us
          </button>
        </div>
      </section>

      <section className="landing-panels">
        <article className="landing-panel">
          <div className="landing-panel-icon">
            <ShieldCheck size={18} />
          </div>
          <h2>Vehicles</h2>
          <p>Browse live vendor listings, compare features, and reserve the right ride when you are ready.</p>
          <button className="landing-panel-link" onClick={() => scrollToSection('fleet-section')}>
            Explore Vehicles <ArrowRight size={16} />
          </button>
        </article>

        <article className="landing-panel">
          <div className="landing-panel-icon">
            <Users size={18} />
          </div>
          <h2>About Us</h2>
          <p>NepRide is built around verified vendors, clear booking flow, and a clean experience for customers and vendors.</p>
          <button className="landing-panel-link" onClick={() => scrollToSection('public-about-section')}>
            Learn More <ArrowRight size={16} />
          </button>
        </article>

        <article className="landing-panel">
          <div className="landing-panel-icon">
            <Mail size={18} />
          </div>
          <h2>Contact Us</h2>
          <p>Need help with booking, verification, or vendor support? Reach out through the contact page or call us directly.</p>
          <div className="landing-panel-actions">
            <button className="landing-panel-link" onClick={() => scrollToSection('public-contact-section')}>
              Contact Details <ArrowRight size={16} />
            </button>
            <a className="landing-panel-call" href="tel:9816622940">
              <Phone size={16} /> Call Support
            </a>
          </div>
        </article>
      </section>

      <section id="public-about-section" className="landing-panels landing-panels-single">
        <article className="landing-panel landing-panel-wide">
          <div className="landing-panel-icon">
            <Users size={18} />
          </div>
          <h2>About NepRide</h2>
          <p>
            NepRide helps customers find verified vehicles, compare listings quickly, and book with confidence through a clean rental experience.
            We keep the flow simple for riders and practical for vendors, with transparent details and a focused booking process.
          </p>
        </article>
      </section>

      <section id="public-contact-section" className="landing-panels landing-panels-single">
        <article className="landing-panel landing-panel-wide">
          <div className="landing-panel-icon">
            <Mail size={18} />
          </div>
          <h2>Contact NepRide</h2>
          <p>
            Email: roshanbastola02@gmail.com
          </p>
          <p style={{ marginTop: '0.5rem' }}>
            Phone: 9816622940
          </p>
          <div className="landing-panel-actions">
            <a className="landing-panel-call" href="mailto:roshanbastola02@gmail.com">
              <Mail size={16} /> Email Support
            </a>
            <a className="landing-panel-call" href="tel:9816622940">
              <Phone size={16} /> Call Support
            </a>
          </div>
        </article>
      </section>

      <section id="fleet-section" className="fleet-section">
        <div className="fleet-header">
          <div className="fleet-title-container">
            <h2 className="fleet-title">
              Our <span className="text-accent">Fleet</span>
            </h2>
            <p className="fleet-subtitle">
              Live vendor listings appear here automatically, so customers can browse the newest rides right away.
            </p>
          </div>
          <div className="fleet-meta">
            <span className="fleet-count">{vehicles.length} live listing{vehicles.length === 1 ? '' : 's'}</span>
          </div>
        </div>

        {loadingVehicles ? (
          <div className="fleet-status-card">
            <LoaderCircle className="fleet-status-icon fleet-status-spin" />
            <p>Loading live vehicle listings...</p>
          </div>
        ) : vehicleError ? (
          <div className="fleet-status-card fleet-status-error">
            <p>{vehicleError}</p>
            <button className="btn-secondary-accent fleet-retry-btn" onClick={fetchVehicles}>
              <RefreshCcw size={16} /> Try Again
            </button>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="fleet-status-card">
            <p>No vendor vehicles have been listed yet.</p>
            <p className="fleet-status-copy">Vendors can add vehicles from their dashboard, and customers will see them here immediately.</p>
          </div>
        ) : (
          <div className="fleet-grid">
            {vehicles.map((vehicle) => {
              const title = vehicle.title || vehicle.name;
              const seats = vehicle.seatCapacity ?? vehicle.seats;
              const fuel = vehicle.fuelType || vehicle.fuel;
              const speedOrModel = vehicle.speed ? `${vehicle.speed} kmph` : vehicle.model || 'Model details';

              return (
                <div key={vehicle._id} className="vehicle-card">
                  <div className="vehicle-image-container">
                    <img src={vehicle.image} alt={title} />
                  </div>

                  <div className="vehicle-info">
                    <h3 className="vehicle-name">{title}</h3>
                    <p className="vehicle-overview">{vehicle.overview}</p>

                    <div className="vehicle-specs">
                      <div className="spec-item">
                        <Users />
                        <span>{seats} Seats</span>
                      </div>
                      <div className="spec-divider"></div>
                      <div className="spec-item">
                        <Gauge />
                        <span>{speedOrModel}</span>
                      </div>
                      <div className="spec-divider"></div>
                      <div className="spec-item">
                        <Fuel />
                        <span>{fuel}</span>
                      </div>
                    </div>

                    <div className="vehicle-footer">
                      <div>
                        <p className="vehicle-price-label">Price per day</p>
                        <p className="vehicle-price-value">Rs. {Number(vehicle.pricePerDay || 0).toLocaleString()} / day</p>
                        <p className="vehicle-vendor">Listed by {vehicle.vendor?.name || 'NepRide Vendor'}</p>
                      </div>

                      <button className="btn-reserve" onClick={handleLogin}>
                        Reserve Now <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default Home;
