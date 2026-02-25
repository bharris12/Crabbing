import { Station } from './types';

export const STATIONS: Station[] = [
  {
    id: '9414290',
    name: 'Golden Gate (SF)',
    lat: 37.8067,
    lng: -122.465,
    description: 'Fort Point, Ocean Beach, and Baker Beach area.',
    webcamUrl: 'https://www.surfline.com/surf-report/ocean-beach/5842041f4e65fad6a77087f8'
  },
  {
    id: '9414131',
    name: 'Pillar Point (Pacifica)',
    lat: 37.5000,
    lng: -122.485,
    description: 'Pacifica Pier and Half Moon Bay area.',
    webcamUrl: 'https://www.surfline.com/surf-report/linda-mar/5842041f4e65fad6a770882e'
  },
  {
    id: '9414806',
    name: 'Fort Baker (Sausalito)',
    lat: 37.835,
    lng: -122.478,
    description: 'Marin Headlands and Sausalito crabbing spots.'
  },
  {
    id: '9414863',
    name: 'Richmond',
    lat: 37.923,
    lng: -122.402,
    description: 'East Bay crabbing near Richmond and Berkeley.'
  },
  {
    id: '9414750',
    name: 'Alameda',
    lat: 37.772,
    lng: -122.298,
    description: 'Alameda and Oakland waterfront.'
  }
];

export const IDEAL_WINDOW_HOURS = 2;
