import { Fragment, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'

export interface AxisPickerOption {
  value: string
  label: string
  group?: string
}

interface AxisPickerProps {
  label: string
  value: string
  onChange: (value: string) => void
  options: AxisPickerOption[]
  placeholder?: string
}

export function AxisPicker({ label, value, onChange, options, placeholder }: AxisPickerProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const baseId = useId()
  const listId = `${baseId}-list`

  const selected = useMemo(() => options.find(o => o.value === value) ?? null, [options, value])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter(o => o.label.toLowerCase().includes(q))
  }, [options, query])

  const groupOrder = useMemo(() => {
    const seen = new Set<string>()
    const order: (string | undefined)[] = []
    for (const o of filtered) {
      const g = o.group ?? ''
      if (!seen.has(g)) {
        seen.add(g)
        order.push(o.group)
      }
    }
    return order
  }, [filtered])

  useEffect(() => {
    if (open) setActiveIndex(filtered.length > 0 ? 0 : -1)
  }, [filtered, open])

  function select(o: AxisPickerOption) {
    onChange(o.value)
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) { setOpen(true); return }
      setActiveIndex(i => Math.min(filtered.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(0, i - 1))
    } else if (e.key === 'Enter') {
      if (open && activeIndex >= 0 && filtered[activeIndex]) {
        e.preventDefault()
        select(filtered[activeIndex])
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
      inputRef.current?.blur()
    }
  }

  return (
    <div className="relative">
      <label htmlFor={baseId} className="flex flex-col gap-1.5">
        <span className="font-mono text-xs tracking-[0.06em] uppercase text-text-muted">{label}</span>
        <div className="relative">
          <input
            id={baseId}
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open && activeIndex >= 0 ? `${baseId}-opt-${activeIndex}` : undefined}
            autoComplete="off"
            value={open ? query : (selected?.label ?? '')}
            placeholder={placeholder}
            onFocus={() => { setOpen(true); setQuery('') }}
            onChange={e => { setQuery(e.target.value); setOpen(true) }}
            onKeyDown={handleKeyDown}
            onBlur={() => setOpen(false)}
            className="text-[15px] border border-border-strong rounded-button pl-4 pr-9 py-3 bg-surface-raised text-text min-h-12 w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amethyst"
          />
          {open && query && (
            <button
              type="button"
              tabIndex={-1}
              aria-label="Clear search"
              onMouseDown={e => e.preventDefault()}
              onClick={() => { setQuery(''); inputRef.current?.focus() }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text text-lg leading-none"
            >&times;</button>
          )}
        </div>
      </label>
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 w-full max-h-[300px] overflow-y-auto bg-surface-raised border border-border-strong rounded-button shadow-lg py-1"
        >
          {filtered.length === 0 && (
            <li className="px-4 py-2 text-[14px] text-text-muted">No matches</li>
          )}
          {groupOrder.map(g => (
            <Fragment key={g ?? '__ungrouped'}>
              {g && (
                <li role="presentation" className="px-4 pt-2 pb-1 font-mono text-xs tracking-[0.06em] uppercase text-text-muted">
                  {g}
                </li>
              )}
              {filtered.filter(o => o.group === g).map(o => {
                const idx = filtered.indexOf(o)
                return (
                  <li
                    key={o.value}
                    id={`${baseId}-opt-${idx}`}
                    role="option"
                    aria-selected={o.value === value}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => select(o)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`px-4 py-2 text-[15px] cursor-pointer ${idx === activeIndex ? 'bg-surface-sunk' : ''} ${o.value === value ? 'font-bold text-navy' : 'text-text'}`}
                  >{o.label}</li>
                )
              })}
            </Fragment>
          ))}
        </ul>
      )}
    </div>
  )
}
