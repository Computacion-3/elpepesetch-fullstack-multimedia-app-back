#!/usr/bin/env node
// Despliegue verificado en Render, sin orquestador: lo ejecuta GitHub Actions (cd.yml) o cualquier terminal.
//
//   1. Dispara el Deploy Hook con ?ref=<commit> (despliega exactamente el commit que pasó el CI).
//   2. Espera a que Render termine (API: GET /v1/services/:id/deploys/:deployId) y falla si el build/arranque falla.
//   3. Smoke tests contra la URL pública: /health con el commit esperado, Swagger, login (401) y GraphQL.
//   4. Si los smoke tests fallan, hace rollback al deploy que estaba vivo antes y termina con error.
//
// Variables:
//   RENDER_DEPLOY_HOOK_URL  (obligatoria) https://api.render.com/deploy/srv-xxx?key=yyy
//   RENDER_SERVICE_URL      (obligatoria) URL pública del servicio, p. ej. https://elpepesetch-back.onrender.com
//   RENDER_API_KEY          (opcional) sin ella no hay seguimiento por API ni rollback: solo se verifica /health
//   DEPLOY_COMMIT           commit a desplegar (por defecto GITHUB_SHA)
//   DEPLOY_TIMEOUT_MIN      espera máxima del despliegue (20)        HEALTH_TIMEOUT_MIN  espera máxima de /health (5)
//   POLL_INTERVAL_MS        intervalo de sondeo (10000)              RENDER_API_URL      (pruebas) https://api.render.com/v1

import { appendFileSync } from 'node:fs';

const env = process.env;
const API = (env.RENDER_API_URL ?? 'https://api.render.com/v1').replace(/\/$/, '');
const HOOK = env.RENDER_DEPLOY_HOOK_URL;
const SERVICE_URL = (env.RENDER_SERVICE_URL ?? '').replace(/\/$/, '');
const API_KEY = env.RENDER_API_KEY;
const COMMIT = env.DEPLOY_COMMIT ?? env.GITHUB_SHA;
const POLL_MS = Number(env.POLL_INTERVAL_MS ?? 10_000);
const DEPLOY_TIMEOUT_MS = Number(env.DEPLOY_TIMEOUT_MIN ?? 20) * 60_000;
const HEALTH_TIMEOUT_MS = Number(env.HEALTH_TIMEOUT_MIN ?? 5) * 60_000;

const SUCCESS = new Set(['live']);
const FAILURE = new Set(['build_failed', 'update_failed', 'pre_deploy_failed', 'canceled', 'deactivated']);

const summary = { commit: COMMIT, deployId: null, status: null, checks: [], rollback: null };
const startedAt = Date.now();

// ---------- utilidades ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const elapsed = () => `${Math.round((Date.now() - startedAt) / 1000)} s`;
const log = (msg) => console.log(`[${elapsed()}] ${msg}`);
const annotate = (level, msg) => console.log(env.GITHUB_ACTIONS ? `::${level}::${msg}` : `${level.toUpperCase()}: ${msg}`);

class DeployError extends Error {}

function fail(msg) {
    throw new DeployError(msg);
}

async function fetchWithTimeout(url, init = {}, timeoutMs = 30_000) {
    return fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
}

