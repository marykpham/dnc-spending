import { useEffect, useState } from 'react'

const DIGITS = Array.from({ length: 20 }, (_, i) => i % 10)

/** Rolls each digit of a formatted value like "$79.5M" into place, slot-machine style. */
export function Odometer({ value, delay = 0 }: { value: string; delay?: number }) {
  const [go, setGo] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setGo(true)))
    return () => cancelAnimationFrame(id)
  }, [])
  return (
    <span className="odo" role="img" aria-label={value}>
      {[...value].map((c, i) =>
        /\d/.test(c) ? (
          <span className="odo-col" key={i} aria-hidden>
            <span
              className="odo-strip"
              style={{ transform: `translateY(${go ? -(Number(c) + 10) : 0}em)`, transitionDelay: `${delay + i * 90}ms` }}
            >
              {DIGITS.map((d, k) => (
                <span key={k}>{d}</span>
              ))}
            </span>
          </span>
        ) : (
          <span className="odo-ch" key={i} aria-hidden>
            {c}
          </span>
        ),
      )}
    </span>
  )
}
