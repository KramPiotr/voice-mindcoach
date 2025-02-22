
import React from 'react';
import { Link } from 'react-router-dom';
import { Home, User, BookOpen, MessageSquare, Settings } from 'lucide-react';

const Sidebar = () => {
  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-secondary p-6 flex flex-col border-r border-muted">
      <div className="mb-8">
        <div className="h-12 w-12 bg-primary rounded-full mb-4"></div>
        <h2 className="text-xl font-semibold text-primary">AI Coach</h2>
      </div>
      
      <nav className="flex-1">
        <ul className="space-y-4">
          <li>
            <Link to="/" className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors p-2 rounded-lg hover:bg-muted">
              <Home size={20} />
              <span>Home</span>
            </Link>
          </li>
          <li>
            <Link to="/profile" className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors p-2 rounded-lg hover:bg-muted">
              <User size={20} />
              <span>My Profile</span>
            </Link>
          </li>
          <li>
            <Link to="/history" className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors p-2 rounded-lg hover:bg-muted">
              <BookOpen size={20} />
              <span>Session History</span>
            </Link>
          </li>
          <li>
            <Link to="/feedback" className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors p-2 rounded-lg hover:bg-muted">
              <MessageSquare size={20} />
              <span>Feedback</span>
            </Link>
          </li>
          <li>
            <Link to="/settings" className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors p-2 rounded-lg hover:bg-muted">
              <Settings size={20} />
              <span>Settings</span>
            </Link>
          </li>
        </ul>
      </nav>
      
      <button className="mt-auto w-full bg-primary text-white py-3 rounded-lg hover:bg-primary/90 transition-colors">
        Book a Call
      </button>
    </div>
  );
};

export default Sidebar;
