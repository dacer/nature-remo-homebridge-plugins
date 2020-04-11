const fetch = require('node-fetch')
const mDnsSd = require('node-dns-sd')

const packageJson = require('./package.json')

// Lazy-initialized.
let hap, Service, Characteristic

// Called by homebridge.
module.exports = (homebridge) => {
  hap = homebridge.hap
  Service = homebridge.hap.Service
  Characteristic = homebridge.hap.Characteristic

  // Register the accessory.
  homebridge.registerAccessory(packageJson.name, 'NatureRemoAirconLocal', NatureRemoAirconLocal)
}

class NatureRemoAirconLocal {
  constructor(log, config, api) {
    this.log = log
    this.config = config

    this._address = config.remo_ip
    // 0: shutdown; 1: heat; 2: cool; 3: auto
    this._state = 0
    this._temperature = 24
    this._inProgress = false
    this._temperatureUnit = 0

    this._infoService = new Service.AccessoryInformation()
    this._infoService
        .setCharacteristic(Characteristic.Manufacturer, 'Nature Japan')
        .setCharacteristic(Characteristic.Model, 'Nature Remo')
        .setCharacteristic(Characteristic.SerialNumber, '90-11-27')

    this._airconService = new Service.Thermostat('エアコン')
    this._airconService
      .getCharacteristic(hap.Characteristic.CurrentHeatingCoolingState)
      .on('get', this.getHeatingCoolingState.bind(this))
    this._airconService
      .getCharacteristic(hap.Characteristic.TargetHeatingCoolingState)
      .on('get', this.getHeatingCoolingState.bind(this))
      .on('set', this._setHeatingCoolingState.bind(this))
    this._airconService
      .getCharacteristic(hap.Characteristic.CurrentTemperature)
      .on('get', this.getCurrentTemperature.bind(this))
    this._airconService
      .getCharacteristic(hap.Characteristic.TargetTemperature)
      .on('get', this.getTargetTemperature.bind(this))
      .on('set', this._setTargetTemperature.bind(this))
    this._airconService
      .getCharacteristic(hap.Characteristic.TemperatureDisplayUnits)
      .on('get', this.getTemperatureDisplayUnits.bind(this))
      .on('set', this._setTemperatureDisplayUnits.bind(this))
  }

  getServices() {
    return [this._infoService, this._airconService]
  }

  getHeatingCoolingState(callback) {
    callback(null, this._state)
  }

  getCurrentTemperature(callback) {
    callback(null, 24) //todo
  }
  getTargetTemperature(callback) {
    callback(null, this._temperature)
  }

  async _setTargetTemperature(value, callback) {
    this.log(`_setTargetTemperature ${value}`)
    this._temperature = value
    callback()
  }

  getTemperatureDisplayUnits(callback) {
    callback(null, this._temperatureUnit)
  }

  async _setTemperatureDisplayUnits(value, callback) {
    this.log(`_setTemperatureDisplayUnits ${value}`)
    this._temperatureUnit = value
    callback()
  }

  async _setHeatingCoolingState(state, callback) {
    this.log(`_setHeatingCoolingState ${state}`)
    if (state === this._state) {
      callback()
      return
    }

    // If we are still sending signals, do not change state.
    if (this._inProgress) {
      this.log(`Can not change state to ${state} as there is operation in progress`)
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
    this._sendSignals(state)

    // Return immediately as the signals may spend quite a while to finish.
    this._state = state
    callback()
  }

  async _sendSignals(state) {
    this._inProgress = true
    let stateName = "shutdown"
    if (state == 0) {
      stateName = 'shutdown';
    } else if (state == 1) {
      stateName = 'heat';
    } else if (state == 2) {
      stateName = 'cool';
    } else if (state == 3) {
      //ignore
    }
    this.log(`Sending signal: ${stateName}`)
    const commands = this.config[stateName].map((it) => {
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
        await fetch(`http://${this._address}/messages`, {
          body,
          method: 'post',
          headers: {
            'X-Requested-With': 'curl',
            'Content-Type': 'application/json',
            'Content-Length': body.length
          },
          timeout: 10 * 1000
        })
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