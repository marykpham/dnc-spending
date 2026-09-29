import { useEffect, useState } from 'react'
import { load } from './data'

export function useData<T>(file: string) {
  const [state, setState] = useState<{ data?: T; error?: string }>({})
  useEffect(() => {
    let live = true
    load<T>(file).then(
      (data) => live && setState({ data }),
      (e) => live && setState({ error: String(e.message ?? e) }),
    )
    return () => {
      live = false
    }
  }, [file])
  return state
}
