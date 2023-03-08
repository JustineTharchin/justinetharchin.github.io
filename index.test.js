const fs = require('fs');
const path = require('path');

const kdanseapi = require('./index');


function loadTestPlaylist(name) {
  return JSON.parse(fs.readFileSync(path.join('./tests/playlist', name + '.json'), 'utf-8'));
}


test('parseEventloopNext too small exception', () => {
  expect(() => kdanseapi.parseEventloopNext([])).toThrow('Synca1000 eventloop is too small');
});

test.each([
  {
    loop: [["a", 2], ["bbbb", 1], ["cccccccc", 4], ["d", 3]],
    expected: {forbidden: ["a", "bbbb", "cccccccc"], duration: 1},
  },
  {
    loop: [["a", 2], ["bbbb", 1], ["cccccccc", 4], ["d", 3]],
    expected: {forbidden: ["a", "bbbb", "cccccccc"], duration: 1},
  },
  {
    loop: [["2b5d69d3a0bd9277", 10000], ["2b5d69d3a0bd92771", 10000], ["2b5d69d3a0bd92772", 10000], ["7e1056063b08755a", 10000], ["b5ad6f5769189712", 10000]],
    expected: {forbidden: ["2b5d69d3a0bd9277", "2b5d69d3a0bd9277", "2b5d69d3a0bd9277"], duration: 10000},
  },
  {
    loop: [["a", 1], ["b", 2]],
    expected: {forbidden: [], duration: 2},
  },
])('parseEventloopNext(%j)', ({loop, expected}) => {
  expect(kdanseapi.parseEventloopNext(loop)).toEqual(expected);
});

test('getSequenceAt refDay', () => {
  pl = loadTestPlaylist('refdayv3').playlist;
  t = new Date();
  expect(() => kdanseapi.getSequenceAt(pl, t)).toThrow('Reference day is in the future: 2072-12-12');
});

test('getSequenceAt sort', () => {
  pl = {
    referenceDay: '2022-02-10',
    days: [
      [
        {
          begin: "12:00",
          end: "24:00",
          sequence: [
            "xxx",
          ],
        },
        {
          begin: "00:00",
          end: "12:00",
          sequence: [
            "yyy",
          ],
        },
      ],
    ],
  }
  t = new Date('2022-02-10T11:00:00');
  expect(kdanseapi.getSequenceAt(pl, t)).toEqual(["yyy"]);
});

test.each([
  {name: 'nodayv3', t: new Date(), expected: []},
  {name: 'noloopv3', t: new Date(), expected: []},
  {name: 'noschedv3', t: new Date(), expected: []},
  {name: 'miniv3', t: new Date('2022-02-10T11:00:00'), expected: [["m_0"]]},
  {name: 'miniv3', t: new Date('2022-02-10T18:00:00'), expected: []},
  {name: 'transitionsv4', t: new Date('2021-12-12T06:00:00'), expected: [["m_0"]]},
  {name: 'transitionsv4', t: new Date('2021-12-12T18:00:00'), expected: [["m_1"]]},
  {name: 'daysv41', t: new Date('2019-12-23T06:00:00'), expected: ["mid0"]},
  {name: 'daysv41', t: new Date('2019-12-22T18:00:00'), expected: ["mid6"]},
  {name: 'midnightv41', t: new Date(), expected: ["mid0"]},
])('getSequenceAt(%j)', ({name, t, expected}) => {
  pl = loadTestPlaylist(name).playlist;
  expect(kdanseapi.getSequenceAt(pl, t)).toEqual(expected);
});

