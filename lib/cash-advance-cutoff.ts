export interface CashAdvanceCutoff {
    label: string;
    display: string;
    startDate: string;
    endDate: string;
}

function formatMonthRange(year: number, monthIndex: number, startDay: number, endDay: number): string {
    const month = new Date(year, monthIndex, 1).toLocaleString('en-US', { month: 'short' });
    return `${month} ${startDay}-${endDay}, ${year}`;
}

export function getCashAdvanceCutoff(date: Date = new Date()): CashAdvanceCutoff {
    const year = date.getFullYear();
    const monthIndex = date.getMonth();
    const month = String(monthIndex + 1).padStart(2, '0');
    const day = date.getDate();

    if (day <= 15) {
        return {
            label: `${year}-${month}-A`,
            display: formatMonthRange(year, monthIndex, 1, 15),
            startDate: `${year}-${month}-01`,
            endDate: `${year}-${month}-15`,
        };
    }

    const lastDay = new Date(year, monthIndex + 1, 0).getDate();
    return {
        label: `${year}-${month}-B`,
        display: formatMonthRange(year, monthIndex, 16, lastDay),
        startDate: `${year}-${month}-16`,
        endDate: `${year}-${month}-${String(lastDay).padStart(2, '0')}`,
    };
}

export function formatCashAdvanceCutoffLabel(label?: string | null): string {
    if (!label) return '-';

    const match = label.match(/^(\d{4})-(\d{2})-([AB])$/);
    if (!match) return label;

    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;
    const half = match[3];

    if (half === 'A') {
        return formatMonthRange(year, monthIndex, 1, 15);
    }

    const lastDay = new Date(year, monthIndex + 1, 0).getDate();
    return formatMonthRange(year, monthIndex, 16, lastDay);
}
