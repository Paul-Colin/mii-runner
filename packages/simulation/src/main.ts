const statsEl  = document.getElementById('stats')!
const titleEl  = document.getElementById('demo-title')!

const params = new URLSearchParams(window.location.search)
const demo   = params.get('demo') ?? '03'

const demos: Record<string, string> = {
  '01': 'Demo 01 — Physique de base (balles)',
  '02': 'Demo 02 — Squelette humanoïde',
  '03': 'Demo 03 — Muscles & énergie',
}

titleEl.textContent = demos[demo] ?? `Demo ${demo}`

switch (demo) {
  case '01': {
    const { runDemo01 } = await import('./demos/demo-01-physics.js')
    await runDemo01(statsEl)
    break
  }
  case '02': {
    const { runDemo02 } = await import('./demos/demo-02-skeleton.js')
    await runDemo02(statsEl)
    break
  }
  case '03': {
    const { runDemo03 } = await import('./demos/demo-03-muscles.js')
    await runDemo03(statsEl)
    break
  }
  default:
    statsEl.textContent = `Demo "${demo}" introuvable.`
}
