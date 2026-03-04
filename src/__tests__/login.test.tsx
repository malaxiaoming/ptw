import { vi } from 'vitest'

vi.mock('@/app/login/actions', () => ({
  login: vi.fn(),
}))

import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import LoginPage from '@/app/login/page'

describe('LoginPage', () => {
  it('renders email/phone input and password input', () => {
    render(<LoginPage />)
    expect(screen.getByLabelText(/email or phone/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('renders a sign in button', () => {
    render(<LoginPage />)
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('renders forgot password link', () => {
    render(<LoginPage />)
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument()
  })
})
