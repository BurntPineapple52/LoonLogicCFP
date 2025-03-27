export default {
    async fetch(request, env, ctx) {
        // Handle CORS preflight request
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: {
                    "Access-Control-Allow-Origin": "*", // Adjust to your needs; consider specifying your origin
                    "Access-Control-Allow-Methods": "POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type",
                },
            });
        }

        // Only allow POST requests and specific route
        if (request.method !== 'POST' ) {
            return new Response('Method Not Allowed or Not Found', {
                status: 405, // or 404
                headers: { "Access-Control-Allow-Origin": "*" }
            });
        }

        try {
            // Parse form data from the JSON request body
            const formData = await request.json();
            const websiteUrl = formData.website;
            const email = formData.email;
            const githubToken = env.GITHUB_TOKEN; // **Environment Variable Name is now GITHUB_TOKEN**

            if (!websiteUrl || !email || !githubToken) {
                return new Response(JSON.stringify({ error: 'Missing website URL, email, or GitHub token.' }), {
                    status: 400,
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*"
                    }
                });
            }

            // Prepare the payload for the GitHub workflow_dispatch event
            const actionPayload = {
                websiteUrl: websiteUrl,
                email: email,
            };

            // Send a POST request to GitHub API - WORKFLOW DISPATCH ENDPOINT
            const githubApiUrl = `https://api.github.com/repos/BurntPineapple52/httrackservice/actions/workflows/httrack.yml/dispatches`;

            const githubResponse = await fetch(githubApiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${githubToken}`, // Include Authorization header with token
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json',
                    'User-Agent': 'HTTrackService-Cloudflare-Worker'
                },
                body: JSON.stringify({
                    ref: 'main',
                    inputs: actionPayload,
                }),
            });

            if (!githubResponse.ok) {
                const errorText = await githubResponse.text();
                console.error("GitHub API Response Status:", githubResponse.status);
                console.error("GitHub API Response Headers:", githubResponse.headers);
                console.error("GitHub API Response Body:", errorText);
                return new Response(JSON.stringify({ error: `GitHub API error: ${errorText}` }), {
                    status: githubResponse.status,
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*"
                    }
                });
            }

            return new Response(JSON.stringify({ message: 'GitHub Action dispatched successfully!' }), {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                }
            });
        } catch (error) {
            console.error("Worker error:", error);
            return new Response(JSON.stringify({ error: `Internal server error: ${error.message}` }), {
                status: 500,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                }
            });
        }
    },
};