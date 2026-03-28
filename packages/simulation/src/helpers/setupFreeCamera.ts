import { FreeCamera, Renderer } from '@mii-engine/core'

export function setupFreeCamera(renderer: Renderer, options?: { speed?: number; sensitivity?: number }): FreeCamera {
  const freeCamera = new FreeCamera(renderer.getCamera(), {
    speed:       options?.speed       ?? 8,
    sensitivity: options?.sensitivity ?? 0.002,
  })

  const hint = document.createElement('div')
  hint.id = 'freecam-hint'
  hint.style.cssText = `
    position: absolute;
    bottom: 12px;
    right: 12px;
    color: rgba(255,255,255,0.6);
    font-family: monospace;
    font-size: 11px;
    background: rgba(0,0,0,0.4);
    padding: 6px 10px;
    border-radius: 6px;
    line-height: 1.8;
    pointer-events: none;
  `
  hint.innerHTML = `
    <b>F</b> — activer/désactiver free cam<br>
    <b>ZQSD</b> — se déplacer<br>
    <b>Espace / Shift</b> — monter / descendre<br>
    <b>Souris</b> — regarder
  `
  document.body.appendChild(hint)

  document.addEventListener('pointerlockchange', () => {
    const active = document.pointerLockElement === document.body
    hint.style.color = active
      ? 'rgba(68, 200, 100, 0.9)'
      : 'rgba(255,255,255,0.6)'
    hint.innerHTML = active
      ? `<b style="color:#4ec864">Free cam active</b><br><b>ZQSD</b> déplacer &nbsp; <b>Espace/Shift</b> hauteur<br><b>F</b> désactiver`
      : `<b>F</b> — activer/désactiver free cam<br><b>ZQSD</b> — se déplacer<br><b>Espace / Shift</b> — monter / descendre<br><b>Souris</b> — regarder`
  })

  return freeCamera
}