test.each([
  {media: null, synca1000: null, expected: true},
  {media: null, synca1000: {}, expected: true},
  {media: [], synca1000: null, expected: true},
  {media: [], synca1000: {}, expected: true},
  {media: [["lapin"]], synca1000: null, expected: false},
  {
    media: null,
    synca1000: {
      "timeperiod": {"expiration": 1562072032.3140144, "value": "evening"},
      "weather": {"expiration": 1562072032.3140056, "value": "rain"},
    },
    expected: true,
  },
  {
    media: [],
    synca1000: {
      "timeperiod": {"expiration": 1562072032.3140144, "value": "evening"},
      "weather": {"expiration": 1562072032.3140056, "value": "rain"},
    },
    expected: true,
  },
  {
    media: [["weather"]],
    synca1000: {
      "timeperiod": {"expiration": 1562072032.3140144, "value": "evening"},
      "weather": {"expiration": 1562072032.3140056, "value": "rain"},
    },
    expected: true,
  },
  {
    media: [["choucroute"]],
    synca1000: {
      "timeperiod": {"expiration": 1562072032.3140144, "value": "evening"},
      "weather": {"expiration": 1562072032.3140056, "value": "rain"},
    },
    expected: false,
  },
  {
    media: [["!choucroute"]],
    synca1000: {
      "timeperiod": {"expiration": 1562072032.3140144, "value": "evening"},
      "weather": {"expiration": 1562072032.3140056, "value": "rain"},
    },
    expected: true,
  },
  {
    media: [["!weather"]],
    synca1000: {
      "timeperiod": {"expiration": 1562072032.3140144, "value": "evening"},
      "weather": {"expiration": 1562072032.3140056, "value": "rain"},
    },
    expected: false,
  },
  {
    media: [[{"weather": "rain"}]],
    synca1000: {
      "timeperiod": {"expiration": 1562072032.3140144, "value": "evening"},
      "weather": {"expiration": 1562072032.3140056, "value": "rain"},
    },
    expected: true,
  },
  {
    media: [[{"weather": "cloudy"}]],
    synca1000: {
      "timeperiod": {"expiration": 1562072032.3140144, "value": "evening"},
      "weather": {"expiration": 1562072032.3140056, "value": "rain"},
    },
    expected: false,
  },
  {
    media: [[{"timeperiod": "!choucroute"}]],
    synca1000: {
      "timeperiod": {"expiration": 1562072032.3140144, "value": "evening"},
      "weather": {"expiration": 1562072032.3140056, "value": "rain"},
    },
    expected: true,
  },
  {
    media: [[{"timeperiod": "!evening"}]],
    synca1000: {
      "timeperiod": {"expiration": 1562072032.3140144, "value": "evening"},
      "weather": {"expiration": 1562072032.3140056, "value": "rain"},
    },
    expected: false,
  },
  {
    media: [["weather"], ["choucroute"]],
    synca1000: {
      "timeperiod": {"expiration": 1562072032.3140144, "value": "evening"},
      "weather": {"expiration": 1562072032.3140056, "value": null}
    },
    expected: true,
  },
  {
    media: [["choucroute"], ["lapin"]],
    synca1000: {
      "timeperiod": {"expiration": 1562072032.3140144, "value": "evening"},
      "weather": { "expiration": 1562072032.3140056, "value": "rain"},
    },
    expected: false,
  },
  {
    media: [["weather"], ["!timeperiod"]],
    synca1000: {
      "timeperiod": {"expiration": 1562072032.3140144, "value": null},
      "weather": {"expiration": 1562072032.3140056, "value": "rain"},
    },
    expected: true,
  },
  {
    media: [["!weather"], ["!choucroute"]],
    synca1000: {
      "timeperiod": {"expiration": 1562072032.3140144, "value": null},
      "weather": {"expiration": 1562072032.3140056, "value": null},
    },
    expected: true,
  },
  {
    media: [["timeperiod"], ["!choucroute"]],
    synca1000: {
      "timeperiod": {"expiration": 1562072032.3140144, "value": "evening"},
      "weather": {"expiration": 1562072032.3140056, "value": "rain"},
    },
    expected: true,
  },
  {
    media: [["!weather"], ["!timeperiod"]],
    synca1000: {
      "timeperiod": {"expiration": 1562072032.3140144, "value": null},
      "weather": {"expiration": 1562072032.3140056, "value": null},
    },
    expected: false,
  },
  {
    media: [["weather", "timeperiod"]],
    synca1000: {
      "timeperiod": {"expiration": 1562072032.3140144, "value": null},
      "weather": {"expiration": 1562072032.3140056, "value": null},
    },
    expected: true,
  },
  {
    media: [["weather", "!pangolin"]],
    synca1000: {
      "timeperiod": {"expiration": 1562072032.3140144, "value": null},
      "weather": {"expiration": 1562072032.3140056, "value": null},
    },
    expected: true,
  },
  {
    media: [["!lapin", "!pangolin"]],
    synca1000: {
      "timeperiod": {"expiration": 1562072032.3140144, "value": null},
      "weather": {"expiration": 1562072032.3140056, "value": null},
    },
    expected: true,
  },
  {
    media: [["!timeperiod", "!weather"]],
    synca1000: {
      "timeperiod": {"expiration": 1562072032.3140144, "value": null},
      "weather": {"expiration": 1562072032.3140056, "value": null},
    },
    expected: false,
  },
  {
    media: [["!choucroute", {"weather": "rain"}]],
    synca1000: {
      "timeperiod": {"expiration": 1562072032.3140144, "value": "evening"},
      "weather": {"expiration": 1562072032.3140056, "value": "rain"},
    },
    expected: true,
  },
  {
    media: [["!choucroute", {"weather": "rain"}]],
    synca1000: {
      "timeperiod": {"expiration": 1562072032.3140144, "value": "evening"},
      "weather": {"expiration": 1562072032.3140056, "value": null},
    },
    expected: false,
  },
  {
    media: [["!timeperiod", {"weather": "rain"}]],
    synca1000: {
      "timeperiod": {"expiration": 1562072032.3140144, "value": "evening"},
      "weather": {"expiration": 1562072032.3140056, "value": "rain"},
    },
    expected: false,
  },
  {
    media: [["!timeperiod", {"weather": null}]],
    synca1000: {
      "timeperiod": {"expiration": 1562072032.3140144, "value": "evening"},
      "weather": {"expiration": 1562072032.3140056, "value": null},
    },
    expected: false,
  },
  {
    media: [["!timeperiod", {"weather": "sunny"}]],
    synca1000: {
      "timeperiod": {"expiration": 1562072032.3140144, "value": "evening"},
      "weather": {"expiration": 1562072032.3140056, "value": null},
    },
    expected: false,
  },
  {
    media: [["!timeperiod", {"weather": "sunny"}]],
    synca1000: {
      "timeperiod": {"expiration": 1562072032.3140144, "value": null},
      "weather": {"expiration": 1562072032.3140056, "value": "sunny"},
    },
    expected: false,
  },
  {
    media: [["!timeperiod", {"weather": "sunny"}]],
    synca1000: {
      "timeperiod": {"expiration": 1562072032.3140144, "value": null},
      "weather": {"expiration": 1562072032.3140056, "value": null},
    },
    expected: false,
  },
  {
    media: [["!timeperiod"], [{"weather": "sunny"}]],
    synca1000: {
      "timeperiod": {"expiration": 1562072032.3140144, "value": null},
      "weather": {"expiration": 1562072032.3140056, "value": null},
    },
    expected: false,
  },
  {
    media: [["!timeperiod"], [{"weather": "!sunny"}]],
    synca1000: {
      "timeperiod": {"expiration": 1562072032.3140144, "value": null},
      "weather": {"expiration": 1562072032.3140056, "value": null},
    },
    expected: true,
  },
  {
    media: [["!timeperiod"], [{"weather": "!sunny"}]],
    synca1000: {
      "timeperiod": {"expiration": 1562072032.3140144, "value": null},
      "weather": {"expiration": 1562072032.3140056, "value": "rain"},
    },
    expected: true,
  },
  {
    media: [[{"timeperiod": null}], [{"weather": "rain"}]],
    synca1000: {
      "timeperiod": {"expiration": 1562072032.3140144, "value": null},
      "weather": {"expiration": 1562072032.3140056, "value": "rain"},
    },
    expected: true,
  },
  {
    media: [[{"timeperiod": "evening"}], [{"weather": "rain"}]],
    synca1000: {
      "timeperiod": {"expiration": 1562072032.3140144, "value": "morning"},
      "weather": {"expiration": 1562072032.3140056, "value": "rain"},
    },
    expected: true,
  },
  {
    media: [[{"timeperiod": "evening"}], [{"weather": "!rain"}]],
    synca1000: {
      "timeperiod": {"expiration": 1562072032.3140144, "value": "morning"},
      "weather": {"expiration": 1562072032.3140056, "value": "rain"},
    },
    expected: false,
  },
  {
    media: [[{"timeperiod": "!evening"}], [{"weather": "!rain"}]],
    synca1000: {
      "timeperiod": {"expiration": 1562072032.3140144, "value": "morning"},
      "weather": {"expiration": 1562072032.3140056, "value": "rain"},
    },
    expected: true,
  },
  {
    media: [[{"timeperiod": "evening"}], ["!timeperiod", {"weather": "!rain"}]],
    synca1000: {
      "timeperiod": {"expiration": 1562072032.3140144, "value": "morning"},
      "weather": {"expiration": 1562072032.3140056, "value": "rain"},
    },
    expected: false,
  },
  {
    media: [[{"timeperiod": "evening"}], ["!timeperiod", {"weather": "rain"}]],
    synca1000: {
      "timeperiod": {"expiration": 1562072032.3140144, "value": null},
      "weather": {"expiration": 1562072032.3140056, "value": "rain"},
    },
    expected: false,
  },
  {
    media: [[{"timeperiod": "evening"}], ["!lapin", {"weather": "rain"}]],
    synca1000: {
      "timeperiod": {"expiration": 1562072032.3140144, "value": null},
      "weather": {"expiration": 1562072032.3140056, "value": "rain"},
    },
    expected: true,
  },
])('satisfyConditions(%j)', ({media, synca1000, expected}) => {
  expect(kdanseapi.satisfyConditions(media, synca1000)).toBe(expected);
});

