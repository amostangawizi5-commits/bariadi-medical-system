import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { apiClient } from '../config/apiConfig';
import '../styles/Dashboard.css';

// Navigate helper for filtering
const navigateWithStatus = (navigate, status) => {
    navigate('/admin/employees', { state: { filterStatus: status } });
};

// Import components (tutaunda baadaye)
import EmployeeList from '../components/employees/EmployeeList';
import EmployeeForm from '../components/employees/EmployeeForm';
import PaymentManagement from '../components/payments/PaymentManagement';
import Reports from '../components/reports/Reports';
import Settings from '../components/settings/Settings';
import logo from '../components/logo.png';

const AdminDashboard = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        total_employees: 0,
        active: 0,
        pending: 0,
        expired: 0
    });
    const [recentEmployees, setRecentEmployees] = useState([]);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }
        fetchUserData();
        fetchStats();
        fetchRecentEmployees();
    }, []);

    useEffect(() => {
        setSidebarOpen(false);
    }, [location.pathname]);

    const fetchUserData = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(apiClient.endpoints.auth.me, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUser(response.data.user);
        } catch (error) {
            console.error('Error fetching user:', error);
            localStorage.removeItem('token');
            navigate('/login');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(apiClient.endpoints.reports.summary, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStats(response.data.summary);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const fetchRecentEmployees = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(apiClient.endpoints.employees.list, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRecentEmployees(response.data.employees || []);
        } catch (error) {
            console.error('Error fetching employees:', error);
        }
    };

    const navItems = [
        { to: '/admin/dashboard', label: 'Certificates', end: true },
        { to: '/admin/employees', label: 'Patients' },
        { to: '/admin/payments', label: 'Payments' },
        { to: '/admin/reports', label: 'Reports' },
        { to: '/admin/settings', label: 'Settings' }
    ];

    const today = new Date().toLocaleDateString('en-GB', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });

                if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <div className="dashboard-container afya-dashboard-shell">
            <button
                type="button"
                className="mobile-sidebar-toggle"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
                aria-expanded={sidebarOpen}
            >
                <span></span>
                <span></span>
                <span></span>
            </button>

            <button
                type="button"
                className={`sidebar-backdrop${sidebarOpen ? ' open' : ''}`}
                onClick={() => setSidebarOpen(false)}
                aria-label="Close menu"
            ></button>

            <aside className={`afya-sidebar${sidebarOpen ? ' open' : ''}`} aria-label="Admin navigation">
                <Link to="/admin/dashboard" className="afya-sidebar-brand" onClick={() => setSidebarOpen(false)}>
                    <img src={logo} alt="Bariadi District Health" />
                    <span>
                        <strong>AFYA</strong>
                        <small>Bariadi District</small>
                    </span>
                </Link>

                <nav className="afya-sidebar-nav">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            onClick={() => setSidebarOpen(false)}
                            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                        >
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="afya-sidebar-footer">
                    <div className="afya-command-status">
                        <span><span className="pulse-dot"></span> Online</span>
                    </div>
                </div>
            </aside>

            <section className="afya-workspace">
                <header className="afya-command-header">
                    <div className="afya-command-top">
                        <div>
                            <div className="afya-district">Bariadi District Health</div>
                            <div className="afya-command-status">
                                <span><span className="pulse-dot"></span> Online</span>
                                <time>{today}</time>
                            </div>
                        </div>
                        <div className="afya-user-strip">
                            <div className="topbar-user">
                                <span className={user?.profile_image ? 'topbar-avatar has-image' : 'topbar-avatar'}>
                                    {user?.profile_image ? (
                                        <img src={user.profile_image} alt={user?.full_name || 'Admin profile'} />
                                    ) : (
                                        user?.full_name?.charAt(0) || 'A'
                                    )}
                                </span>
                                <div>
                                    <strong>{user?.full_name || 'Health Officer'}</strong>
                                    <small>{user?.role || 'admin'}</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="main-content">
                    <Routes>
                        <Route path="/dashboard" element={
                            <DashboardHome 
                            stats={stats} 
                            recentEmployees={recentEmployees} 
                            user={user}
                        />
                        } />
                        <Route path="/employees" element={<EmployeeList />} />
                        <Route path="/employees/new" element={<EmployeeForm />} />
                        <Route path="/employees/:id/renew" element={<EmployeeForm mode="renew" />} />
                        <Route path="/employees/:id" element={<EmployeeForm />} />
                        <Route path="/payments" element={<PaymentManagement />} />
                        <Route path="/reports" element={<Reports />} />
                        <Route path="/settings" element={<Settings user={user} onUserUpdate={setUser} />} />
                        <Route path="*" element={<Navigate to="/admin/dashboard" />} />
                    </Routes>
                </div>
            </section>
        </div>
    );
};

