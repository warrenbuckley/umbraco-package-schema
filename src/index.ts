/**
 * Cloudflare Worker: Umbraco Package Schema Proxy
 *
 * Provides a stable URL structure for the umbraco-package-schema.json file,
 * abstracting away the path change that happened between package versions:
 *   v14.0.0 – v17.1.x  →  dist-cms/umbraco-package-schema.json
 *   v17.2.0+            →  umbraco-package-schema.json (root)
 *
 * Supported routes:
 *   GET /umbraco-package/{version}       e.g. /umbraco-package/17.2.2
 *   GET /umbraco-package/latest
 *   GET /umbraco-package/v{major}/latest e.g. /umbraco-package/v17/latest
 */

const NPM_PACKAGE = '@umbraco-cms/backoffice';
const JSDELIVR_BASE = 'https://cdn.jsdelivr.net/npm';

// New root path is tried first; dist-cms/ is the fallback for older versions.
const SCHEMA_PATHS = [
	'umbraco-package-schema.json',
	'dist-cms/umbraco-package-schema.json',
];

// Matches an exact semver (e.g. "17.2.2", "17.3.0-rc", "17.3.0-rc2") or the
// string "latest". The [^\s/]* segment allows prerelease suffixes after the
// patch number.
const VALID_VERSION = /^(\d+\.\d+\.\d+[^\s/]*)|(latest)$/;

function textResponse(body: string, status: number): Response {
	return new Response(body, {
		status,
		headers: { 'Content-Type': 'text/plain' },
	});
}

// Tries each schema path in order and returns the first successful response.
// Returns null if the version doesn't exist on jsDelivr (e.g. pre-v14).
async function fetchSchema(npmVersion: string): Promise<Response | null> {
	for (const path of SCHEMA_PATHS) {
		const url = `${JSDELIVR_BASE}/${NPM_PACKAGE}@${npmVersion}/${path}`;
		const response = await fetch(url);
		if (response.ok) return response;
	}
	return null;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const { pathname } = new URL(request.url);

		// Matches /umbraco-package/{anything} — captures the version segment.
		const exactMatch = pathname.match(/^\/umbraco-package\/([^/]+)$/);

		// Matches /umbraco-package/v{digits}/latest — captures e.g. "v17".
		const majorLatestMatch = pathname.match(/^\/umbraco-package\/(v\d+)\/latest$/);

		let npmVersion: string;

		try {
			if (majorLatestMatch) {
				// Strip the "v" prefix — jsDelivr resolves e.g. "@17" to the latest
				// stable 17.x release, skipping prereleases automatically.
				npmVersion = majorLatestMatch[1].replace('v', '');
			} else if (exactMatch) {
				npmVersion = exactMatch[1];

				if (!VALID_VERSION.test(npmVersion)) {
					return textResponse(
						`Invalid version "${npmVersion}".\n\n` +
						`Use a valid semver (e.g. 17.2.2) or "latest".\n` +
						`Available versions: https://www.npmjs.com/package/${NPM_PACKAGE}?activeTab=versions`,
						400,
					);
				}
			} else {
				return textResponse(
					[
						'Not Found',
						'',
						'Valid paths:',
						'  /umbraco-package/{version}          e.g. /umbraco-package/17.2.2',
						'  /umbraco-package/latest',
						'  /umbraco-package/v{major}/latest    e.g. /umbraco-package/v17/latest',
						'',
						'Schema is available from v14.0.0 onwards.',
					].join('\n'),
					404,
				);
			}

			const upstream = await fetchSchema(npmVersion);

			if (!upstream) {
				return textResponse(
					`Schema not found for version "${npmVersion}".\n\n` +
					`The schema is available from v14.0.0 onwards.\n` +
					`Available versions: https://www.npmjs.com/package/${NPM_PACKAGE}?activeTab=versions`,
					404,
				);
			}

			return new Response(upstream.body, {
				status: 200,
				headers: {
					'Content-Type': 'application/schema+json',
					'Access-Control-Allow-Origin': '*',
				},
			});
		} catch {
			return textResponse(
				'Upstream error: unable to reach jsDelivr. Please try again shortly.',
				502,
			);
		}
	},
} satisfies ExportedHandler<Env>;
