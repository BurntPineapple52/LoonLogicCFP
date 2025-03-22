addEventListener('fetch', event => {
	event.respondWith(handleRequest(event.request))
  })
  
  async function handleRequest(request) {
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
  
	// Only allow POST requests
	if (request.method !== 'POST') {
	  return new Response('Method Not Allowed', {
		status: 405,
		headers: { "Access-Control-Allow-Origin": "*" }
	  });
	}
  
	try {
	  // Parse form data from the JSON request body
	  const { website, email } = await request.json();
	  if (!website || !email) {
		return new Response('Missing website or email', {
		  status: 400,
		  headers: { "Access-Control-Allow-Origin": "*" }
		});
	  }
  
	  //Generate a repo name
	  const repo_name = `clone-${website.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`
  
	  // Prepare the payload for the GitHub repository_dispatch event
	  const payload = {
		event_type: 'trigger-httrack',
		client_payload: { website, email, repo_name }
	  };
  
	  // Send a POST request to GitHub API
	  const githubResponse = await fetch(
		'https://api.github.com/repos/BurntPineapple52/httrackservice/dispatches',
		{
		  method: 'POST',
		  headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${GITHUB_TOKEN}`,
			'Accept': 'application/vnd.github+json',
			'User-Agent': 'HTTrackService-Cloudflare-Worker' // **Crucial: Add User-Agent**
		  },
		  body: JSON.stringify(payload)
		}
	  );
  
	  if (!githubResponse.ok) {
		const errorText = await githubResponse.text();
		console.error("GitHub API Response Status:", githubResponse.status);
		console.error("GitHub API Response Headers:", githubResponse.headers);
		console.error("GitHub API Response Body:", errorText);
		return new Response(`GitHub API error: ${errorText}`, {
		  status: githubResponse.status,
		  headers: { "Access-Control-Allow-Origin": "*" }
		});
	  }
  
	  return new Response('GitHub Action triggered successfully!', {
		status: 200,
		headers: { "Access-Control-Allow-Origin": "*" }
	  });
	} catch (error) {
	  return new Response(`Error: ${error.message}`, {
		status: 500,
		headers: { "Access-Control-Allow-Origin": "*" }
	  });
	}
  }