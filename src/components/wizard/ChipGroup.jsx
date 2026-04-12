/* Chip selezionabili — multi-select o single-select */

function chipStyle(selected, single) {
  const base = {
    padding: '6px 14px', border: '1px solid var(--warm-border)',
    borderRadius: '20px', fontSize: '.82rem', cursor: 'pointer',
    fontFamily: 'var(--font-serif)', userSelect: 'none',
    transition: 'all .15s',
  }
  if (selected && single) return { ...base, background: 'var(--warm-dark)', borderColor: 'var(--warm-dark)', color: 'white' }
  if (selected)           return { ...base, background: 'var(--warm-accent)', borderColor: 'var(--warm-accent)', color: 'white' }
  return { ...base, background: 'var(--cream)', color: 'var(--warm-dark)' }
}

const skeletonStyle = (w) => ({
  height: '33px', width: `${w}px`, borderRadius: '20px',
  background: 'var(--warm-border)',
  animation: 'shimmer 1.2s infinite',
})

// Aggiunge keyframes shimmer al documento una sola volta
let shimmerInjected = false
function injectShimmer() {
  if (shimmerInjected) return
  shimmerInjected = true
  const style = document.createElement('style')
  style.textContent = '@keyframes shimmer{0%,100%{opacity:.45}50%{opacity:.9}}'
  document.head.appendChild(style)
}

/**
 * ChipGroup
 * @param {string[]} options   - etichette dei chip
 * @param {string[]} selected  - etichette selezionate
 * @param {boolean}  single    - se true, selezione singola
 * @param {boolean}  loading   - se true, mostra skeleton
 * @param {function} onChange  - callback(newSelected: string[])
 */
export default function ChipGroup({ options = [], selected = [], single = false, loading = false, onChange }) {
  injectShimmer()

  function toggle(label) {
    if (single) {
      onChange([label])
    } else {
      onChange(
        selected.includes(label)
          ? selected.filter(s => s !== label)
          : [...selected, label]
      )
    }
  }

  if (loading) {
    const widths = [110, 145, 90, 165, 115, 140, 88, 155]
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '18px', minHeight: '36px' }}>
        {widths.map((w, i) => <div key={i} style={skeletonStyle(w)} />)}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '18px', minHeight: '36px' }}>
      {options.map(label => (
        <div
          key={label}
          style={chipStyle(selected.includes(label), single)}
          onClick={() => toggle(label)}
          onMouseEnter={e => {
            if (!selected.includes(label))
              Object.assign(e.currentTarget.style, { borderColor: 'var(--warm-accent)', color: 'var(--warm-accent)' })
          }}
          onMouseLeave={e => {
            if (!selected.includes(label))
              Object.assign(e.currentTarget.style, { borderColor: 'var(--warm-border)', color: 'var(--warm-dark)' })
          }}
        >
          {label}
        </div>
      ))}
    </div>
  )
}
