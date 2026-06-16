import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { BadgeGenerator } from './BadgeGenerator'
import { encodeVCard } from './lib/vcard'

afterEach(cleanup)

describe('BadgeGenerator', () => {
  it('disables Generate until a name and email-ish address are entered', () => {
    render(<BadgeGenerator onDone={() => {}} makeQrDataUrl={vi.fn()} />)

    const generate = screen.getByRole('button', { name: 'Generate' })
    expect(generate).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ada Lovelace' } })
    expect(generate).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@dayofdata.example' } })
    expect(generate).toBeEnabled()
  })

  it('on Generate, calls makeQrDataUrl once with the encoded vCard and renders the data URL as an <img>', async () => {
    const makeQrDataUrl = vi.fn(async () => 'data:image/png;base64,FAKEQR')
    render(<BadgeGenerator onDone={() => {}} makeQrDataUrl={makeQrDataUrl} />)

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: '  Ada Lovelace  ' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: ' ada@dayofdata.example ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }))

    const expectedVCard = encodeVCard({ name: 'Ada Lovelace', email: 'ada@dayofdata.example' })
    expect(makeQrDataUrl).toHaveBeenCalledTimes(1)
    expect(makeQrDataUrl).toHaveBeenCalledWith(expectedVCard)

    const img = await screen.findByRole('img')
    expect(img).toHaveAttribute('src', 'data:image/png;base64,FAKEQR')
  })

  it('shows the cleaned name beneath the rendered Badge', async () => {
    const makeQrDataUrl = vi.fn(async () => 'data:image/png;base64,FAKEQR')
    render(<BadgeGenerator onDone={() => {}} makeQrDataUrl={makeQrDataUrl} />)

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: '  Ada Lovelace  ' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@dayofdata.example' } })
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }))

    await screen.findByRole('img')
    expect(screen.getByTestId('badge-name')).toHaveTextContent('Ada Lovelace')
  })

  it('replaces the Badge when Generate is pressed again with new inputs', async () => {
    let n = 0
    const makeQrDataUrl = vi.fn(async () => `data:image/png;base64,QR${n++}`)
    render(<BadgeGenerator onDone={() => {}} makeQrDataUrl={makeQrDataUrl} />)

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ada Lovelace' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@dayofdata.example' } })
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }))
    await screen.findByRole('img')

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Grace Hopper' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'grace@dayofdata.example' } })
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }))

    expect(makeQrDataUrl).toHaveBeenCalledTimes(2)
    expect(makeQrDataUrl).toHaveBeenLastCalledWith(
      encodeVCard({ name: 'Grace Hopper', email: 'grace@dayofdata.example' }),
    )
    await waitFor(() =>
      expect(screen.getByRole('img')).toHaveAttribute('src', 'data:image/png;base64,QR1'),
    )
    expect(screen.getByTestId('badge-name')).toHaveTextContent('Grace Hopper')
  })

  it('shows no Download link or Print button before a Badge is generated', () => {
    render(<BadgeGenerator onDone={() => {}} makeQrDataUrl={vi.fn()} />)

    expect(screen.queryByRole('link', { name: 'Download' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Print' })).toBeNull()
  })

  it('after Generate, offers a Download anchor with the data URL and a slugified .png filename', async () => {
    const makeQrDataUrl = vi.fn(async () => 'data:image/png;base64,FAKEQR')
    render(<BadgeGenerator onDone={() => {}} makeQrDataUrl={makeQrDataUrl} />)

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ada Lovelace' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@dayofdata.example' } })
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }))

    const download = await screen.findByRole('link', { name: 'Download' })
    expect(download).toHaveAttribute('href', 'data:image/png;base64,FAKEQR')
    expect(download).toHaveAttribute('download', 'day-of-data-badge-ada-lovelace.png')
  })

  it('after Generate, a Print button invokes the injected print capability once', async () => {
    const makeQrDataUrl = vi.fn(async () => 'data:image/png;base64,FAKEQR')
    const print = vi.fn()
    render(<BadgeGenerator onDone={() => {}} makeQrDataUrl={makeQrDataUrl} print={print} />)

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ada Lovelace' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@dayofdata.example' } })
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }))

    const printButton = await screen.findByRole('button', { name: 'Print' })
    expect(print).not.toHaveBeenCalled()
    fireEvent.click(printButton)
    expect(print).toHaveBeenCalledTimes(1)
  })
})
