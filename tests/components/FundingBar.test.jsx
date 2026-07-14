import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import FundingBar from '../../src/components/project/FundingBar'

describe('FundingBar', () => {
  it('shows the funding percentage passed to it', () => {
    render(<FundingBar percent={75} />)

    expect(screen.getByText('75%')).toBeInTheDocument()
    expect(screen.getByText('Funded')).toBeInTheDocument()
  })
})
