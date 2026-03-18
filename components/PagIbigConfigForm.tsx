import { useState } from 'react';

export default function PagIbigConfigForm({ data, onSave }: { data: any[], onSave: (data: any[]) => void }) {
    const [rows, setRows] = useState(data || []);

    const addRow = () => {
        setRows([...rows, {
            range_start: 0,
            range_end: 0,
            ee_rate: 0.01,
            er_rate: 0.02,
            max_cap: 10000
        }]);
    };

    const updateRow = (index: number, field: string, value: string) => {
        const newRows = [...rows];
        newRows[index] = { ...newRows[index], [field]: Number(value) };
        setRows(newRows);
        onSave(newRows);
    };

    const deleteRow = (index: number) => {
        const newRows = rows.filter((_, i) => i !== index);
        setRows(newRows);
        onSave(newRows);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h4 className="font-semibold text-slate-700">Pag-IBIG Contribution Rates</h4>
                <button type="button" onClick={addRow} className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-3 py-1.5 rounded-md transition-colors">+ Add Bracket</button>
            </div>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="min-w-full divide-y divide-slate-200 text-sm text-left">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-4 py-3 font-medium text-slate-600">Min Salary</th>
                            <th className="px-4 py-3 font-medium text-slate-600">Max Salary</th>
                            <th className="px-4 py-3 font-medium text-slate-600">EE Rate (Decimal)</th>
                            <th className="px-4 py-3 font-medium text-slate-600">ER Rate (Decimal)</th>
                            <th className="px-4 py-3 font-medium text-slate-600">Maximum Salary Cap</th>
                            <th className="px-4 py-3 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {rows.length === 0 && (
                            <tr><td colSpan={6} className="p-8 text-center text-slate-400">No brackets configured.</td></tr>
                        )}
                        {rows.map((r, i) => (
                            <tr key={i}>
                                <td className="p-2"><input type="number" value={r.range_start} onChange={e => updateRow(i, 'range_start', e.target.value)} className="w-full p-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 outline-none" /></td>
                                <td className="p-2"><input type="number" value={r.range_end} onChange={e => updateRow(i, 'range_end', e.target.value)} className="w-full p-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 outline-none" /></td>
                                <td className="p-2"><input type="number" step="0.01" value={r.ee_rate} onChange={e => updateRow(i, 'ee_rate', e.target.value)} className="w-full p-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="0.01 = 1%" /></td>
                                <td className="p-2"><input type="number" step="0.01" value={r.er_rate} onChange={e => updateRow(i, 'er_rate', e.target.value)} className="w-full p-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="0.02 = 2%" /></td>
                                <td className="p-2"><input type="number" value={r.max_cap} onChange={e => updateRow(i, 'max_cap', e.target.value)} className="w-full p-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 outline-none" /></td>
                                <td className="p-2 text-center">
                                    <button type="button" onClick={() => deleteRow(i)} className="text-rose-500 hover:text-rose-700">🗑️</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="text-xs text-slate-500 mt-2">* Rates must be in decimals (e.g., 0.01 for 1%, 0.02 for 2%).</p>
        </div>
    );
}
