# homebridge-nature-remo-aircon-local

Homebridge plugin for air conditioner with Nature Remo local api

Example:

```js
...

"accessories": [
  {
    "accessory": "NatureRemoAirconLocal",
    "name": "Aircon",
    "host": "192.168.X.X",
    "instance": "Remo-XXXX",
    "signals": {
      "heat": [...],
      "cool": [...],
      "shutdown": [...]
    },
    "heat": [
      {
        "signal": "heat",
        "delay": 100
      }
    ],
    "cool": [
      {
        "signal": "cool",
        "delay": 100
      }
    ],
    "shutdown": [
      {
        "signal": "cool",
        "delay": 100
      },
      {
        "signal": "shutdown",
        "delay": 0
      }
    ]
  }
]

...
```