test.each([
  {
    name: 'simplev3',
    expected: {
      syncids: {"28fbc292ab646dab": ["m_0"]},
      variants: {"m_0":{"id":"0","name":"foo.mp4","originName":"foo.mp4","duration":10000,"reservationId":"0"}},
    },
  },
  {
    name: 'singlev3',
    expected: {
      syncids: {"0444cc705e1aa5d0": ["m0"]},
      variants: {
        "m0": {
          "id": "DGBSCCBH2021825952",
          "name": "DGBSCCBH2021825952.mp4",
          "originName": "DGBSCCBH2021825952-STC 270121-rotated.mp4",
          "duration": 10000,
          "reservationId": "DGBSCBH2021337576"
        },
      },
    },
  },
  {
    name: 'playlistv3',
    expected: {
      syncids: {
        "0000": ['0'],
        "1000": ['1'],
        "2000": ['2'],
        "3000": ['3'],
        "4000": ['4'],
        "5000": ['5'],
        "6000": ['6'],
        "7000": ['7'],
        "8000": ['8'],
      },
      variants: {
        "0": {
          "idSynchro": "0000",
          "id": "DGBSCCFR2020453602",
          "name": "DGBSCCFR2020453602.png",
          "originName": "cron-card-1920x1080.png",
          "duration": 10000,
          "reservationId": "DGBSCFR2020190269",
        },
        "1": {
          "idSynchro": "1000",
          "id": "DGBSCCFR2020453600",
          "name": "DGBSCCFR2020453600.mp4",
          "originName": "1080p_2_h264_24fps_30s.mp4",
          "duration": 30000,
          "reservationId": "DGBSCFR2020190269",
        },
        "2": {
          "idSynchro": "2000",
          "id": "DGBSCCFR2020453601",
          "name": "DGBSCCFR2020453601.png",
          "originName": "iptables-card-1920x1080.png",
          "duration": 10000,
          "reservationId": "DGBSCFR2020190269",
        },
        "3": {
          "idSynchro": "3000",
          "id": "DGBSCCFR2020453605",
          "name": "DGBSCCFR2020453605.png",
          "originName": "no-gui-1920x1080.png",
          "duration": 10000,
          "reservationId": "DGBSCFR2020190269",
        },
        "4": {
          "idSynchro": "4000",
          "id": "DGBSCCFR2020476208",
          "name": "DGBSCCFR2020476208.png",
          "originName": "vim?emacs%ed+kate#gedit%252f.png",
          "duration": 24000,
          "reservationId": "DGBSCFR2020190269",
        },
        "5": {
          "idSynchro": "5000",
          "id": "DGBSCCFR2020453598",
          "name": "DGBSCCFR2020453598.png",
          "originName": "kernel-card-1920x1080.png",
          "duration": 10000,
          "reservationId": "DGBSCFR2020190269",
        },
        "6": {
          "idSynchro": "6000",
          "id": "DGBSCCFR2020453603",
          "name": "DGBSCCFR2020453603.mp4",
          "originName": "1080p_h264_30fps_26s.mp4",
          "duration": 26000,
          "reservationId": "DGBSCFR2020190269",
        },
        "7": {
          "idSynchro": "7000",
          "id": "DGBSCCFR2020453599",
          "name": "DGBSCCFR2020453599.mp4",
          "originName": "1080p_4_h264_24fps_29s.mp4",
          "duration": 29000,
          "reservationId": "DGBSCFR2020190269",
        },
        "8": {
          "idSynchro": "8000",
          "id": "DGBSCCFR2020453604",
          "name": "DGBSCCFR2020453604.mp4",
          "originName": "1080p_3_h264_24fps_31s.mp4",
          "duration": 31000,
          "reservationId": "DGBSCFR2020190269",
        },
      },
    },
  },
])('parsePlaylistV3(%s)', ({name, expected}) => {
  pl = loadTestPlaylist(name).playlist;
  expect(kdanseapi.parsePlaylistV3(pl)).toEqual(expected);
});

