import { describe, it, expect } from 'vitest'
import { getEngineInfo, ENGINE_VERSION } from './index.js'

describe('@mii-engine/core', () => {
  it('retourne la bonne version', () => {
    expect(ENGINE_VERSION).toBe('1.0.0')
  })

  it('getEngineInfo contient le nom du package', () => {
    expect(getEngineInfo()).toContain('@mii-engine/core')
  })
})
