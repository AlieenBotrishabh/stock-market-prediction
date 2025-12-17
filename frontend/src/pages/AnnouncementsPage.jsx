import React, { useState, useEffect } from 'react';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import { Bell, Calendar, AlertCircle } from 'lucide-react';

const AnnouncementsPage = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/indian/announcements');
        const result = await response.json();
        // Handle both array and object responses
        const announcementsData = Array.isArray(result.data) ? result.data : result.data?.announcements || [];
        setAnnouncements(announcementsData);
      } catch (error) {
        console.error('Error fetching announcements:', error);
        setAnnouncements([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  const getAnnouncementIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'dividend':
        return '💰';
      case 'split':
        return '📊';
      case 'bonus':
        return '🎁';
      case 'rights':
        return '📜';
      default:
        return '📢';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark to-primary-light">
      <Navigation isOpen={navOpen} setIsOpen={setNavOpen} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="gradient-text text-5xl md:text-6xl font-bold mb-4">Announcements</h1>
          <p className="text-text-secondary text-lg max-w-2xl">
            Latest corporate announcements and market updates
          </p>
        </div>

        {/* Announcements List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-accent-green text-xl font-semibold">Loading announcements...</div>
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-text-secondary text-lg">No announcements available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement, idx) => (
              <div
                key={idx}
                className="glass-effect p-6 rounded-xl border border-border-color hover:border-accent-green transition"
              >
                <div className="flex items-start gap-4">
                  <div className="text-3xl mt-1">{getAnnouncementIcon(announcement.type)}</div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-xl font-bold text-white">{announcement.symbol}</h3>
                        <p className="text-text-secondary text-sm">{announcement.company}</p>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-accent-green text-primary-dark capitalize">
                        {announcement.type}
                      </span>
                    </div>

                    <p className="text-white mb-4">{announcement.title}</p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-text-secondary">
                        <Calendar size={16} />
                        {new Date(announcement.date).toLocaleDateString()}
                      </div>
                      {announcement.details && (
                        <p className="text-accent-green text-sm font-semibold">{announcement.details}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default AnnouncementsPage;
