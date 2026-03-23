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
  

  default:
    statsEl.textContent = `Demo "${demo}" introuvable.`
}
