;(function () {
  'use strict'
  const state = {
    charging: true,
    chargingTime: 0,
    dischargingTime: Infinity,
    level: 1,
  }

  function fixed(num, dig = 2) {
    return Math.round(num * Math.pow(10, 2)) / Math.pow(10, 2)
  }

  class BatteryManager extends EventTarget {
    [Symbol.toStringTag] = 'BatteryManager'

    get level() {
      return state.level
    }

    get charging() {
      return state.charging
    }

    get chargingTime() {
      return state.chargingTime
    }

    get dischargingTime() {
      return state.dischargingTime
    }

    onlevelchange = null
    onchargingchange = null
    onchargingtimechange = null
    ondischargingtimechange = null
  }

  const instances = new Set()

  /**
   * @param {Event} event
   */
  function distpach(event) {
    const handler = `on${event.type}`

    instances.forEach((instance) => {
      if (instance[handler] != null) instance[handler].call(instance, event)
      instance.dispatchEvent(event)
    })
  }

  async function getBattery() {
    const battery = new BatteryManager()

    instances.add(battery)

    return battery
  }

  class BatteryController {
    static setLevel(level) {
      if (state.level === level) return
      state.level = level
      distpach(new CustomEvent('levelchange'))
    }

    static setCharging(charging) {
      if (state.charging === charging) return
      state.charging = charging
      distpach(new CustomEvent('chargingchange'))
    }

    static setChargingTime(chargingTime) {
      if (state.chargingTime === chargingTime) return
      state.chargingTime = chargingTime
      distpach(new CustomEvent('chargingtimechange'))
    }

    static setDischargingTime(dischargingTime) {
      if (state.dischargingTime === dischargingTime) return
      state.dischargingTime = dischargingTime
      distpach(new CustomEvent('dischargingtimechange'))
    }

    static async simulate() {
      // Reset state:
      this.reset()
      await this.discharge()
      await this.charge()
      await this.discharge()
    }

    static async discharge(levelEnd = 0, duration = 15 * 1000, steps = 10) {
      return new Promise((resolve) => {
        const startAt = Date.now()
        const levelStart = state.level
        this.setCharging(false)
        console.debug(
          `[Battery] Discharging from ${levelStart} to ${levelEnd} in ${
            duration / 1000
          }s`,
        )
        this.setChargingTime(Infinity)
        const next = () => {
          const timeSoFar = Date.now() - startAt
          if (timeSoFar >= duration) {
            this.setLevel(0)
            this.setDischargingTime(0)
            resolve()
          } else {
            const nextLevel = Math.max(
              0,
              fixed(
                levelStart + (levelEnd - levelStart) * (timeSoFar / duration),
              ),
            )
            this.setLevel(nextLevel)
            this.setDischargingTime(duration - timeSoFar)
            setTimeout(next, Math.ceil(duration / steps))
          }
        }

        next()
      })
    }

    static async charge(levelEnd = 1, duration = 15 * 1000, steps = 10) {
      return new Promise((resolve) => {
        const start = Date.now()
        const levelStart = state.level
        console.debug(
          `[Battery] Charging from ${levelStart} to ${levelEnd} in ${
            duration / 1000
          }s`,
        )
        this.setCharging(true)
        this.setDischargingTime(Infinity)
        const next = () => {
          const timeSoFar = Date.now() - start
          if (timeSoFar >= duration) {
            this.setLevel(1)
            this.setChargingTime(0)
            resolve()
          } else {
            const nextLevel = Math.min(
              1,
              fixed(
                levelStart + (levelEnd - levelStart) * (timeSoFar / duration),
              ),
            )
            this.setLevel(nextLevel)
            this.setChargingTime(duration - timeSoFar)
            setTimeout(next, Math.ceil(duration / steps))
          }
        }

        next()
      })
    }

    static reset() {
      state.level = 1
      state.chargingTime = 0
      state.dischargingTime = Infinity
      state.charging = true
    }
  }

  window.BatteryManager = BatteryManager
  window.Battery = BatteryController
  navigator.getBattery = getBattery
})()
