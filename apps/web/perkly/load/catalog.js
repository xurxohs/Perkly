import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    catalog_read: {
      executor: 'ramping-vus',
      stages: [
        { duration: '30s', target: 20 },
        { duration: '2m', target: 100 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
  },
};

const baseUrl = __ENV.BASE_URL || 'http://localhost:3001';

export default function () {
  const live = http.get(`${baseUrl}/health/live`);
  check(live, { 'health is live': (response) => response.status === 200 });
  const catalog = http.get(`${baseUrl}/offers?skip=0&take=20&sort=popular`);
  check(catalog, {
    'catalog returns successfully': (response) => response.status === 200,
    'catalog response is JSON': (response) => String(response.headers['Content-Type']).includes('application/json'),
  });
  sleep(1);
}
