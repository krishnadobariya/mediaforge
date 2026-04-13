import { useState, useEffect } from 'react';
import api from '../utils/api';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { 
  History, 
  TrendingUp, 
  Clock, 
  FileCheck, 
  Download,
  ExternalLink
} from 'lucide-react';
import './Dashboard.css';

const StatCard = ({ icon: Icon, label, value, colorClass }) => (
  <div className="glass-card stat-card">
    <div className={`stat-icon-wrapper ${colorClass}`}>
      <Icon size={24} />
    </div>
    <div className="stat-info">
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
    </div>
  </div>
);

const Dashboard = () => {
  const { user } = useAuthStore();
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState({
    totalJobs: 0,
    activeJobs: 0,
    completedJobs: 0,
    storageUsed: '0 B'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [jobsRes, statsRes] = await Promise.all([
          api.get('/jobs'),
          api.get('/jobs/stats')
        ]);
        setJobs(jobsRes.data.jobs);
        setStats(statsRes.data.stats);
      } catch (error) {
        console.error('Failed to fetch dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getStatusClass = (status) => {
    switch (status) {
      case 'completed': return 'status-completed';
      case 'processing': return 'status-processing';
      case 'failed': return 'status-failed';
      default: return 'status-pending';
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-text">
          <h1 className="dashboard-title">Workspace</h1>
          <p className="dashboard-subtitle">Manage your processing tasks and history.</p>
        </div>
        <div className="header-meta">
          <div className="glass plan-badge">
            <TrendingUp size={18} className="icon-indigo" />
            <span className="plan-text">Plan: <span className="plan-type">{user.plan}</span></span>
          </div>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard 
          icon={TrendingUp} 
          label="Total Jobs" 
          value={stats.totalJobs} 
          colorClass="icon-bg-indigo" 
        />
        <StatCard 
          icon={FileCheck} 
          label="Active Jobs" 
          value={stats.activeJobs} 
          colorClass="icon-bg-yellow" 
        />
        <StatCard 
          icon={Download} 
          label="Outputs Ready" 
          value={stats.completedJobs} 
          colorClass="icon-bg-green" 
        />
        <StatCard 
          icon={Clock} 
          label="Storage Used" 
          value={stats.storageUsed} 
          colorClass="icon-bg-purple" 
        />
      </div>

      {/* Recent Activity */}
      <div className="glass-card activity-card">
        <div className="card-header">
          <div className="header-left">
            <History size={20} className="icon-muted" />
            <h2 className="card-title">Recent Activity</h2>
          </div>
          <button className="view-all-btn">View All</button>
        </div>
        
        <div className="table-responsive">
          <table className="jobs-table">
            <thead>
              <tr>
                <th>File / Type</th>
                <th>Operation</th>
                <th>Status</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length > 0 ? jobs.map((job) => (
                <tr key={job._id}>
                  <td>
                    <div className="file-info">
                      <div className="type-badge">
                        {job.type[0].toUpperCase()}
                      </div>
                      <span className="file-name">{job.inputPath}</span>
                    </div>
                  </td>
                  <td><span className="op-text">{job.operation}</span></td>
                  <td>
                    <span className={`status-badge ${getStatusClass(job.status)}`}>
                      {job.status}
                    </span>
                  </td>
                  <td><span className="date-text">{new Date(job.createdAt).toLocaleDateString()}</span></td>
                  <td>
                    {job.status === 'completed' && (
                      <a 
                        href={`${api.defaults.baseURL.replace('/api', '')}/uploads/${job.outputUrl}`} 
                        target="_blank"
                        rel="noreferrer"
                        className="download-link"
                      >
                        Download <ExternalLink size={14} />
                      </a>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="empty-state">
                    <p>No jobs found. Start by using one of our tools.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
