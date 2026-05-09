/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoginPage from '@/app/page';
import { useRouter } from 'next/navigation';

// Mock Next.js router
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
}));

// Mock Modal component
jest.mock('@/components/Modal', () => {
    return function MockModal({ isOpen, title, message }: any) {
        if (!isOpen) return null;
        return (
            <div data-testid="modal">
                <h2>{title}</h2>
                <p>{message}</p>
            </div>
        );
    };
});

describe('Initial App Loading - Login Page', () => {
    const mockPush = jest.fn();

    beforeEach(() => {
        // Reset mocks before each test
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue({
            push: mockPush,
        });

        // Clear localStorage
        localStorage.clear();

        // Mock fetch
        global.fetch = jest.fn();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Page Rendering', () => {
        it('should render the login page without crashing', () => {
            render(<LoginPage />);
            expect(screen.getByText(/Melann HR Management System/i)).toBeInTheDocument();
        });

        it('should display the company branding', () => {
            render(<LoginPage />);
            expect(screen.getByText(/Managed by Melann Lending Investor Corp./i)).toBeInTheDocument();
        });

        it('should render username input field', () => {
            render(<LoginPage />);
            const usernameInput = screen.getByLabelText(/Username or Email/i);
            expect(usernameInput).toBeInTheDocument();
            expect(usernameInput).toHaveAttribute('type', 'text');
        });

        it('should render password input field', () => {
            render(<LoginPage />);
            const passwordInput = screen.getByLabelText(/^Password$/i);
            expect(passwordInput).toBeInTheDocument();
            expect(passwordInput).toHaveAttribute('type', 'password');
        });

        it('should render sign in button', () => {
            render(<LoginPage />);
            const signInButton = screen.getByRole('button', { name: /Sign In/i });
            expect(signInButton).toBeInTheDocument();
            expect(signInButton).toHaveAttribute('type', 'submit');
        });

        it('should render forgot password link', () => {
            render(<LoginPage />);
            const forgotPasswordLink = screen.getByText(/Forgot Password/i);
            expect(forgotPasswordLink).toBeInTheDocument();
        });

        it('should render create account link', () => {
            render(<LoginPage />);
            const createAccountLink = screen.getByText(/Create Account/i);
            expect(createAccountLink).toBeInTheDocument();
        });

        it('should display the company logo SVG', () => {
            const { container } = render(<LoginPage />);
            const svg = container.querySelector('svg');
            expect(svg).toBeInTheDocument();
        });
    });

    describe('Initial State', () => {
        it('should have empty username and password fields initially', () => {
            render(<LoginPage />);
            const usernameInput = screen.getByLabelText(/Username or Email/i) as HTMLInputElement;
            const passwordInput = screen.getByLabelText(/^Password$/i) as HTMLInputElement;

            expect(usernameInput.value).toBe('');
            expect(passwordInput.value).toBe('');
        });

        it('should not display any error message initially', () => {
            render(<LoginPage />);
            const errorMessage = screen.queryByText(/⚠️/);
            expect(errorMessage).not.toBeInTheDocument();
        });

        it('should have password field masked by default', () => {
            render(<LoginPage />);
            const passwordInput = screen.getByLabelText(/^Password$/i);
            expect(passwordInput).toHaveAttribute('type', 'password');
        });

        it('should not show the forgot password modal initially', () => {
            render(<LoginPage />);
            const modal = screen.queryByTestId('modal');
            expect(modal).not.toBeInTheDocument();
        });

        it('should have sign in button enabled initially', () => {
            render(<LoginPage />);
            const signInButton = screen.getByRole('button', { name: /Sign In/i });
            expect(signInButton).not.toBeDisabled();
        });
    });

    describe('LocalStorage Check', () => {
        it('should not have sessionId in localStorage on initial load', () => {
            render(<LoginPage />);
            const sessionId = localStorage.getItem('sessionId');
            expect(sessionId).toBeNull();
        });

        it('should not have user data in localStorage on initial load', () => {
            render(<LoginPage />);
            const userData = localStorage.getItem('user');
            expect(userData).toBeNull();
        });
    });

    describe('Accessibility', () => {
        it('should have proper form labels', () => {
            render(<LoginPage />);
            expect(screen.getByLabelText(/Username or Email/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
        });

        it('should have required attributes on input fields', () => {
            render(<LoginPage />);
            const usernameInput = screen.getByLabelText(/Username or Email/i);
            const passwordInput = screen.getByLabelText(/^Password$/i);

            expect(usernameInput).toBeRequired();
            expect(passwordInput).toBeRequired();
        });

        it('should have proper placeholders', () => {
            render(<LoginPage />);
            expect(screen.getByPlaceholderText(/Enter your username/i)).toBeInTheDocument();
            expect(screen.getByPlaceholderText(/Enter your password/i)).toBeInTheDocument();
        });
    });

    describe('Copyright and Footer', () => {
        it('should display current year in copyright', () => {
            render(<LoginPage />);
            const currentYear = new Date().getFullYear();
            expect(screen.getByText(new RegExp(`© ${currentYear}`, 'i'))).toBeInTheDocument();
        });

        it('should display company name in footer', () => {
            render(<LoginPage />);
            expect(screen.getAllByText(/Melann Lending Investor Corp./i).length).toBeGreaterThan(0);
        });
    });

    describe('Performance', () => {
        it('should render within acceptable time', () => {
            const startTime = performance.now();
            render(<LoginPage />);
            const endTime = performance.now();
            const renderTime = endTime - startTime;

            // Should render in less than 1000ms
            expect(renderTime).toBeLessThan(1000);
        });
    });
});
