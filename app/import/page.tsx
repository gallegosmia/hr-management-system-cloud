'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import * as XLSX from 'xlsx';

export default function ImportPage() {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            readExcel(selectedFile);
        }
    };

    const readExcel = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(sheet);
            setPreview(jsonData.slice(0, 5)); // Preview first 5 rows
        };
        reader.readAsBinaryString(file);
    };

    const handleUpload = async () => {
        if (!file) return;
        setLoading(true);

        const reader = new FileReader();
        reader.onload = async (e) => {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(sheet);

            try {
                const response = await fetch('/api/import/excel', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ data: jsonData, mode: 'create' })
                });
                const result = await response.json();
                setResult(result);
            } catch (error) {
                console.error('Upload failed:', error);
                setResult({ error: 'Upload failed' });
            } finally {
                setLoading(false);
            }
        };
        reader.readAsBinaryString(file);
    };

    return (
        <DashboardLayout>
            <div className="card mb-4">
                <div className="card-body">
                    <h2 className="mb-2">Bulk Import Employees</h2>
                    <p className="text-gray-500">Upload an Excel file to add multiple employees at once.</p>
                </div>
            </div>

            <div className="card mb-4">
                <div className="card-body">
                    <div className="mb-4">
                        <label className="block mb-2 font-medium">Select Excel File</label>
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={handleFileChange}
                            className="form-input"
                        />
                    </div>

                    {preview.length > 0 && (
                        <div className="mb-4">
                            <h3 className="font-medium mb-2">Preview (First 5 Rows)</h3>
                            <div className="overflow-x-auto">
                                <table className="table text-sm">
                                    <thead>
                                        <tr>
                                            {Object.keys(preview[0]).map(key => (
                                                <th key={key}>{key}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {preview.map((row, i) => (
                                            <tr key={i}>
                                                {Object.values(row).map((val: any, j) => (
                                                    <td key={j}>{val}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end">
                        <button
                            onClick={handleUpload}
                            disabled={!file || loading}
                            className="btn btn-primary"
                        >
                            {loading ? 'Importing...' : 'Start Import'}
                        </button>
                    </div>
                </div>
            </div>

            {result && (
                <div className={`card ${result.error ? 'border-red-500' : 'border-green-500'}`}>
                    <div className="card-header">
                        <div className="card-title">Import Result</div>
                    </div>
                    <div className="card-body">
                        {result.error ? (
                            <div className="text-red-600">{result.error}</div>
                        ) : (
                            <div>
                                <div className="grid grid-cols-3 gap-4 mb-4">
                                    <div className="text-center p-3 bg-gray-50 rounded">
                                        <div className="text-xl font-bold">{result.total}</div>
                                        <div className="text-sm text-gray-500">Total Rows</div>
                                    </div>
                                    <div className="text-center p-3 bg-green-50 rounded">
                                        <div className="text-xl font-bold text-green-600">{result.success}</div>
                                        <div className="text-sm text-green-600">Success</div>
                                    </div>
                                    <div className="text-center p-3 bg-red-50 rounded">
                                        <div className="text-xl font-bold text-red-600">{result.failed}</div>
                                        <div className="text-sm text-red-600">Failed</div>
                                    </div>
                                </div>

                                {result.errors.length > 0 && (
                                    <div>
                                        <h4 className="font-medium mb-2 text-red-600">Errors:</h4>
                                        <ul className="list-disc pl-5 text-sm text-red-600">
                                            {result.errors.map((err: any, i: number) => (
                                                <li key={i}>
                                                    Row {err.row} ({err.employee_id}): {err.errors.join(', ')}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
