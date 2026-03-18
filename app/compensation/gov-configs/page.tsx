'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import SssConfigForm from '@/components/SssConfigForm';
import PagIbigConfigForm from '@/components/PagIbigConfigForm';
import PhicConfigForm from '@/components/PhicConfigForm';

interface GovConfig {
    id: number;
    type: string;
    year_effective: number;
    config_data: any;
    updated_at: string;
}

export default function GovernmentContributionConfig() {
    const [configs, setConfigs] = useState<GovConfig[]>([]);
    const [loading, setLoading] = useState(true);

    // Form States
    const [activeTab, setActiveTab] = useState('SSS');
    const [creating, setCreating] = useState(false);
    const [yearEffective, setYearEffective] = useState(new Date().getFullYear());
    const [formData, setFormData] = useState<any>(null);
    const [editingId, setEditingId] = useState<number | null>(null);

    useEffect(() => {
        fetchConfigs();
    }, []);

    const fetchConfigs = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/compensation/gov-configs');
            if (res.ok) {
                const data = await res.json();
                setConfigs(data);
            }
        } catch (error) {
            console.error('Failed to fetch configs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            const sessionId = localStorage.getItem('sessionId');

            if (editingId) {
                // Update
                const res = await fetch(`/api/compensation/gov-configs/${editingId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId || '' },
                    body: JSON.stringify({ config_data: formData })
                });

                if (res.ok) {
                    alert('Configuration updated successfully.');
                    setCreating(false);
                    setEditingId(null);
                    fetchConfigs();
                } else {
                    const error = await res.json();
                    alert(error.error || 'Failed to update configuration.');
                }
            } else {
                // Create
                const res = await fetch('/api/compensation/gov-configs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId || '' },
                    body: JSON.stringify({
                        type: activeTab,
                        year_effective: yearEffective,
                        config_data: formData
                    })
                });

                if (res.ok) {
                    alert('Configuration saved successfully.');
                    setCreating(false);
                    fetchConfigs();
                } else {
                    const error = await res.json();
                    alert(error.error || 'Failed to save configuration.');
                }
            }
        } catch (error) {
            console.error('Error saving:', error);
            alert('An unexpected error occurred.');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this configuration? Standard tables should rarely be deleted.')) return;

        try {
            const sessionId = localStorage.getItem('sessionId');
            const res = await fetch(`/api/compensation/gov-configs/${id}`, {
                method: 'DELETE',
                headers: { 'x-session-id': sessionId || '' }
            });

            if (res.ok) {
                fetchConfigs();
            } else {
                const error = await res.json();
                alert(error.error || 'Failed to delete configuration.');
            }
        } catch (error) {
            console.error('Error deleting:', error);
        }
    };

    const startEdit = (config: GovConfig) => {
        setEditingId(config.id);
        setActiveTab(config.type);
        setYearEffective(config.year_effective);
        setFormData(config.config_data);
        setCreating(true);
    };

    const startCreate = () => {
        setEditingId(null);
        setFormData(activeTab === 'PhilHealth' ? { rate: 0.05, min_salary: 10000, max_salary: 100000, ee_split: 0.5, er_split: 0.5 } : []);
        setCreating(true);
    };

    const filteredConfigs = configs.filter(c => c.type === activeTab);

    return (
        <DashboardLayout>
            <div className="p-6 max-w-7xl mx-auto">
                <div className="mb-6 flex justify-between items-end">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Government Contribution Settings</h1>
                        <p className="text-sm text-slate-500 mt-1">Configure and version-control contribution brackets per year.</p>
                    </div>
                    {!creating && (
                        <button onClick={startCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors">
                            + Add Configuration
                        </button>
                    )}
                </div>

                {!creating && (
                    <div className="flex gap-2 mb-6 border-b border-slate-200 pb-2">
                        {['SSS', 'Pag-IBIG', 'PhilHealth'].map(type => (
                            <button
                                key={type}
                                onClick={() => setActiveTab(type)}
                                className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${activeTab === type ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                )}

                {creating ? (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                            <h3 className="font-semibold text-slate-700">{editingId ? 'Edit Configuration' : `New ${activeTab} Configuration`}</h3>
                            <button onClick={() => setCreating(false)} className="text-slate-400 hover:text-slate-600 font-medium text-sm">Cancel</button>
                        </div>
                        <div className="p-6">
                            <div className="mb-6 max-w-xs">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Effective Year</label>
                                <input
                                    type="number"
                                    value={yearEffective}
                                    onChange={e => setYearEffective(Number(e.target.value))}
                                    disabled={!!editingId}
                                    className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-slate-100 disabled:text-slate-500"
                                />
                                {!!editingId && <p className="text-xs text-slate-500 mt-1">Year cannot be changed after creation.</p>}
                            </div>

                            {activeTab === 'SSS' && <SssConfigForm data={formData} onSave={setFormData} />}
                            {activeTab === 'Pag-IBIG' && <PagIbigConfigForm data={formData} onSave={setFormData} />}
                            {activeTab === 'PhilHealth' && <PhicConfigForm data={formData} onSave={setFormData} />}

                            <div className="mt-8 pt-4 border-t border-slate-200 flex justify-end gap-3">
                                <button onClick={() => setCreating(false)} className="px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors">
                                    Cancel
                                </button>
                                <button onClick={handleSave} className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 shadow-sm transition-colors">
                                    Save Configuration
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="min-w-full divide-y divide-slate-200 text-sm text-left">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 font-semibold text-slate-600">Year Effective</th>
                                    <th className="px-6 py-3 font-semibold text-slate-600">Type</th>
                                    <th className="px-6 py-3 font-semibold text-slate-600">Last Updated</th>
                                    <th className="px-6 py-3 font-semibold text-slate-600 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">Loading configurations...</td></tr>
                                ) : filteredConfigs.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                            <div className="text-4xl mb-3">⚙️</div>
                                            <p className="text-lg font-medium text-slate-700">No configurations found for {activeTab}.</p>
                                            <p className="text-sm mt-1">Add a new configuration to use it in payroll computations.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredConfigs.map(config => (
                                        <tr key={config.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4 font-bold text-slate-800">{config.year_effective}</td>
                                            <td className="px-6 py-4 font-medium text-slate-600">{config.type}</td>
                                            <td className="px-6 py-4 text-slate-500 text-xs">{new Date(config.updated_at).toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right flex justify-end gap-2">
                                                <button onClick={() => startEdit(config)} className="text-blue-600 hover:text-blue-800 text-xs font-semibold uppercase bg-blue-50 px-3 py-1.5 rounded hover:bg-blue-100">Edit Rates</button>
                                                <button onClick={() => handleDelete(config.id)} className="text-rose-600 hover:text-rose-800 text-xs font-semibold uppercase bg-rose-50 px-3 py-1.5 rounded hover:bg-rose-100">Delete</button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
