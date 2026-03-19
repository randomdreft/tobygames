'use strict';

const CONFIG = {
  TOWER_WIDTH: 36,
  FLOOR_MIN: -2,
  FLOOR_MAX: 25,
  UNIT_PX: 16,
  FLOOR_PX: 40,
  GROUND_MARGIN: 100,
  START_MONEY: 500000,
  SPEEDS: [0, 2, 5, 15],
  DEFAULT_SPEED: 2,
  STARS: [
    { pop: 0, label: '\u2b50' },
    { pop: 50, label: '\u2b50\u2b50' },
    { pop: 150, label: '\u2b50\u2b50\u2b50' },
    { pop: 300, label: '\u2b50\u2b50\u2b50\u2b50' },
    { pop: 500, label: '\u2b50\u2b50\u2b50\u2b50\u2b50' },
  ],
  ELEVATOR_SPEED: 3,
  ELEVATOR_CAPACITY: 8,
  ELEVATOR_STOP_TIME: 1.5,
  SAVE_INTERVAL: 30000,
};

const ROOM_TYPES = [
  'lobby', 'stairs', 'elevator', 'office', 'apartment',
  'shop', 'restaurant', 'hotel', 'cinema',
];

const ROOMS = {
  lobby: {
    name: 'Lobby', emoji: '\ud83c\udfe2', width: 36, cost: 0, income: 0,
    minStar: 1, color: '#f5e6c8', description: 'Hoofdingang (verplicht)',
    onlyFloor: 0, population: 0, hours: null,
  },
  office: {
    name: 'Kantoor', emoji: '\ud83d\udcbc', width: 8, cost: 20000, income: 400,
    hours: [9, 17], minStar: 1, color: '#c8d8e8', description: '6 werkplekken',
    population: 6,
  },
  apartment: {
    name: 'Appartement', emoji: '\ud83c\udfe0', width: 4, cost: 30000, income: 200,
    hours: null, minStar: 1, color: '#e8d8c8', description: '3 bewoners',
    population: 3,
  },
  shop: {
    name: 'Winkel', emoji: '\ud83d\udecd\ufe0f', width: 4, cost: 25000, income: 300,
    hours: [8, 20], minStar: 1, color: '#c8e8c8', description: 'Winkeltje',
    population: 6,
  },
  restaurant: {
    name: 'Restaurant', emoji: '\ud83c\udf7d\ufe0f', width: 10, cost: 80000, income: 600,
    hours: [11, 22], minStar: 2, color: '#e8c8c8', description: 'Eetgelegenheid',
    population: 16,
  },
  hotel: {
    name: 'Hotel', emoji: '\ud83d\udecf\ufe0f', width: 2, cost: 40000, income: 500,
    hours: [18, 8], minStar: 3, color: '#d8c8e8', description: 'Hotelkamer',
    population: 2,
  },
  cinema: {
    name: 'Bioscoop', emoji: '\ud83c\udfac', width: 14, cost: 150000, income: 800,
    hours: [14, 24], minStar: 3, color: '#3a3a4a', description: 'Bioscoopzaal',
    population: 24,
  },
  stairs: {
    name: 'Trap', emoji: '\ud83e\ude9c', width: 2, cost: 5000, income: 0,
    minStar: 1, color: '#d0d0d0', description: 'Verbindt 2 verdiepingen',
    population: 0, isTransport: true,
  },
  elevator: {
    name: 'Lift', emoji: '\ud83d\udbd7\ufe0f', width: 2, cost: 10000, income: 0,
    minStar: 1, color: '#b0b0c0', description: 'Per verdieping',
    population: 0, isTransport: true, isElevator: true,
  },
};
