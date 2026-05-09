import { formatCashAdvanceCutoffLabel, getCashAdvanceCutoff } from '@/lib/cash-advance-cutoff';

describe('cash advance cutoff periods', () => {
    it('uses days 1-15 for the first cutoff', () => {
        expect(getCashAdvanceCutoff(new Date(2026, 4, 7))).toEqual({
            label: '2026-05-A',
            display: 'May 1-15, 2026',
            startDate: '2026-05-01',
            endDate: '2026-05-15',
        });
    });

    it('uses days 16 through month-end for the second cutoff', () => {
        expect(getCashAdvanceCutoff(new Date(2026, 4, 16))).toEqual({
            label: '2026-05-B',
            display: 'May 16-31, 2026',
            startDate: '2026-05-16',
            endDate: '2026-05-31',
        });
    });

    it('formats a 30-day month second cutoff correctly', () => {
        expect(formatCashAdvanceCutoffLabel('2026-04-B')).toBe('Apr 16-30, 2026');
    });
});
