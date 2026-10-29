// Dependency-free Chromium smoke check. Build into .tmp/day15-build first.
// UI fixtures test rendering and interactions; they do not replace real API integration tests.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const fixtureId = '507f1f77bcf86cd799439011';
const longTitle = 'Graduation project for resilient university systems ' + 'LongTitle'.repeat(15);
let role = 'student';
let failWorkspace = false;
let failArchive = false;
let savedTitle;
const project = () => ({ _id: fixtureId, title: longTitle, abstract: 'Research abstract', problemStatement: 'Research problem', methodology: 'Iterative development', students: [{ _id: fixtureId, name: 'Student', department: 'Computing' }], supervisorId: { _id: 'supervisor', name: 'Supervisor' }, status: 'Draft', progress: 0, health: { status: 'Healthy' }, milestoneSummary: { completed: 0, total: 1, overdue: 0 } });
const defense = () => ({ _id: fixtureId, projectId: project(), examinerIds: [{ _id: fixtureId, name: 'Examiner' }], date: '2026-11-15', startTime: '09:00', endTime: '10:30', room: 'Seminar Room', status: 'scheduled' });
function api(url, method, body) {
  if (method === 'OPTIONS') return {};
  const endpoint = new URL(url).pathname;
  if (endpoint === '/api/auth/me') return { data: { _id: fixtureId, name: `${role} Reviewer`, email: 'reviewer@example.com', role } };
  if (failWorkspace && endpoint === '/api/defenses') return { status: 503, message: 'Schedules temporarily unavailable' };
  if (failArchive && endpoint === '/api/projects/archive') return { status: 503, message: 'Archive temporarily unavailable' };
  if (endpoint === '/api/projects/dashboard') return { data: { projects: [project()], stats: { totalProjects: 1, assignedDefenses: 1 }, totalProjects: 1, pendingProposals: 0, projectsByStatus: { Draft: 1 }, healthCounts: { Healthy: 1 }, supervisorWorkload: [], upcomingDefenses: [] } };
  if (endpoint === '/api/defenses') return { data: [defense()] };
  if (endpoint === '/api/defenses/schedulable-projects') return { data: [project()] };
  if (endpoint === '/api/defenses/examiners') return { data: [{ _id: fixtureId, name: 'Examiner' }] };
  if (endpoint === '/api/users/supervisors') return { data: [{ _id: 'supervisor', name: 'Supervisor', email: 's@example.com', skills: [] }] };
  if (endpoint === '/api/projects/archive') return { data: [{ ...project(), status: 'Completed', department: 'Computing', supervisor: project().supervisorId, score: 90, technologies: ['React'], links: [] }] };
  if (endpoint.endsWith('/milestones')) return { data: [{ _id: fixtureId, title: longTitle, status: 'pending', order: 1 }] };
  if (endpoint.endsWith('/submissions') || endpoint.endsWith('/evaluations') || endpoint.startsWith('/api/notifications')) return { data: [] };
  if (method === 'PUT' && endpoint === `/api/projects/${fixtureId}`) { savedTitle = JSON.parse(body).title; return { data: project() }; }
  if (endpoint.endsWith('/submit')) return { status: 'Submitted' };
  return { data: [project()] };
}

