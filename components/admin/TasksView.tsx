import React, { useState, useMemo } from 'react';
import type { Task, Employee, Customer, Activity, CompanySettings } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ConfirmModal } from '../ui/ConfirmModal';
import { TaskFormModal } from './TaskFormModal';

interface TasksViewProps {
    tasks: Task[];
    employees: Employee[];
    customers: Customer[];
    activities: Activity[];
    companySettings: CompanySettings;
    onAddTask: (task: Omit<Task, 'id' | 'createdAt' | 'status'>) => void;
    onUpdateTask: (task: Task) => void;
    onDeleteTask: (id: string) => void;
}

const statusColors = {
    open: 'bg-yellow-100 text-yellow-800',
    done: 'bg-green-100 text-green-800',
};

export const TasksView: React.FC<TasksViewProps> = ({
    tasks, employees, customers, activities, companySettings, onAddTask, onUpdateTask, onDeleteTask
}) => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'open' | 'done'>('all');
    const [employeeFilter, setEmployeeFilter] = useState<number | 'all'>('all');

    const customerLabel = companySettings.customerLabel || 'Zeitkategorie 1';
    const activityLabel = companySettings.activityLabel || 'Zeitkategorie 2';

    const filteredTasks = useMemo(() => {
        if (!Array.isArray(tasks)) return [];
        return tasks
            .filter(t => t && (filter === 'all' || t.status === filter))
            .filter(t => employeeFilter === 'all' || (Array.isArray(t.assignedTo) && t.assignedTo.includes(employeeFilter as number)))
            .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
    }, [tasks, filter, employeeFilter]);

    const openCount = Array.isArray(tasks) ? tasks.filter(t => t && t.status === 'open').length : 0;

    try {
        return (
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Aufgaben</h2>
                        <p className="text-sm text-gray-500">{openCount} offene Aufgabe{openCount !== 1 ? 'n' : ''}</p>
                    </div>
                    <Button onClick={() => { setEditingTask(null); setIsFormOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
                        + Neue Aufgabe
                    </Button>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2 items-center">
                    <div className="bg-white p-1 rounded-lg border inline-flex gap-1">
                        {(['all', 'open', 'done'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-1.5 rounded text-sm font-semibold transition-all ${filter === f ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
                            >
                                {f === 'all' ? 'Alle' : f === 'open' ? 'Offen' : 'Erledigt'}
                            </button>
                        ))}
                    </div>
                    <select
                        value={employeeFilter === 'all' ? 'all' : employeeFilter}
                        onChange={e => setEmployeeFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                        className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700"
                    >
                        <option value="all">Alle Mitarbeiter</option>
                        {employees.filter(e => e.isActive).map(emp => (
                            <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                        ))}
                    </select>
                </div>

                {/* Task List */}
                {filteredTasks.length === 0 ? (
                    <Card>
                        <p className="text-center text-gray-500 py-8">Keine Aufgaben gefunden.</p>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {filteredTasks.map(task => {
                            const assignedNames = task.assignedTo
                                .map(id => employees.find(e => e.id === id))
                                .filter(Boolean)
                                .map(e => `${e!.firstName} ${e!.lastName}`)
                                .join(', ');
                            const customerName = customers.find(c => c.id === task.customerId)?.name;
                            const activityName = activities.find(a => a.id === task.activityId)?.name;
                            const dueDate = new Date(task.dueDate + 'T12:00:00');
                            const isOverdue = task.status === 'open' && task.dueDate < new Date().toLocaleDateString('sv-SE');

                            return (
                                <Card key={task.id}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-grow min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${statusColors[task.status]}`}>
                                                    {task.status === 'open' ? 'Offen' : 'Erledigt'}
                                                </span>
                                                {isOverdue && (
                                                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                                                        Überfällig
                                                    </span>
                                                )}
                                                <span className="text-sm text-gray-500">
                                                    📅 {dueDate.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                </span>
                                            </div>
                                            <h3 className={`font-semibold text-gray-800 ${task.status === 'done' ? 'line-through text-gray-400' : ''}`}>
                                                {task.title}
                                            </h3>
                                            {task.description && <p className="text-sm text-gray-500 mt-0.5">{task.description}</p>}
                                            <div className="flex flex-wrap gap-x-4 mt-1.5 text-xs text-gray-500">
                                                <span>👤 {assignedNames}</span>
                                                {customerName && <span>🏢 {customerName}</span>}
                                                {activityName && <span>⚙️ {activityName}</span>}
                                                {task.status === 'done' && task.completedAt && (
                                                    <span>✅ {new Date(task.completedAt).toLocaleDateString('de-DE')}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-2 flex-shrink-0">
                                            <button
                                                onClick={() => { setEditingTask(task); setIsFormOpen(true); }}
                                                className="text-xs text-gray-500 hover:text-blue-600 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                                            >
                                                Bearbeiten
                                            </button>
                                            <button
                                                onClick={() => setDeletingTaskId(task.id)}
                                                className="text-xs text-gray-500 hover:text-red-600 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                                            >
                                                Löschen
                                            </button>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}

                <TaskFormModal
                    isOpen={isFormOpen}
                    onClose={() => { setIsFormOpen(false); setEditingTask(null); }}
                    onSave={(taskData) => {
                        if (editingTask) {
                            onUpdateTask({ ...editingTask, ...taskData });
                        } else {
                            onAddTask(taskData);
                        }
                    }}
                    employees={employees}
                    customers={customers}
                    activities={activities}
                    companySettings={companySettings}
                    initialTask={editingTask}
                />

                <ConfirmModal
                    isOpen={!!deletingTaskId}
                    onClose={() => setDeletingTaskId(null)}
                    onConfirm={() => { if (deletingTaskId) { onDeleteTask(deletingTaskId); setDeletingTaskId(null); } }}
                    title="Aufgabe löschen"
                    message="Diese Aufgabe wird unwiderruflich gelöscht. Fortfahren?"
                />
            </div>
        );
    } catch (err) {
        console.error("TasksView Rendering Error: ", err);
        return <div className="p-4 text-red-500 bg-red-50 rounded">Ein Fehler ist aufgetreten: {String(err)}</div>;
    }
};
