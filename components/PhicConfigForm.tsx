import { useState } from 'react';

export default function PhicConfigForm({ data, onSave }: { data: any, onSave: (data: any) => void }) {
    const [config, setConfig] = useState(data || {
        rate: 0.05,
        min_salary: 10000,
        max_salary: 100000,
        ee_split: 0.5,
        er_split: 0.5
    });

    const handleChange = (field: string, value: string) => {
        const newConfig = { ...config, [field]: Number(value) };
        setConfig(newConfig);
        onSave(newConfig);
    };

    return (
        <div className="space-y-6">
            <h4 className="font-semibold text-slate-700 mb-4">PhilHealth Contribution Rates</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-lg border border-slate-200">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Premium Rate (Decimal)</label>
                    <input type="number" step="0.005" value={config.rate} onChange={e => handleChange('rate', e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="0.05 = 5%" />
                    <p className="text-xs text-slate-500 mt-1">Ex: 0.05 represents a 5% total contribution rate.</p>
                </div>
                <div></div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Minimum Base Salary</label>
                    <div className="relative">
                        <span className="absolute left-3 top-2 text-slate-400">₱</span>
                        <input type="number" value={config.min_salary} onChange={e => handleChange('min_salary', e.target.value)}
                            className="w-full pl-8 p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none" />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Maximum Base Salary Cap</label>
                    <div className="relative">
                        <span className="absolute left-3 top-2 text-slate-400">₱</span>
                        <input type="number" value={config.max_salary} onChange={e => handleChange('max_salary', e.target.value)}
                            className="w-full pl-8 p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none" />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Employee Share Split</label>
                    <input type="number" step="0.1" value={config.ee_split} onChange={e => handleChange('ee_split', e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="0.5 = 50%" />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Employer Share Split</label>
                    <input type="number" step="0.1" value={config.er_split} onChange={e => handleChange('er_split', e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="0.5 = 50%" />
                </div>
            </div>
        </div>
    );
}
