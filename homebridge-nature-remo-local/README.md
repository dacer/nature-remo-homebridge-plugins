# homebridge-nature-remo-local

Homebridge plugin for Nature Remo using local APIs.

## Usage

```js
"accessories": [
  {
    "accessory": "NatureRemo",
    "name": "TV",
    "remo_ip": "192.168.0.1",
    "type": "switch", //[switch, light, fan] default: switch
    "signals" {
      "power": [...],
      "enter": [...]
    },
    "on": [
      {
        "signal": "power",
        "delay": 100000
      }
    ],
    "off": [
      {
        "signal": "power",
        "delay": 100
      },
      {
        "signal": "enter",
        "delay": 0
      }
    ]
  }
]
```

* `remo_ip`: The ip address of Nature Remo.
* `signals`: The IR signals.
* `on`: The signals to send when switch is turned on.
* `off`: The signals to send when switch is turned off.

## License

[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)
