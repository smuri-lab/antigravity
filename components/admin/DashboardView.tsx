import React, { useMemo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { Card } from '../ui/Card';
import type { Employee, TimeEntry, AbsenceRequest, HolidaysByYear, CompanySettings } from '../../types';
import { calculateMonthlyBreakdown } from '../utils/calculations';
import { useTranslation } from 'react-i18next';

interface DashboardViewProps {
    employees: Employee[];
    timeEntries: TimeEntry[];
    absenceRequests: AbsenceRequest[];
    holidaysByYear: HolidaysByYear;
    companySettings: CompanySettings;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const DashboardView: React.FC<DashboardViewProps> = ({
    employees, timeEntries, absenceRequests, holidaysByYear, companySettings
}) => {
    const { t } = useTranslation();

    const overtimeData = useMemo(() => {
        const now = new Date();
        const data = [];

        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const year = d.getFullYear();
            const month = d.getMonth();
            const monthLabel = d.toLocaleDateString('de-DE', { month: 'short' });

            let totalOvertime = 0;
            employees.filter(e => e.isActive).forEach(emp => {
                const breakdown = calculateMonthlyBreakdown(
                    emp, year, month, timeEntries, absenceRequests, [], holidaysByYear
                );
                totalOvertime += (breakdown.monthlyBalance || 0);
            });

            data.push({
                name: monthLabel,
                overtime: Math.round(totalOvertime * 10) / 10
            });
        }
        return data;
    }, [employees, timeEntries, absenceRequests, holidaysByYear]);

    const utilizationData = useMemo(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();

        const stats = employees.filter(e => e.isActive).map(emp => {
            const breakdown = calculateMonthlyBreakdown(
                emp, year, month, timeEntries, absenceRequests, [], holidaysByYear
            );
            return {
                name: `${emp.firstName} ${emp.lastName.substring(0, 1)}.`,
                hours: Math.round(breakdown.workedHours || 0),
                target: Math.round(breakdown.targetHours || 0)
            };
        }).sort((a, b) => b.hours - a.hours).slice(0, 8); // Top teams

        return stats;
    }, [employees, timeEntries, absenceRequests, holidaysByYear]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Overtime Trend */}
                <Card className="p-6">
                    <h3 className="text-lg font-bold mb-6 text-gray-800 flex items-center gap-2">
                        <span className="w-2 h-6 bg-blue-600 rounded-full"></span>
                        {t('dashboard.overtime_trend')}
                    </h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={overtimeData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} unit="h" />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    formatter={(value: number) => [`${value} h`, 'Bilanz']}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="overtime"
                                    stroke="#2563eb"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Top Performers / Utilization */}
                <Card className="p-6">
                    <h3 className="text-lg font-bold mb-6 text-gray-800 flex items-center gap-2">
                        <span className="w-2 h-6 bg-green-500 rounded-full"></span>
                        {t('dashboard.team_utilization')} (Aktueller Monat)
                    </h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={utilizationData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={80} />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Bar dataKey="hours" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} name="Ist-Stunden" />
                                <Bar dataKey="target" fill="#e2e8f0" radius={[0, 4, 4, 0]} barSize={20} name="Soll-Stunden" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {utilizationData.slice(0, 3).map((item, idx) => (
                    <Card key={idx} className="bg-gradient-to-br from-white to-gray-50 border-white shadow-sm hover:shadow-md transition-shadow">
                        <div className="p-1">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{item.name}</p>
                            <div className="flex justify-between items-end mt-2">
                                <span className="text-2xl font-black text-gray-900">{item.hours}h</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${item.hours >= item.target ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {item.target > 0 ? Math.round((item.hours / item.target) * 100) : 0}% Soll
                                </span>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
};
