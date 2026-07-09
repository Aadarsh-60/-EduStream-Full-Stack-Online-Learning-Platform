import React from 'react';
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Legend
} from 'recharts';

// Colors for charts
const COLORS = ['#6C63FF', '#F5A623', '#10B981', '#EC4899', '#8B84FF'];

export function UsersRoleChart({ users }) {
  if (!users || !users.length) return null;
  
  const roleCount = users.reduce((acc, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1;
    return acc;
  }, {});

  const data = Object.entries(roleCount).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value
  }));

  return (
    <div className="card" style={{ padding: 24, height: 320, display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ marginBottom: 16, fontSize: '1rem' }}>Users by Role</h3>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
              {data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
            </Pie>
            <RechartsTooltip contentStyle={{ background: 'var(--navy-700)', border: '1px solid var(--border)', borderRadius: 8 }} />
            <Legend verticalAlign="bottom" height={36} iconType="circle" />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function CoursesCategoryChart({ courses }) {
  if (!courses || !courses.length) return null;

  const categoryCount = courses.reduce((acc, course) => {
    acc[course.category] = (acc[course.category] || 0) + 1;
    return acc;
  }, {});

  const data = Object.entries(categoryCount).map(([name, value]) => ({ name, value }));

  return (
    <div className="card" style={{ padding: 24, height: 320, display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ marginBottom: 16, fontSize: '1rem' }}>Courses by Category</h3>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="name" stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
            <RechartsTooltip cursor={{ fill: 'var(--card-hover)' }} contentStyle={{ background: 'var(--navy-700)', border: '1px solid var(--border)', borderRadius: 8 }} />
            <Bar dataKey="value" fill="var(--indigo)" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function InstructorEnrollmentChart({ courses }) {
  if (!courses || !courses.length) return null;

  const data = [...courses]
    .sort((a, b) => (b.enrolledCount || 0) - (a.enrolledCount || 0))
    .slice(0, 5)
    .map(c => ({
      name: c.title.length > 15 ? c.title.slice(0, 15) + '...' : c.title,
      students: c.enrolledCount || 0,
    }));

  return (
    <div className="card" style={{ padding: 24, height: 320, display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ marginBottom: 16, fontSize: '1rem' }}>Top 5 Courses by Enrollment</h3>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis type="number" stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis dataKey="name" type="category" stroke="var(--muted)" fontSize={11} width={100} tickLine={false} axisLine={false} />
            <RechartsTooltip cursor={{ fill: 'var(--card-hover)' }} contentStyle={{ background: 'var(--navy-700)', border: '1px solid var(--border)', borderRadius: 8 }} />
            <Bar dataKey="students" fill="var(--gold)" radius={[0, 4, 4, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
