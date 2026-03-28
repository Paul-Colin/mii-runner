export {}

const statsEl = document.getElementById('stats')!
const titleEl = document.getElementById('demo-title')!

const params = new URLSearchParams(window.location.search)
const demo   = params.get('demo') ?? '04'

const demos: Record<string, string> = {
  '01': 'Demo 01 — Physique de base',
  '02': 'Demo 02 — Squelette humanoïde',
  '03': 'Demo 03 — Muscles & énergie',
  '04': 'Demo 04 — Morphologie T/P/M',
  '05': 'Demo 05 — Mii Loader',
  '09': 'Demo 09 — Ragdoll Mii',
  '10': 'Demo 10 — Muscles Mii',
  'env01': 'Env 01 — Île Wuhu',
  'env02': 'Env 02 — Ligne de départ',
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
  case '04': {
    const { runDemo04 } = await import('./demos/demo-04-morphology.js')
    await runDemo04(statsEl)
    break
  }
  case '05': {
    const { runDemo05 } = await import('./demos/demo-05-mii.js')
    await runDemo05(statsEl)
    break
  }
  case '06': {
    const { runDemo06 } = await import('./demos/demo-06-coherent.js')
    await runDemo06(statsEl)
    break
  }
  case '07': {
    const { runDemo07 } = await import('./demos/demo-07-mii-full.js')
    await runDemo07(statsEl)
    break
  }
  case '08': {
    const { runDemo08 } = await import('./demos/demo-08-mii-custom.js')
    await runDemo08(statsEl)
    break
  }
  case '09': {
    const { runDemo09 } = await import('./demos/demo-09-ragdoll.js')
    await runDemo09(statsEl)
    break
  }
  case '10': {
    const { runDemo10 } = await import('./demos/demo-10-muscles.js')
    await runDemo10(statsEl)
    break
  }

  // ── Environnement ──────────────────────────────────────────────────────────
  case 'env01': {
    const { runEnv01 } = await import('./demos/env-01-wuhu.js')
    await runEnv01(statsEl)
    break
  }
  case 'env02': {
    const { runEnv02 } = await import('./demos/env-02-start.js')
    await runEnv02(statsEl)
    break
  }

  default:
    statsEl.textContent = `Demo "${demo}" introuvable.`
}