// Dashboard Home Component
const DashboardHome = ({ stats, recentEmployees, user }) => {
    const [sendingId, setSendingId] = useState(null);
    const [sendingBulk, setSendingBulk] = useState(false);
    const [notice, setNotice] = useState('');
    const navigate = useNavigate();

    const sampleEmployees = [
        { id: 'sample-0041', full_name: 'John Mushi', email: 'john.mushi@example.com', employer_name: 'Bariadi Market', status: 'active', days_until_expiry: 25 },
        { id: 'sample-0042', full_name: 'Mary Shayo', email: 'mary.shayo@example.com', employer_name: 'Lake Foods', status: 'active', days_until_expiry: 18 },
        { id: 'sample-0043', full_name: 'Peter Lema', email: 'peter.lema@example.com', employer_name: 'Bariadi Butchery', status: 'pending', days_until_expiry: 5 },
        { id: 'sample-0044', full_name: 'Grace Mwita', email: 'grace.mwita@example.com', employer_name: 'Grace Salon', status: 'pending', days_until_expiry: 2 },
        { id: 'sample-0045', full_name: 'James Komba', email: 'james.komba@example.com', employer_name: 'James Canteen', status: 'active', days_until_expiry: 120 },
        { id: 'sample-0046', full_name: 'Anna Charles', email: 'anna.charles@example.com', employer_name: 'Anna Bakery', status: 'expired', days_until_expiry: 0 }
    ];
    const hasLiveEmployees = (recentEmployees || []).length > 0;
    const employees = hasLiveEmployees ? recentEmployees : sampleEmployees;
    const totalEmployees = hasLiveEmployees ? employees.length : (stats?.total_employees || 45);
    const activeEmployees = employees.length
        ? employees.filter((employee) => employee.status === 'active' && (employee.days_until_expiry ?? 0) > 30).length
        : stats?.active || 0;
    const expiringEmployees = employees.filter((employee) => {
        const days = employee.days_until_expiry ?? 999;
        return days > 0 && days <= 30;
    });
    const expiredEmployees = employees.filter((employee) => employee.status === 'expired' || (employee.days_until_expiry ?? 0) <= 0);
    const permitRows = employees.slice(0, 6);
    const expiryAlerts = employees
        .filter((employee) => {
            const days = employee.days_until_expiry ?? 999;
            return days > 0 && days <= 30;
        })
        .slice(0, 4);
    const selectedPermit = expiryAlerts.find((employee) => (employee.days_until_expiry ?? 31) <= 7)
        || expiryAlerts[0]
        || permitRows[0];
    const displayedActive = hasLiveEmployees ? activeEmployees : (stats?.active || 32);
    const activeRate = totalEmployees > 0 ? Math.round((displayedActive / totalEmployees) * 100) : 0;

    const statItems = [
        {
            label: 'Total',
            value: totalEmployees,
            tone: 'blue',
            icon: 'REG',
            meta: 'All certificates'
        },
        {
            label: 'Active',
            value: displayedActive,
            tone: 'green',
            icon: 'OK',
            meta: `${activeRate}% safe`
        },
        {
            label: 'Expiring',
            value: hasLiveEmployees ? expiringEmployees.length : (stats?.pending || 8),
            tone: 'amber',
            icon: '30',
            meta: 'Within 30 days'
        },
        {
            label: 'Expired',
            value: hasLiveEmployees ? expiredEmployees.length : (stats?.expired || 5),
            tone: 'neutral',
            icon: 'X',
            meta: 'Needs renewal'
        }
    ];

    const getPermitStatus = (employee) => {
        const days = employee.days_until_expiry ?? 0;
        if (employee.status === 'expired' || days <= 0) {
            return { label: 'Expired', tone: 'danger', dot: 'black' };
        }
        if (days <= 7) {
            return { label: 'Expiring soon', tone: 'danger', dot: 'yellow' };
        }
        if (days <= 30 || employee.status === 'pending') {
            return { label: 'Expiring', tone: 'warning', dot: 'yellow' };
        }
        return { label: 'Safe', tone: 'success', dot: 'green' };
    };

    const getDaysLabel = (employee) => {
        const days = employee.days_until_expiry ?? 0;
        if (employee.status === 'expired' || days <= 0) return '0 days (EXPIRED)';
        return `${days} days`;
    };

    const sendSms = async (employeeId) => {
        if (String(employeeId).startsWith('sample-')) {
            setNotice('Sample SMS prepared. Use real data to send messages.');
            return;
        }

        setSendingId(employeeId);
        setNotice('');

        try {
            const token = localStorage.getItem('token');
            await axios.post(apiClient.endpoints.employees.sendExpirySmsOne(employeeId), {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotice('SMS sent successfully.');
        } catch (error) {
            setNotice(error.response?.data?.message || 'SMS not sent. Please try again.');
        } finally {
            setSendingId(null);
        }
    };

    const sendBulkSms = async () => {
        if (!hasLiveEmployees) {
            setNotice('Sample SMS for all prepared. Use real data to send messages.');
            return;
        }

        setSendingBulk(true);
        setNotice('');

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(apiClient.endpoints.employees.sendExpirySms, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotice(response.data.message || 'SMS sent successfully.');
        } catch (error) {
            setNotice(error.response?.data?.message || 'SMS not sent. Please try again.');
        } finally {
            setSendingBulk(false);
        }
    };

    return (
        <div className="dashboard-home afya-permit-dashboard">
            <div className="dashboard-topline">
                <div>
                    <h2>Welcome, {user?.full_name || 'Health Officer'}</h2>
                </div>
                <Link to="/admin/employees/new" className="topbar-action">
                    <span>+</span>
                    <span>Add New Certificate</span>
                </Link>
            </div>

            {notice && <div className="notice-message">{notice}</div>}

            <section className="permit-panel summary-panel" aria-label="Summary of certificates">
                <div className="stats-grid">
                    {statItems.map((item) => {
                        const handleStatClick = () => {
                            if (item.label === 'Total') {
                                navigate('/admin/employees');
                            } else if (item.label === 'Active') {
                                navigate('/admin/employees', { state: { filterStatus: 'active' } });
                            } else if (item.label === 'Expiring') {
                                navigate('/admin/employees', { state: { filterStatus: 'pending' } });
                            } else if (item.label === 'Expired') {
                                navigate('/admin/employees', { state: { filterStatus: 'expired' } });
                            }
                        };

                        return (
                            <div 
                                className={`stat-card ${item.tone}`} 
                                key={item.label}
                                onClick={handleStatClick}
                                style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-4px)';
                                    e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                                }}
                            >
                                <div className="stat-topline">
                                    <span className="stat-icon">{item.icon}</span>
                                    <span className="stat-meta">{item.meta}</span>
                                </div>
                                <div className="stat-info">
                                    <p className="stat-number">{item.value}</p>
                                    <h3>{item.label}</h3>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            <section className="permit-panel">
                    <div className="section-header">
                    <div>
                        <p className="section-kicker">Expiry Alerts</p>
                        <h2>Expiring within 30 days</h2>
                    </div>
                    <div className="section-actions">
                        <button
                            type="button"
                            className="btn btn-outline"
                            onClick={sendBulkSms}
                            disabled={sendingBulk || expiryAlerts.length === 0}
                        >
                            {sendingBulk ? 'Sending...' : 'SMS'}
                        </button>
                        <a className="btn btn-outline" href={`mailto:${expiryAlerts.map((employee) => employee.email).filter(Boolean).join(',')}`}>
                            Email
                        </a>
                    </div>
                </div>

                <div className="expiry-alert-list">
                    {expiryAlerts.length > 0 ? (
                        expiryAlerts.map((employee) => {
                            const status = getPermitStatus(employee);
                            return (
                                <div className="expiry-alert-row" key={employee.id}>
                                    <span className={`status-dot ${status.dot}`}></span>
                                    <strong>{employee.full_name}</strong>
                                    <span className="days-pill">Days {(employee.days_until_expiry ?? 0)}</span>
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline"
                                        onClick={() => sendSms(employee.id)}
                                        disabled={sendingId === employee.id}
                                    >
                                        {sendingId === employee.id ? '...' : 'SMS'}
                                    </button>
                                    <a className="btn btn-sm btn-outline" href={`mailto:${employee.email || ''}`}>
                                        Email
                                    </a>
                                    <Link
                                        to={`/admin/employees/${employee.id}/renew`}
                                        state={{ employee }}
                                        className="btn btn-sm btn-primary"
                                    >
                                        Renew
                                    </Link>
                                </div>
                            );
                        })
                    ) : (
                        <div className="empty-table-cell">No certificates expiring within 30 days</div>
                    )}
                </div>
            </section>

            <section className="permit-panel">
                <div className="section-header">
                    <div>
                        <p className="section-kicker">Permit List</p>
                        <h2>All Certificates</h2>
                    </div>
                    <Link to="/admin/employees" className="view-all">Export List</Link>
                </div>

                <div className="table-container">
                    <table className="permit-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Name</th>
                                <th>REMAIN</th>
                                <th>Status</th>
                                <th>Renew</th>
                            </tr>
                        </thead>
                        <tbody>
                            {permitRows.length > 0 ? (
                                permitRows.map((employee, index) => {
                                    const status = getPermitStatus(employee);
                                    return (
                                        <tr key={employee.id}>
                                            <td>{index + 1}</td>
                                            <td>
                                                <strong>{employee.full_name}</strong>
                                                <span className="table-subtext">{employee.employer_name || employee.position || 'N/A'}</span>
                                            </td>
                                            <td>{getDaysLabel(employee)}</td>
                                            <td>
                                                <span className={`badge badge-${status.tone}`}>
                                                    {status.label}
                                                </span>
                                            </td>
                                            <td>
                                                <Link
                                                    to={`/admin/employees/${employee.id}/renew`}
                                                    state={{ employee }}
                                                    className="btn btn-sm btn-primary"
                                                >
                                                    Renew
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="5" className="empty-table-cell">
                                        No certificates registered
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="panel-actions">
                    <Link to="/admin/employees/new" className="btn btn-primary">Add New Certificate</Link>
                    <Link to="/admin/reports" className="btn btn-outline">Export List</Link>
                </div>
            </section>

            <section className="permit-panel payment-renewal-section">
                <div className="section-header">
                    <div>
                            <p className="section-kicker">Payment & Renew</p>
                            <h2>Payments & Renewals</h2>
                    </div>
                    <Link to="/admin/payments" className="view-all">All Payments</Link>
                </div>

                {selectedPermit ? (
                    <div className="renewal-card">
                        <dl>
                            <div>
                                <dt>Name</dt>
                                <dd>{selectedPermit.full_name}</dd>
                            </div>
                            <div>
                                <dt>Certificate #</dt>
                                <dd>PERMIT-{new Date().getFullYear()}-{String(selectedPermit.id).slice(0, 4).toUpperCase()}</dd>
                            </div>
                            <div>
                                <dt>Days Remaining</dt>
                                <dd>{getDaysLabel(selectedPermit)}</dd>
                            </div>
                            <div>
                                <dt>Amount due</dt>
                                <dd>TSh 25,000</dd>
                            </div>
                        </dl>
                        <div className="renewal-actions">
                            <Link
                                to={`/admin/employees/${selectedPermit.id}/renew`}
                                state={{ employee: selectedPermit }}
                                className="btn btn-success"
                            >
                                PAY CASH
                            </Link>
                            <Link
                                to={`/admin/employees/${selectedPermit.id}/renew`}
                                state={{ employee: selectedPermit }}
                                className="btn btn-primary"
                            >
                                Renew
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="empty-table-cell">Select or add a certificate to make a payment.</div>
                )}
            </section>
        </div>
    );
};

const Navigate = ({ to }) => {
    const navigate = useNavigate();
    React.useEffect(() => {
        navigate(to);
    }, []);
    return null;
};

export default AdminDashboard;
