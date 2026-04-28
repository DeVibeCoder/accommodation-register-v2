const args = process.argv.slice(2);
const urlArg = args.find(arg => arg.startsWith('--url='));
const cookieArg = args.find(arg => arg.startsWith('--cookie='));

const baseUrl = (urlArg ? urlArg.slice('--url='.length) : process.env.OCCUPANCY_HEALTH_URL || '').trim();
const cookie = (cookieArg ? cookieArg.slice('--cookie='.length) : process.env.OCCUPANCY_HEALTH_COOKIE || '').trim();

if (!baseUrl) {
  console.error('Missing --url=<base-url> or OCCUPANCY_HEALTH_URL');
  process.exit(1);
}

const endpoint = `${baseUrl.replace(/\/$/, '')}/api/occupancy?mode=health`;
const response = await fetch(endpoint, {
  headers: cookie ? { cookie } : {},
});

const contentType = response.headers.get('content-type') || '';
const payload = contentType.includes('application/json')
  ? await response.json()
  : await response.text();

if (!response.ok) {
  console.error('Health check failed:', response.status, payload);
  process.exit(1);
}

console.log(JSON.stringify(payload, null, 2));
if (payload && payload.ok === false) {
  process.exit(2);
}