async function renderApi(path, init = {}) {
    const res = await fetchWithTimeout(`${API}${path}`, {
        ...init,
        headers: { Accept: 'application/json', Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json', ...init.headers },
    });
    const text = await res.text();
    if (!res.ok) fail(`Render API ${init.method ?? 'GET'} ${path} → ${res.status} ${text.slice(0, 200)}`);
    return text ? JSON.parse(text) : null;
}

/** srv-xxx sale de la URL del hook: https://api.render.com/deploy/srv-xxx?key=... */
function serviceIdFromHook(hook) {
    const match = /\/deploy\/(srv-[a-z0-9]+)/i.exec(hook);
    if (!match) fail('No se pudo leer el ID del servicio (srv-...) de RENDER_DEPLOY_HOOK_URL');
    return match[1];
}

// ---------- pasos ----------
async function currentLiveDeploy(serviceId) {
    const list = await renderApi(`/services/${serviceId}/deploys?status=live&limit=1`);
    return list?.[0]?.deploy ?? null;
}

async function triggerDeploy() {
    const url = new URL(HOOK);
    if (COMMIT) url.searchParams.set('ref', COMMIT);
    const res = await fetchWithTimeout(url, { method: 'POST' });
    const body = await res.text();
    if (res.status === 200) {
        const id = JSON.parse(body)?.deploy?.id ?? null;
        log(`Render aceptó el despliegue ${id ?? '(sin ID)'} del commit ${COMMIT?.slice(0, 7) ?? '(último de la rama)'}`);
        return id;
    }
    if (res.status === 202) {
        log('Había otro despliegue en curso: Render dejó este en cola (sin ID todavía).');
        return null;
    }
    const hint = { 400: 'el servicio no despliega desde Git', 401: 'la key del hook es inválida', 404: 'commit o servicio no encontrado' }[res.status];
    fail(`El Deploy Hook respondió ${res.status}${hint ? ` (${hint})` : ''}`);
}

/** Con 202 Render no devuelve ID: se busca el deploy de este commit en la lista. */
async function findDeployForCommit(serviceId, deadline) {
    while (Date.now() < deadline) {
        const list = await renderApi(`/services/${serviceId}/deploys?limit=10`);
        const match = list?.map((item) => item.deploy).find((d) => d?.commit?.id === COMMIT);
        if (match) return match.id;
        await sleep(POLL_MS);
    }
    fail('El despliegue en cola nunca apareció en Render');
}

async function waitForDeploy(serviceId, deployId, deadline) {
    let last = null;
    while (Date.now() < deadline) {
        const deploy = await renderApi(`/services/${serviceId}/deploys/${deployId}`);
        if (deploy.status !== last) {
            log(`Render: ${deploy.status}`);
            last = deploy.status;
        }
        if (SUCCESS.has(deploy.status)) return deploy;
        if (FAILURE.has(deploy.status)) {
            summary.status = deploy.status;
            fail(`El despliegue terminó en "${deploy.status}". La versión anterior sigue atendiendo (Render no cambia el tráfico si falla).`);
        }
        await sleep(POLL_MS);
    }
    fail(`El despliegue no terminó en ${DEPLOY_TIMEOUT_MS / 60_000} min (último estado: ${last})`);
}

/** Espera a que /health responda ok con el commit desplegado (en el plan gratuito, el arranque en frío tarda). */
async function waitForHealth(expectedCommit) {
    const deadline = Date.now() + HEALTH_TIMEOUT_MS;
    let lastProblem = 'sin respuesta';
    while (Date.now() < deadline) {
        try {
            const res = await fetchWithTimeout(`${SERVICE_URL}/health`, {}, 60_000);
            const body = await res.json().catch(() => ({}));
            if (res.ok && body.status === 'ok') {
                if (!expectedCommit || !body.commit || body.commit === expectedCommit) return body;
                lastProblem = `responde el commit ${String(body.commit).slice(0, 7)}, se espera ${expectedCommit.slice(0, 7)}`;
            } else {
                lastProblem = `HTTP ${res.status} ${JSON.stringify(body).slice(0, 120)}`;
            }
        } catch (err) {
            lastProblem = err.name === 'TimeoutError' ? 'tiempo de espera agotado' : err.message;
        }
        await sleep(POLL_MS);
    }
    fail(`/health no quedó sano en ${HEALTH_TIMEOUT_MS / 60_000} min: ${lastProblem}`);
}

async function smokeTests(expectedCommit) {
    const check = async (name, run) => {
        try {
            const detail = await run();
            summary.checks.push({ name, ok: true, detail });
            log(`✔ ${name}${detail ? ` (${detail})` : ''}`);
        } catch (err) {
            summary.checks.push({ name, ok: false, detail: err.message });
            log(`✘ ${name}: ${err.message}`);
        }
    };

    await check('GET /health: base de datos y commit', async () => {
        const health = await waitForHealth(expectedCommit);
        if (expectedCommit && !health.commit) annotate('warning', '/health no informa el commit (falta RENDER_GIT_COMMIT): no se pudo comparar');
        return `database=${health.database}, commit=${health.commit?.slice(0, 7) ?? 'desconocido'}`;
    });
    await check('GET /api/docs: Swagger', async () => {
        const res = await fetchWithTimeout(`${SERVICE_URL}/api/docs`);
        if (!res.ok) fail(`HTTP ${res.status}`);
        return 'HTTP 200';
    });
    await check('POST /auth/login con credenciales falsas: 401', async () => {
        const res = await fetchWithTimeout(`${SERVICE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'smoke-test@example.com', password: 'NoExiste123' }),
        });
        if (res.status !== 401) fail(`se esperaba 401 y respondió ${res.status}`);
        return 'HTTP 401';
    });
    await check('POST /graphql: esquema disponible', async () => {
        const res = await fetchWithTimeout(`${SERVICE_URL}/graphql`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: '{ __typename }' }),
        });
        const body = await res.json().catch(() => ({}));
        if (body?.data?.__typename !== 'Query') fail(`HTTP ${res.status} ${JSON.stringify(body).slice(0, 120)}`);
        return 'HTTP 200';
    });

    return summary.checks.every((c) => c.ok);
}

async function rollback(serviceId, previous) {
    if (!previous) {
        annotate('error', 'No hay un deploy anterior vivo para hacer rollback.');
        summary.rollback = 'sin deploy anterior';
        return;
    }
    log(`Rollback al deploy ${previous.id} (commit ${previous.commit?.id?.slice(0, 7) ?? '?'})`);
    const created = await renderApi(`/services/${serviceId}/rollback`, {
        method: 'POST',
        body: JSON.stringify({ deployId: previous.id }),
    });
    const rollbackId = created?.id ?? created?.deploy?.id;
    if (rollbackId) {
        await waitForDeploy(serviceId, rollbackId, Date.now() + DEPLOY_TIMEOUT_MS);
        await waitForHealth(previous.commit?.id);
    }
    summary.rollback = `restaurado ${previous.commit?.id?.slice(0, 7) ?? previous.id}`;
    log(`Rollback completado: ${summary.rollback}`);
}

// ---------- reporte ----------
function writeSummary(ok, error) {
    const icon = (b) => (b ? '✅' : '❌');
    const lines = [
        `## ${icon(ok)} Despliegue en Render ${ok ? 'verificado' : 'fallido'}`,
        '',
        '| | |',
        '|---|---|',
        `| Commit | \`${summary.commit?.slice(0, 7) ?? '—'}\` |`,
        `| Deploy | ${summary.deployId ? `\`${summary.deployId}\`` : '—'} |`,
        `| Estado en Render | ${summary.status ?? (API_KEY ? '—' : 'sin RENDER_API_KEY (no se consultó)')} |`,
        `| URL | ${SERVICE_URL || '—'} |`,
        `| Duración | ${elapsed()} |`,
        ...(summary.rollback ? [`| Rollback | ${summary.rollback} |`] : []),
        '',
    ];
    if (summary.checks.length) {
        lines.push('### Smoke tests', '', '| | Prueba | Detalle |', '|---|---|---|');
        for (const c of summary.checks) lines.push(`| ${icon(c.ok)} | ${c.name} | ${c.detail ?? ''} |`);
        lines.push('');
    }
    if (error) lines.push(`> ${error}`, '');
    if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, lines.join('\n'));
    if (env.GITHUB_OUTPUT) {
        appendFileSync(env.GITHUB_OUTPUT, `deploy_id=${summary.deployId ?? ''}\nstatus=${ok ? 'success' : 'failure'}\n`);
    }
}

// ---------- principal ----------
async function main() {
    if (!HOOK) fail('Falta RENDER_DEPLOY_HOOK_URL');
    if (!SERVICE_URL) fail('Falta RENDER_SERVICE_URL (URL pública del servicio)');
    if (!API_KEY) annotate('warning', 'Sin RENDER_API_KEY: no se sigue el estado en Render ni se puede hacer rollback; solo se verifica /health.');

    const serviceId = serviceIdFromHook(HOOK);
    const previous = API_KEY ? await currentLiveDeploy(serviceId) : null;
    if (previous) log(`Deploy vivo antes de empezar: ${previous.id} (commit ${previous.commit?.id?.slice(0, 7) ?? '?'})`);
    if (previous && COMMIT && previous.commit?.id === COMMIT) log('Ese commit ya estaba desplegado: se redespliega igual.');

    const deadline = Date.now() + DEPLOY_TIMEOUT_MS;
    let deployId = await triggerDeploy();

    if (API_KEY) {
        deployId ??= await findDeployForCommit(serviceId, deadline);
        summary.deployId = deployId;
        const deploy = await waitForDeploy(serviceId, deployId, deadline);
        summary.status = deploy.status;
    } else {
        summary.deployId = deployId;
    }

    const healthy = await smokeTests(COMMIT);
    if (!healthy) {
        if (API_KEY) {
            await rollback(serviceId, previous).catch((err) => {
                summary.rollback = `falló: ${err.message}`;
                annotate('error', `El rollback falló: ${err.message}. Revisa el servicio en el Dashboard de Render.`);
            });
        }
        fail('Los smoke tests fallaron' + (summary.rollback ? ` y se hizo rollback (${summary.rollback})` : ''));
    }
}

main()
    .then(() => {
        writeSummary(true);
        log('Despliegue verificado.');
    })
    .catch((err) => {
        const message = err instanceof DeployError ? err.message : `Error inesperado: ${err.stack ?? err}`;
        annotate('error', message);
        writeSummary(false, message);
        process.exitCode = 1;
    });