(async () => {
  let browser;
  let socket;
  const server = http.createServer((req, res) => {
    const file = path.join(root, '.tmp/day15-build', req.url === '/' ? 'index.html' : req.url.split('?')[0]);
    if (!file.startsWith(path.join(root, '.tmp/day15-build'))) { res.writeHead(403).end(); return; }
    try {
      res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html');
      res.end(fs.readFileSync(file));
    } catch { res.writeHead(404).end(); }
  }).listen(0, '127.0.0.1');
  try {
    await new Promise(resolve => server.once('listening', resolve));
    const profile = path.join(root, '.tmp', `browser-qa-${Date.now()}`);
    browser = spawn(process.env.CHROMIUM_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
    const activePort = path.join(profile, 'DevToolsActivePort');
    for (let i = 0; i < 100 && !fs.existsSync(activePort); i++) await wait(100);
    assert.ok(fs.existsSync(activePort), 'headless browser started');
    const port = fs.readFileSync(activePort, 'utf8').split('\n')[0];
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
    await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
    let sequence = 0;
    const pending = new Map();
    const exceptions = [];
    const requests = [];
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params }));
    });
    socket.addEventListener('message', async event => {
      const data = JSON.parse(event.data);
      if (data.id) {
        const promise = pending.get(data.id); pending.delete(data.id);
        if (promise) data.error ? promise.reject(new Error(data.error.message)) : promise.resolve(data.result);
      }
      if (data.method === 'Runtime.exceptionThrown') exceptions.push(data.params.exceptionDetails.text);
      if (data.method === 'Fetch.requestPaused') {
        const { requestId, request } = data.params;
        requests.push(`${request.method} ${new URL(request.url).pathname}`);
        const result = api(request.url, request.method, request.postData);
        await send('Fetch.fulfillRequest', { requestId, responseCode: typeof result.status === 'number' ? result.status : 200, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: origin }, { name: 'Access-Control-Allow-Credentials', value: 'true' }, { name: 'Access-Control-Allow-Headers', value: 'Authorization, Content-Type' }, { name: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, PATCH, OPTIONS' }], body: Buffer.from(JSON.stringify(result)).toString('base64') });
      }
    });
    await send('Page.enable'); await send('Runtime.enable');
    // Check system-font fallback without depending on Google font servers.
    await send('Network.enable');
    await send('Network.setBlockedURLs', { urls: ['*://fonts.googleapis.com/*', '*://fonts.gstatic.com/*'] });
    await send('Fetch.enable', { patterns: [{ urlPattern: 'http://localhost:5000/*' }] });
    const evaluate = async expression => {
      const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
      return result.result.value;
    };
    const until = async expression => {
      for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await wait(50); }
      throw new Error(`Timed out: ${expression}; requests: ${requests.join(', ')}; alerts: ${await evaluate('[...document.querySelectorAll("[role=alert]")].map(e=>e.textContent).join(" ")')}; page: ${(await evaluate('document.body.innerText')).slice(-900)}`);
    };
    const origin = `http://127.0.0.1:${server.address().port}`;
    await send('Page.navigate', { url: origin });
    await until('Boolean(document.querySelector("form"))');
    await evaluate("localStorage.setItem('gradflow-token', 'ui-fixture')");
    let pages = 0;
    for (role of ['student', 'supervisor', 'coordinator', 'examiner']) {
      await send('Page.navigate', { url: `${origin}/#overview` });
      await send('Page.reload');
      await until('Boolean(document.querySelector(".route-nav")) && !document.querySelector("#page-content").hidden');
      const routes = await evaluate('[...document.querySelectorAll(".route-nav button")].map(b => b.textContent)');
      for (const width of [320, 360, 768, 1440]) {
        await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
        for (const label of routes) {
          await evaluate(`[...document.querySelectorAll('.route-nav button')].find(b => b.textContent === ${JSON.stringify(label)}).click()`);
          await wait(75);
          assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true, `${role} ${label} fits ${width}px`);
          assert.equal(await evaluate("document.body.innerText.includes('This page could not be displayed')"), false);
          pages++;
        }
      }
      console.log(`${role}: all ${routes.length} pages fit phone, tablet, desktop`);
      if (role === 'examiner') {
        await evaluate("[...document.querySelectorAll('.route-nav button')].find(b => b.textContent === 'Assigned Defenses').click()");
        await wait(75);
        await evaluate("[...document.querySelectorAll('button')].find(b => b.textContent.includes('Evaluate Oral Defense')).click()");
        for (const width of [320, 768, 1440]) {
          await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
          await wait(75);
          assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true, `evaluation fits ${width}px: ${await evaluate('[...document.querySelectorAll("#page-content *")].filter(e => e.getBoundingClientRect().right > innerWidth + 1).slice(0,6).map(e => e.tagName + ":" + e.className + ":" + e.textContent.slice(0,50)).join("; ")')}`);
        }
        await evaluate("[...document.querySelectorAll('button')].find(b => b.textContent.includes('Submit Official Defense Evaluation')).click()");
        await until('Boolean(document.querySelector("[role=dialog]"))');
        await send('Emulation.setDeviceMetricsOverride', { width: 320, height: 600, deviceScaleFactor: 1, mobile: false });
        assert.equal(await evaluate('document.querySelector("[role=dialog]").getBoundingClientRect().width <= window.innerWidth'), true);
        await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await until('!document.querySelector("[role=dialog]")');
      }
    }
    role = 'student'; failWorkspace = true;
    await send('Page.navigate', { url: `${origin}/#overview` });
      await send('Page.reload');
    await until("document.body.innerText.includes('Schedules temporarily unavailable')");
    failWorkspace = false;
    await evaluate("[...document.querySelectorAll('button')].find(b => b.textContent === 'Try again').click()");
    await until('!document.querySelector("#page-content").hidden');
    await evaluate("[...document.querySelectorAll('.route-nav button')].find(b => b.textContent === 'My Proposal').click()");
    await wait(100);
    await evaluate(`(() => { const input = document.querySelector('#proposal-form input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Latest unsaved title'); input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    await evaluate("[...document.querySelectorAll('button')].find(b => b.textContent === 'Submit for review').click()");
    await until("document.body.innerText.includes('Proposal submitted for coordinator review.')");
    assert.equal(savedTitle, 'Latest unsaved title');
    failArchive = true;
    await evaluate("[...document.querySelectorAll('.route-nav button')].find(b => b.textContent === 'Project Archive').click()");
    await until("document.body.innerText.includes('Archive temporarily unavailable')");
    failArchive = false;
    await evaluate("[...document.querySelectorAll('button')].find(b => b.textContent === 'Retry archive').click()");
    await until("document.body.innerText.includes('Completed')");
    await evaluate('history.back()');
    await until("document.querySelector('.breadcrumbs').textContent.includes('My Proposal')");
    await evaluate('history.forward()');
    await until("document.querySelector('.breadcrumbs').textContent.includes('Project Archive')");
    await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 900, deviceScaleFactor: 1, mobile: false });
    await wait(100);
    assert.deepEqual(exceptions, [], 'no uncaught browser exceptions');
    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(root, '.tmp/day15-mobile.png'), Buffer.from(screenshot.data, 'base64'));
    console.log(`PASS: ${pages} responsive page checks; evaluation/modal layout; keyboard dismissal; browser history; workspace/archive recovery; latest proposal edits submitted; no uncaught exceptions`);
  } finally {
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ id: 999999, method: 'Browser.close' }));
    socket?.close(); browser?.kill(); server.closeAllConnections(); server.close();
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
