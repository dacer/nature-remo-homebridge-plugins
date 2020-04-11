const fetch = require('node-fetch')
const mDnsSd = require('node-dns-sd')

const packageJson = require('../package.json')

// Lazy-initialized.
let hap, Service, Characteristic

// Called by homebridge.
module.exports = (homebridge) => {
  hap = homebridge.hap
  Service = homebridge.hap.Service
  Characteristic = homebridge.hap.Characteristic

  // Register the accessory.
  homebridge.registerAccessory(packageJson.name, 'NatureRemo', NatureRemo)
}

class NatureRemo {
  constructor(log, config, api) {
    this.log = log
    this.config = config

    this._address = config.remo_ip
    this._state = false
    this._inProgress = false

    this._infoService = new Service.AccessoryInformation()
    this._infoService
        .setCharacteristic(Characteristic.Manufacturer, 'Nature Japan')
        .setCharacteristic(Characteristic.Model, 'Nature Remo')
        .setCharacteristic(Characteristic.SerialNumber, '90-11-27')

    this._switchService = new Service.Switch(config.name, 'remo-send')
    this._switchService.getCharacteristic(Characteristic.On)
        .on('set', this._setState.bind(this))
        .on('get', (callback) => callback(null, this._state))
  }

  getServices() {
    return [this._infoService, this._switchService]
  }

  async _setState(on, callback) {
    if (on === this._state) {
      callback()
      return
    }

    // If we are still sending signals, do not change state.
    if (this._inProgress) {
      this.log(`Can not change state to ${on} as there is operation in progress`)
      callback()
      setTimeout(() => {
        // There is no way to prevent changing state, so we have to flip after
        // a while.
        if (this._inProgress)
          this._switchService.updateCharacteristic(hap.Characteristic.On, this._state)
      }, 100)
      return
    }

    // Start sending signals.
    this._sendSignals(on)

    // Return immediately as the signals may spend quite a while to finish.
    this._state = on
    callback()
  }

  async _sendSignals(on) {
    this._inProgress = true

    const commands = this.config[on ? 'on' : 'off'].map((it) => {
      return {delay: it.delay ? it.delay : 0, signal: this.config.signals[it.signal]}
    })

    try {
      for (const command of commands) {
        await this._sendSignal(command.signal)
        await sleep(command.delay)
      }
    } catch (e) {
      this.log(`Sending signal fails: ${e.message}`)
    }

    this._inProgress = false
  }

  async _sendSignal(signal) {
    const body = JSON.stringify({
      format: signal[0],
      freq: signal[1],
      data: signal.slice(2)
    })

    let tries = 0
    while (true) {
      // The device is not stable, and the first request after long sleep would
      // usually fail.
      try {
        this.log("posting messages......")
        const res = await fetch(`http://${this._address}/messages`, {
          body,
          method: 'post',
          headers: {
            'X-Requested-With': 'curl',
            'Content-Type': 'application/json',
            'Content-Length': body.length
          },
          timeout: 10 * 1000
        })
        this.log(`result is : ${res.ok}`)
        return
      } catch (e) {
        if (tries++ < 3) {
          this.log(`Request fails, retrying: ${e}`)
        } else {
          this.log(`Giving up after ${tries} times of retries`)
          throw e
        }
      }
    }
  }

}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
