import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Clock, Calendar, Briefcase, Search, Award, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { OnboardEmployeeModal } from '../components/OnboardEmployeeModal';
import { AttendancePunchModal } from '../components/AttendancePunchModal';
import { ApplyLeaveModal } from '../components/ApplyLeaveModal';
import { RunPayrollModal } from '../components/RunPayrollModal';
import { DollarSign } from 'lucide-react';

export const HRMSScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'EMPLOYEES' | 'ATTENDANCE' | 'LEAVES' | 'PAYROLL' | 'SHIFTS' | 'RECRUITMENT'>('EMPLOYEES');
  const [search, setSearch] = useState('');
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [showPunchModal, setShowPunchModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showPayrollModal, setShowPayrollModal] = useState(false);

  const [employees, setEmployees] = useState([
    {
      id: 'emp-1',
      empCode: 'EMP-2026-000101',
      fullName: 'Rahul Sharma',
      designation: 'Senior Cashier',
      department: 'POS & Sales',
      branch: 'Afreen Mall Main Store',
      email: 'rahul.s@afreenmall.com',
      phone: '+91 98765 11223',
      employmentType: 'FULL_TIME',
      status: 'ACTIVE',
      dateOfJoining: '2025-01-15',
    },
    {
      id: 'emp-2',
      empCode: 'EMP-2026-000102',
      fullName: 'Ayesha Khan',
      designation: 'Store Manager',
      department: 'Operations',
      branch: 'Afreen Mall Main Store',
      email: 'ayesha.k@afreenmall.com',
      phone: '+91 98200 88776',
      employmentType: 'FULL_TIME',
      status: 'ACTIVE',
      dateOfJoining: '2024-06-01',
    },
    {
      id: 'emp-3',
      empCode: 'EMP-2026-000103',
      fullName: 'Vikram Singh',
      designation: 'Inventory Executive',
      department: 'Inventory & Warehouse',
      branch: 'Main Warehouse Godown',
      email: 'vikram.s@afreenmall.com',
      phone: '+91 98333 44112',
      employmentType: 'FULL_TIME',
      status: 'ACTIVE',
      dateOfJoining: '2025-03-10',
    },
  ]);

  const [attendanceLogs, setAttendanceLogs] = useState([
    { id: 'att-1', empCode: 'EMP-2026-000101', employeeName: 'Rahul Sharma', date: '2026-08-05', checkInTime: '08:04 AM', checkOutTime: '04:12 PM', totalHours: '8.1 hrs', status: 'PRESENT', deviceId: 'BIO-POS-TERMINAL-01' },
    { id: 'att-2', empCode: 'EMP-2026-000102', employeeName: 'Ayesha Khan', date: '2026-08-05', checkInTime: '09:42 AM', checkOutTime: '06:15 PM', totalHours: '8.5 hrs', status: 'LATE', deviceId: 'BIO-MAIN-GATE-01' },
    { id: 'att-3', empCode: 'EMP-2026-000103', employeeName: 'Vikram Singh', date: '2026-08-05', checkInTime: '08:00 AM', checkOutTime: '04:00 PM', totalHours: '8.0 hrs', status: 'PRESENT', deviceId: 'BIO-WH-ENTRY-01' },
  ]);

  const fetchHRMSData = async () => {
    try {
      const empRes = await api.get('/hrms/employees');
      if (empRes.data?.employees?.length > 0) setEmployees(empRes.data.employees);
    } catch {}

    try {
      const attRes = await api.get('/hrms/attendance');
      if (attRes.data?.attendanceLogs?.length > 0) setAttendanceLogs(attRes.data.attendanceLogs);
    } catch {}
  };

  useEffect(() => {
    fetchHRMSData();
  }, []);

  const filteredEmployees = employees.filter(
    (e) =>
      e.fullName.toLowerCase().includes(search.toLowerCase()) ||
      e.empCode.toLowerCase().includes(search.toLowerCase()) ||
      e.designation.toLowerCase().includes(search.toLowerCase()) ||
      e.department.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', textTransform: 'uppercase' }}>
            Enterprise HRMS & Employee Lifecycle Console
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Employee Master → Recruitment Pipeline → Biometric Attendance → Shift Rosters & Payroll
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => setShowOnboardModal(true)} style={{ padding: '8px 14px' }}>
            <UserPlus size={16} /> <span>+ Onboard Employee</span>
          </button>
          <button className="btn" onClick={() => setShowPunchModal(true)} style={{ padding: '8px 14px' }}>
            <Clock size={16} style={{ color: 'var(--accent-lime)' }} /> <span>⏰ Log Punch</span>
          </button>
          <button className="btn" onClick={() => setShowLeaveModal(true)} style={{ padding: '8px 14px' }}>
            <Calendar size={16} style={{ color: '#3b82f6' }} /> <span>📅 Apply Leave</span>
          </button>
          <button className="btn" onClick={() => setShowPayrollModal(true)} style={{ padding: '8px 14px' }}>
            <DollarSign size={16} style={{ color: 'var(--status-green)' }} /> <span>💳 Run Payroll</span>
          </button>
        </div>
      </div>

      {/* TOP HRMS KPI CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <div className="card" style={{ padding: '12px', borderLeft: '3px solid var(--accent-lime)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Active Workforce</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', marginTop: '2px', color: 'var(--accent-lime)' }} className="tabular-nums">
            {employees.length} Staff
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Multi-Store Employees</div>
        </div>

        <div className="card" style={{ padding: '12px', borderLeft: '3px solid var(--status-green)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Present Today</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', marginTop: '2px', color: 'var(--status-green)' }} className="tabular-nums">
            {attendanceLogs.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length} Staff
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Biometric Checked-In</div>
        </div>

        <div className="card" style={{ padding: '12px', borderLeft: '3px solid var(--status-amber)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Late Arrivals</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', marginTop: '2px', color: 'var(--status-amber)' }} className="tabular-nums">
            {attendanceLogs.filter(a => a.status === 'LATE').length} Staff
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>&gt; 15 Mins Grace Period</div>
        </div>

        <div className="card" style={{ padding: '12px', borderLeft: '3px solid #3b82f6' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Open Job Vacancies</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', marginTop: '2px', color: '#3b82f6' }} className="tabular-nums">
            4 Positions
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Recruitment Pipeline Active</div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
        {[
          { id: 'EMPLOYEES', label: 'Employee Master Directory' },
          { id: 'ATTENDANCE', label: 'Attendance & Biometric Logs' },
          { id: 'SHIFTS', label: 'Shift Roster Management' },
          { id: 'RECRUITMENT', label: 'Recruitment & Onboarding' },
        ].map((tab) => (
          <button
            key={tab.id}
            className={`btn ${activeTab === tab.id ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab(tab.id as any)}
            style={{ padding: '6px 14px', fontSize: '12px' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* EMPLOYEE DIRECTORY TAB */}
      {activeTab === 'EMPLOYEES' && (
        <div className="card">
          <div style={{ marginBottom: '16px', maxWidth: '380px' }}>
            <input
              type="text"
              className="input-field tabular-nums"
              placeholder="Search by code, name, designation, or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>EMP CODE</th>
                  <th>EMPLOYEE NAME</th>
                  <th>DESIGNATION</th>
                  <th>DEPARTMENT</th>
                  <th>BRANCH</th>
                  <th>TYPE</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((e) => (
                  <tr key={e.id}>
                    <td className="tabular-nums" style={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--accent-lime)' }}>{e.empCode}</td>
                    <td style={{ fontWeight: 'bold' }}>{e.fullName}</td>
                    <td>{e.designation}</td>
                    <td>
                      <span style={{ fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', border: '1px solid var(--border-color)' }}>
                        {e.department}
                      </span>
                    </td>
                    <td style={{ fontSize: '11px' }}>{e.branch}</td>
                    <td style={{ fontSize: '11px' }}>{e.employmentType}</td>
                    <td>
                      <span style={{ fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', border: '1px solid var(--border-color)', color: 'var(--status-green)' }}>
                        {e.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ATTENDANCE TAB */}
      {activeTab === 'ATTENDANCE' && (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>EMP CODE</th>
                  <th>EMPLOYEE NAME</th>
                  <th>DATE</th>
                  <th>CHECK-IN</th>
                  <th>CHECK-OUT</th>
                  <th>TOTAL HOURS</th>
                  <th>STATUS</th>
                  <th>DEVICE ID</th>
                </tr>
              </thead>
              <tbody>
                {attendanceLogs.map((att) => (
                  <tr key={att.id}>
                    <td className="tabular-nums" style={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--accent-lime)' }}>{att.empCode}</td>
                    <td style={{ fontWeight: 'bold' }}>{att.employeeName}</td>
                    <td className="tabular-nums">{att.date}</td>
                    <td className="tabular-nums" style={{ color: 'var(--status-green)', fontWeight: 'bold' }}>{att.checkInTime}</td>
                    <td className="tabular-nums">{att.checkOutTime}</td>
                    <td className="tabular-nums" style={{ fontWeight: 'bold' }}>{att.totalHours}</td>
                    <td>
                      <span style={{ fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', border: '1px solid var(--border-color)', color: att.status === 'LATE' ? 'var(--status-amber)' : 'var(--status-green)' }}>
                        {att.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '10px', fontFamily: 'monospace' }}>{att.deviceId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SHIFTS TAB */}
      {activeTab === 'SHIFTS' && (
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--accent-lime)', marginBottom: '12px', textTransform: 'uppercase' }}>
            Store Shift Rosters & Work Timings
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            {[
              { title: 'Morning Retail Shift', time: '08:00 AM - 04:00 PM', staff: 14, grace: '15 mins' },
              { title: 'Evening Retail Shift', time: '02:00 PM - 10:00 PM', staff: 12, grace: '15 mins' },
              { title: 'General Office Shift', time: '09:30 AM - 06:30 PM', staff: 6, grace: '15 mins' },
            ].map((s, idx) => (
              <div key={idx} className="card" style={{ padding: '14px', borderLeft: '4px solid var(--accent-lime)' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{s.title}</div>
                <div style={{ fontSize: '12px', color: 'var(--accent-lime)', marginTop: '4px' }} className="tabular-nums">{s.time}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>Staff Assigned: {s.staff} · Grace Period: {s.grace}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RECRUITMENT TAB */}
      {activeTab === 'RECRUITMENT' && (
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--accent-lime)', marginBottom: '12px', textTransform: 'uppercase' }}>
            Recruitment & Candidate Onboarding Pipeline
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            {[
              { title: 'POS Billing Cashier', dept: 'POS & Sales', positions: 3, applicants: 18, status: 'INTERVIEWING' },
              { title: 'Warehouse Inventory Inspector', dept: 'Inventory', positions: 1, applicants: 7, status: 'OPEN' },
            ].map((v, idx) => (
              <div key={idx} className="card" style={{ padding: '14px', borderTop: '4px solid #3b82f6' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{v.title}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Department: {v.dept}</div>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#3b82f6', marginTop: '8px' }}>{v.positions} Positions · {v.applicants} Applicants</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODALS */}
      <OnboardEmployeeModal
        isOpen={showOnboardModal}
        onClose={() => setShowOnboardModal(false)}
        onSuccess={fetchHRMSData}
      />

      <AttendancePunchModal
        isOpen={showPunchModal}
        onClose={() => setShowPunchModal(false)}
        onSuccess={fetchHRMSData}
      />

      <ApplyLeaveModal
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        onSuccess={fetchHRMSData}
      />

      <RunPayrollModal
        isOpen={showPayrollModal}
        onClose={() => setShowPayrollModal(false)}
        onSuccess={fetchHRMSData}
      />
    </div>
  );
};
