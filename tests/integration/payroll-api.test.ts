/** @jest-environment node */
import { POST } from '@/app/api/payroll/calculate/route';
import { getAllEmployees } from '@/lib/data';
import { mockEmployees } from '../mocks/data';
import { NextRequest } from 'next/server';

jest.mock('@/lib/data', () => ({
    getAllEmployees: jest.fn()
}));

describe('Payroll Calculation API Integration with Real Data', () => {
    it('should filter employees by branch using real mock data', async () => {
        (getAllEmployees as jest.Mock).mockResolvedValue(mockEmployees);

        const request = new NextRequest('http://localhost/api/payroll/calculate', {
            method: 'POST',
            body: JSON.stringify({
                startDate: '2024-03-01',
                endDate: '2024-03-15',
                branch: 'Ormoc Branch'
            })
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        // All 3 in mock are Ormoc Branch
        expect(data).toHaveLength(3);
        expect(data[0].employee_name).toContain('ARRADAZA');
    });

    it('should ignore employees not in the selected branch', async () => {
        (getAllEmployees as jest.Mock).mockResolvedValue(mockEmployees);

        const request = new NextRequest('http://localhost/api/payroll/calculate', {
            method: 'POST',
            body: JSON.stringify({
                startDate: '2024-03-01',
                endDate: '2024-03-15',
                branch: 'Non-existent Branch'
            })
        });

        const response = await POST(request);
        const data = await response.json();

        expect(data).toHaveLength(0);
    });
});
