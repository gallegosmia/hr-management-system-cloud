/** @jest-environment node */
import { GET, POST } from '@/app/api/settings/route';
import { getAll, update, insert } from '@/lib/database';
import { NextRequest } from 'next/server';

jest.mock('@/lib/database', () => ({
    getAll: jest.fn(),
    update: jest.fn(),
    insert: jest.fn(),
    query: jest.fn()
}));

describe('Settings API Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/settings', () => {
        it('should return settings as a map', async () => {
            (getAll as jest.Mock).mockResolvedValue([
                { id: 1, key: 'company_name', value: 'Melann Investor' },
                { id: 2, key: 'tax_rate', value: '0.12' }
            ]);

            const response = await GET();
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data).toEqual({
                company_name: 'Melann Investor',
                tax_rate: '0.12'
            });
            expect(getAll).toHaveBeenCalledWith('settings');
        });

        it('should return 500 if database fails', async () => {
            (getAll as jest.Mock).mockRejectedValue(new Error('DB Error'));

            const response = await GET();
            expect(response.status).toBe(500);
        });
    });

    describe('POST /api/settings', () => {
        it('should update existing settings', async () => {
            const updates = { company_name: 'New Name' };
            (getAll as jest.Mock).mockResolvedValue([
                { id: 1, key: 'company_name', value: 'Old Name' }
            ]);

            const request = new NextRequest('http://localhost/api/settings', {
                method: 'POST',
                body: JSON.stringify(updates)
            });

            const response = await POST(request);
            expect(response.status).toBe(200);
            expect(update).toHaveBeenCalledWith('settings', 1, { value: 'New Name' });
        });

        it('should insert new settings if they do not exist', async () => {
            const updates = { new_key: 'new_value' };
            (getAll as jest.Mock).mockResolvedValue([]);

            const request = new NextRequest('http://localhost/api/settings', {
                method: 'POST',
                body: JSON.stringify(updates)
            });

            const response = await POST(request);
            expect(response.status).toBe(200);
            expect(insert).toHaveBeenCalledWith('settings', expect.objectContaining({
                key: 'new_key',
                value: 'new_value'
            }));
        });
    });
});