test.each([
  {
    name: 'simplev4',
    expected: {
      syncids: {"1d62f5296a75bb10": ["m_0"]},
      variants: {"m_0":{"popId":"0","uri":"foo.mp4","duration":10000}},
    },
  },
  {
    name: 'singlev4',
    expected: {
      syncids: {"2b5d69d3a0bd9277": ["m0"]},
      variants: {
        "m0": {
          "popId": "DGBSCCBH2021825952",
          "uri": "DGBSCCBH2021825952.mp4",
          "duration": 10000,
          "reservationId": "DGBSCBH2021337576",
        },
      },
    },
  },
  {
    name: 'playlistv4',
    expected: {
      syncids: {
        "c5e3e1a2f75e0689": ['0'],
        "219ad5b94449bc4e": ['1'],
        "7c8db4b61f811200": ['2'],
        "23decfa86d9febc6": ['3'],
        "db0fdb015adb4565": ['4'],
        "fb0104d7c0791f33": ['5'],
        "0046e6e15d3ef72a": ['6'],
        "386d0bd36de54445": ['7'],
        "e6aedd8db212f851": ['8'],
      },
      variants: {
        "0": {
          "idSynchro" : "0000",
          "popId" : "DGBSCCFR2020453602",
          "uri" : "DGBSCCFR2020453602.png",
          "duration" : 10000,
          "reservationId" : "DGBSCFR2020190269",
        },
        "1": {
          "idSynchro" : "1000",
          "popId" : "DGBSCCFR2020453600",
          "uri" : "DGBSCCFR2020453600.mp4",
          "duration" : 30000,
          "reservationId" : "DGBSCFR2020190269",
        },
        "2": {
          "idSynchro" : "2000",
          "popId" : "DGBSCCFR2020453601",
          "uri" : "DGBSCCFR2020453601.png",
          "duration" : 10000,
          "reservationId" : "DGBSCFR2020190269",
        },
        "3": {
          "idSynchro" : "3000",
          "popId" : "DGBSCCFR2020453605",
          "uri" : "DGBSCCFR2020453605.png",
          "duration" : 10000,
          "reservationId" : "DGBSCFR2020190269",
        },
        "4": {
          "idSynchro" : "4000",
          "popId" : "DGBSCCFR2020476208",
          "uri" : "DGBSCCFR2020476208.png",
          "duration" : 24000,
          "reservationId" : "DGBSCFR2020190269",
        },
        "5": {
          "idSynchro" : "5000",
          "popId" : "DGBSCCFR2020453598",
          "uri" : "DGBSCCFR2020453598.png",
          "duration" : 10000,
          "reservationId" : "DGBSCFR2020190269",
        },
        "6": {
          "idSynchro" : "6000",
          "popId" : "DGBSCCFR2020453603",
          "uri" : "DGBSCCFR2020453603.mp4",
          "duration" : 26000,
          "reservationId" : "DGBSCFR2020190269",
        },
        "7": {
          "idSynchro" : "7000",
          "popId" : "DGBSCCFR2020453599",
          "uri" : "DGBSCCFR2020453599.mp4",
          "duration" : 29000,
          "reservationId" : "DGBSCFR2020190269",
        },
        "8": {
          "idSynchro" : "8000",
          "popId" : "DGBSCCFR2020453604",
          "uri" : "DGBSCCFR2020453604.mp4",
          "duration" : 31000,
          "reservationId" : "DGBSCFR2020190269",
        },
      },
    },
  },
])('parsePlaylistV4(%s)', ({name, expected}) => {
  pl = loadTestPlaylist(name).playlist;
  expect(kdanseapi.parsePlaylistV4(pl)).toEqual(expected);
});

test.each([
  {
    name: 'simplev41',
    expected: {
      syncids: {"yepyepyepyep": ["m_0"]},
      variants: {"m_0":{"popId":"0","uri":"foo.mp4","duration":10000}},
    },
  },
  {
    name: 'singlev41',
    expected: {
      syncids: {"onvisevingthuitcaracteresxxx": ["m0"]},
      variants: {
        "m0": {
          "popId": "DGBSCCBH2021825952",
          "uri": "DGBSCCBH2021825952.mp4",
          "duration": 10000,
          "reservationId": "DGBSCBH2021337576",
        },
      },
    },
  },
  {
    name: 'playlistv41',
    expected: {
      syncids: {
        "0000": ['0'],
        "1000": ['1'],
        "2000": ['2'],
        "3000": ['3'],
        "4000": ['4'],
        "5000": ['5'],
        "6000": ['6'],
        "7000": ['7'],
        "8000": ['8']
      },
      variants: {
        "0": {
          "idSynchro" : "0000",
          "popId" : "DGBSCCFR2020453602",
          "uri" : "DGBSCCFR2020453602.png",
          "duration" : 10000,
          "reservationId" : "DGBSCFR2020190269",
        },
        "1": {
          "idSynchro" : "1000",
          "popId" : "DGBSCCFR2020453600",
          "uri" : "DGBSCCFR2020453600.mp4",
          "duration" : 30000,
          "reservationId" : "DGBSCFR2020190269",
        },
        "2": {
          "idSynchro" : "2000",
          "popId" : "DGBSCCFR2020453601",
          "uri" : "DGBSCCFR2020453601.png",
          "duration" : 10000,
          "reservationId" : "DGBSCFR2020190269",
        },
        "3": {
          "idSynchro" : "3000",
          "popId" : "DGBSCCFR2020453605",
          "uri" : "DGBSCCFR2020453605.png",
          "duration" : 10000,
          "reservationId" : "DGBSCFR2020190269",
        },
        "4": {
          "idSynchro" : "4000",
          "popId" : "DGBSCCFR2020476208",
          "uri" : "DGBSCCFR2020476208.png",
          "duration" : 24000,
          "reservationId" : "DGBSCFR2020190269",
        },
        "5": {
          "idSynchro" : "5000",
          "popId" : "DGBSCCFR2020453598",
          "uri" : "DGBSCCFR2020453598.png",
          "duration" : 10000,
          "reservationId" : "DGBSCFR2020190269",
        },
        "6": {
          "idSynchro" : "6000",
          "popId" : "DGBSCCFR2020453603",
          "uri" : "DGBSCCFR2020453603.mp4",
          "duration" : 26000,
          "reservationId" : "DGBSCFR2020190269",
        },
        "7": {
          "idSynchro" : "7000",
          "popId" : "DGBSCCFR2020453599",
          "uri" : "DGBSCCFR2020453599.mp4",
          "duration" : 29000,
          "reservationId" : "DGBSCFR2020190269",
        },
        "8": {
          "idSynchro" : "8000",
          "popId" : "DGBSCCFR2020453604",
          "uri" : "DGBSCCFR2020453604.mp4",
          "duration" : 31000,
          "reservationId" : "DGBSCFR2020190269",
        },
      },
    },
  },
])('parsePlaylistV41(%s)', ({name, expected}) => {
  pl = loadTestPlaylist(name).playlist;
  expect(kdanseapi.parsePlaylistV41(pl)).toEqual(expected);
});

test.each([
  {
    synca1000: {forbidden: ["a", "b", "c"], duration: 2},
    pl: {syncids: {}, variants: {}},
    conditions: {},
    expected: [],
  },
  {
    synca1000: {forbidden: ["a", "b", "c"], duration: 2},
    pl: {syncids: {d: ["d"]}, variants: {d: {duration: 3, name: "foo.mp4", id: "foo", reservationId: "fooo"}}},
    conditions: {},
    expected: [],
  },
  {
    synca1000: {forbidden: ["a", "b", "c"], duration: 2},
    pl: {syncids: {d: ["d"]}, variants: {d: {duration: 3, uri: "foo.mp4", popId: "foo", reservationId: "fooo"}}},
    conditions: {},
    expected: [],
  },
  {
    synca1000: {forbidden: ["a", "b", "c"], duration: 2},
    pl: {syncids: {d: ["d"]}, variants: {d: {duration: 2, name: "foo.html", id: "foo", reservationId: "fooo"}}},
    conditions: {},
    expected: [],
  },
  {
    synca1000: {forbidden: ["a", "b", "c"], duration: 2},
    pl: {syncids: {d: ["d"]}, variants: {d: {duration: 2, uri: "foo.html", popId: "foo", reservationId: "fooo"}}},
    conditions: {},
    expected: [],
  },
  {
    synca1000: {forbidden: ["a", "b", "c"], duration: 2},
    pl: {syncids: {d: ["d"]}, variants: {d: {duration: 2, name: "", url: "http://google.com", id: "foo", reservationId: "fooo"}}},
    conditions: {},
    expected: [],
  },
  {
    synca1000: {forbidden: ["a", "b", "c"], duration: 2},
    pl: {syncids: {d: ["d"]}, variants: {d: {duration: 2, uri: "http://google.com", popId: "foo", reservationId: "fooo"}}},
    conditions: {},
    expected: [],
  },
  {
    synca1000: {forbidden: ["0000", "1000", "2000"], duration: 10000},
    pl: {
      syncids: {
        "0000": ['0'],
        "1000": ['1'],
        "2000": ['2'],
        "3000": ['3'],
        "4000": ['4'],
        "5000": ['5'],
        "6000": ['6'],
        "7000": ['7'],
        "8000": ['8'],
      },
      variants: {
        "0": {
          "idSynchro": "0000",
          "id": "DGBSCCFR2020453602",
          "name": "DGBSCCFR2020453602.png",
          "originName": "AF-FB_cron-card-1920x1080.png",
          "duration": 10000,
          "reservationId": "DGBSCFR2020190269",
        },
        "1": {
          "idSynchro": "1000",
          "id": "DGBSCCFR2020453600",
          "name": "DGBSCCFR2020453600.mp4",
          "originName": "AF-FB_1080p_2_h264_24fps_30s.mp4",
          "duration": 30000,
          "reservationId": "DGBSCFR2020190269",
        },
        "2": {
          "idSynchro": "2000",
          "id": "DGBSCCFR2020453601",
          "name": "AF-FB_DGBSCCFR2020453601.png",
          "originName": "AF-FB_iptables-card-1920x1080.png",
          "duration": 10000,
          "reservationId": "DGBSCFR2020190269",
        },
        "3": {
          "idSynchro": "3000",
          "id": "DGBSCCFR2020453605",
          "name": "DGBSCCFR2020453605.png",
          "originName": "AF-FB_no-gui-1920x1080.png",
          "duration": 10000,
          "reservationId": "DGBSCFR2020190269",
        },
        "4": {
          "idSynchro": "4000",
          "id": "DGBSCCFR2020476208",
          "name": "DGBSCCFR2020476208.png",
          "originName": "vim?emacs%ed+kate#gedit%252f.png",
          "duration": 24000,
          "reservationId": "DGBSCFR2020190269",
        },
        "5": {
          "idSynchro": "5000",
          "id": "DGBSCCFR2020453598",
          "name": "DGBSCCFR2020453598.png",
          "originName": "kernel-card-1920x1080.png",
          "duration": 10000,
          "reservationId": "DGBSCFR2020190269",
        },
        "6": {
          "idSynchro": "6000",
          "id": "DGBSCCFR2020453603",
          "name": "DGBSCCFR2020453603.mp4",
          "originName": "AF-FB_1080p_h264_30fps_26s.mp4",
          "duration": 26000,
          "reservationId": "DGBSCFR2020190269",
        },
        "7": {
          "idSynchro": "7000",
          "id": "DGBSCCFR2020453599",
          "name": "DGBSCCFR2020453599.mp4",
          "originName": "AF-FB_1080p_4_h264_24fps_29s.mp4",
          "duration": 29000,
          "reservationId": "DGBSCFR2020190269",
        },
        "8": {
          "idSynchro": "8000",
          "id": "DGBSCCFR2020453604",
          "name": "DGBSCCFR2020453604.mp4",
          "originName": "AF-FB_1080p_3_h264_24fps_31s.mp4",
          "duration": 31000,
          "reservationId": "DGBSCFR2020190269",
        },
      },
    },
    conditions: {},
    expected: [
      {
        jcddms_fillercreativeid: "DGBSCCFR2020453605",
        path: "/DGBSCCFR2020453605.png",
        jcddms_fillerreservationid: "DGBSCFR2020190269",
        jcddms_fillerduration: 10000,
      },
      {
        jcddms_fillercreativeid: "DGBSCCFR2020453598",
        path: "/DGBSCCFR2020453598.png",
        jcddms_fillerreservationid: "DGBSCFR2020190269",
        jcddms_fillerduration: 10000,
      },
    ],
  },
  {
    synca1000: {forbidden: ["0000", "1000", "2000"], duration: 10000},
    pl: {
      syncids: {
        "0000": ['0'],
        "1000": ['1'],
        "2000": ['2'],
        "3000": ['3'],
        "4000": ['4'],
        "5000": ['5'],
        "6000": ['6'],
        "7000": ['7'],
        "8000": ['8'],
      },
      variants: {
        "0": {
          "idSynchro": "0000",
          "popId": "DGBSCCFR2020453602",
          "uri": "DGBSCCFR2020453602.png",
          "duration": 10000,
          "reservationId": "DGBSCFR2020190269",
        },
        "1": {
          "idSynchro": "1000",
          "popId": "DGBSCCFR2020453600",
          "uri": "DGBSCCFR2020453600.mp4",
          "duration": 30000,
          "reservationId": "DGBSCFR2020190269",
        },
        "2": {
          "idSynchro": "2000",
          "popId": "DGBSCCFR2020453601",
          "uri": "DGBSCCFR2020453601.png",
          "duration": 10000,
          "reservationId": "DGBSCFR2020190269",
        },
        "3": {
          "idSynchro": "3000",
          "popId": "DGBSCCFR2020453605",
          "uri": "DGBSCCFR2020453605.png",
          "duration": 10000,
          "reservationId": "DGBSCFR2020190269",
        },
        "4": {
          "idSynchro": "4000",
          "popId": "DGBSCCFR2020476208",
          "uri": "DGBSCCFR2020476208.png",
          "duration": 24000,
          "reservationId": "DGBSCFR2020190269",
        },
        "5": {
          "idSynchro": "5000",
          "popId": "DGBSCCFR2020453598",
          "uri": "DGBSCCFR2020453598.png",
          "duration": 10000,
          "reservationId": "DGBSCFR2020190269",
        },
        "6": {
          "idSynchro": "6000",
          "popId": "DGBSCCFR2020453603",
          "uri": "DGBSCCFR2020453603.mp4",
          "duration": 26000,
          "reservationId": "DGBSCFR2020190269",
        },
        "7": {
          "idSynchro": "7000",
          "popId": "DGBSCCFR2020453599",
          "uri": "DGBSCCFR2020453599.mp4",
          "duration": 29000,
          "reservationId": "DGBSCFR2020190269",
        },
        "8": {
          "idSynchro": "8000",
          "popId": "DGBSCCFR2020453604",
          "uri": "DGBSCCFR2020453604.mp4",
          "duration": 31000,
          "reservationId": "DGBSCFR2020190269",
        },
      },
    },
    conditions: {},
    expected: [
      {
        jcddms_fillercreativeid: "DGBSCCFR2020453605",
        path: "/DGBSCCFR2020453605.png",
        jcddms_fillerreservationid: "DGBSCFR2020190269",
        jcddms_fillerduration: 10000,
      },
      {
        jcddms_fillercreativeid: "DGBSCCFR2020453598",
        path: "/DGBSCCFR2020453598.png",
        jcddms_fillerreservationid: "DGBSCFR2020190269",
        jcddms_fillerduration: 10000,
      },
    ],
  },
  {
    synca1000: {forbidden: ["a", "b", "c"], duration: 2},
    pl: {
      syncids: {d: ["d", "e", "f"]},
      variants: {
        d: {duration: 2, name: "foo.mp4", id: "foo", reservationId: "fooo", conditions: [["!lapin"]]},
        e: {duration: 2, name: "bar.mp4", id: "bar", reservationId: "barr", conditions: [["pangolin"]]},
        f: {duration: 2, name: "baz.mp4", id: "baz", reservationId: "bazz", conditions: [["hippo"]]},
      },
    },
    conditions: {lapin: {value: "grenade"}},
    expected: [],
  },
  {
    synca1000: {forbidden: ["a", "b", "c"], duration: 2},
    pl: {
      syncids: {d: ["d", "e", "f"]},
      variants: {
        d: {duration: 2, name: "foo.mp4", id: "foo", reservationId: "fooo", conditions: [["!lapin"]]},
        e: {duration: 2, name: "bar.mp4", id: "bar", reservationId: "barr", conditions: [["pangolin"]]},
        f: {duration: 2, name: "baz.mp4", id: "baz", reservationId: "bazz", conditions: [["hippo"]]},
      },
    },
    conditions: {},
    expected: [
      {
        jcddms_fillercreativeid: "foo",
        path: "/foo.mp4",
        jcddms_fillerreservationid: "fooo",
        jcddms_fillerduration: 2,
      },
    ],
  },
  {
    synca1000: {forbidden: ["a", "b", "c"], duration: 2},
    pl: {
      syncids: {d: ["d", "e", "f"]},
      variants: {
        d: {duration: 2, name: "foo.mp4", id: "foo", reservationId: "fooo", conditions: [["!lapin"]]},
        e: {duration: 2, name: "bar.mp4", id: "bar", reservationId: "barr", conditions: [["pangolin"]]},
        f: {duration: 2, name: "baz.mp4", id: "baz", reservationId: "bazz", conditions: [["hippo"]]},
      },
    },
    conditions: {hippo: {value: "lourd"}},
    expected: [
      {
        jcddms_fillercreativeid: "foo",
        path: "/foo.mp4",
        jcddms_fillerreservationid: "fooo",
        jcddms_fillerduration: 2,
      },
      {
        jcddms_fillercreativeid: "baz",
        path: "/baz.mp4",
        jcddms_fillerreservationid: "bazz",
        jcddms_fillerduration: 2,
      },
    ],
  },
  {
    synca1000: {forbidden: ["a", "b", "c"], duration: 2},
    pl: {
      syncids: {d: ["d", "e", "f"]},
      variants: {
        d: {duration: 2, name: "foo.mp4", id: "foo", reservationId: "fooo", conditions: [["!lapin"]]},
        e: {duration: 2, name: "bar.mp4", id: "bar", reservationId: "barr", conditions: [["pangolin"]]},
        f: {duration: 2, name: "baz.mp4", id: "baz", reservationId: "bazz", conditions: [["hippo"]]},
      },
    },
    conditions: {hippo: {value: "lourd"}, pangolin: {value: null}},
    expected: [
      {
        jcddms_fillercreativeid: "foo",
        path: "/foo.mp4",
        jcddms_fillerreservationid: "fooo",
        jcddms_fillerduration: 2,
      },
      {
        jcddms_fillercreativeid: "bar",
        path: "/bar.mp4",
        jcddms_fillerreservationid: "barr",
        jcddms_fillerduration: 2,
      },
      {
        jcddms_fillercreativeid: "baz",
        path: "/baz.mp4",
        jcddms_fillerreservationid: "bazz",
        jcddms_fillerduration: 2,
      },
    ],
  },
  {
    synca1000: {forbidden: ["a", "b", "c"], duration: 2},
    pl: {
      syncids: {d: ["d", "e", "f"]},
      variants: {
        d: {
          duration: 2,
          name: "foo.mp4",
          id: "foo",
          reservationId: "fooo",
          conditions: [["!lapin"]],
          activationTs: Math.floor(Date.now() / 1000 + 3600),
        },
        e: {
          duration: 2,
          name: "bar.mp4",
          id: "bar",
          reservationId: "barr",
          conditions: [["pangolin"]],
          activationTs: Math.floor(Date.now() / 1000 - 3600),
          deactivationTs: Math.floor(Date.now() / 1000 + 3600),
        },
        f: {
          duration: 2,
          name: "baz.mp4",
          id: "baz",
          reservationId: "bazz",
          conditions: [["hippo"]],
          deactivationTs: Math.floor(Date.now() / 1000 - 3600),
        },
      },
    },
    conditions: {hippo: {value: "lourd"}, pangolin: {value: null}},
    expected: [
      {
        jcddms_fillercreativeid: "bar",
        path: "/bar.mp4",
        jcddms_fillerreservationid: "barr",
        jcddms_fillerduration: 2,
      },
    ],
  },
])('getSuitableMediaVariants(%j)', ({synca1000, pl, conditions, expected}) => {
  expect(kdanseapi.getSuitableMediaVariants(synca1000, pl, conditions)).toEqual(expected);
});

// MES TESTS
