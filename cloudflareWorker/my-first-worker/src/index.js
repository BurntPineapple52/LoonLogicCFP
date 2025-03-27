// --- Resend Email Function ---
// Include the function we defined earlier
/**
 * Sends an email using the Resend API, directing replies to a specific inbox.
 * @param {string} toEmail Recipient's email address.
 * @param {string} subject Email subject line.
 * @param {string} htmlContent HTML content for the email body.
 * @param {object} env The Worker's environment containing secrets.
 * @returns {Promise<boolean>} True if the email was likely sent successfully, false otherwise.
 */
async function sendEmailViaResend(toEmail, subject, htmlContent, env) {
    const apiKey = env.RESEND_API_KEY;
    const fromEmail = env.RESEND_FROM_EMAIL;
    const replyToEmail = env.REPLY_TO_EMAIL;

    if (!apiKey || !fromEmail || !replyToEmail) {
        console.error("RESEND_API_KEY, RESEND_FROM_EMAIL, or REPLY_TO_EMAIL is not configured in Worker secrets.");
        // Optionally throw an error or return a specific failure indicator
        return false;
    }

    const endpoint = 'https://api.resend.com/emails';

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                from: fromEmail,
                to: [toEmail],
                subject: subject,
                html: htmlContent,
                reply_to: replyToEmail // Direct replies to your Zoho inbox
            }),
        });

        if (response.ok) {
            const data = await response.json();
            console.log(`Email successfully sent to ${toEmail} via Resend. ID: ${data.id}. Replies to: ${replyToEmail}`);
            return true;
        } else {
            const errorBody = await response.json();
            console.error(`Failed to send email via Resend: ${response.status} ${response.statusText}`, JSON.stringify(errorBody));
            return false;
        }
    } catch (error) {
        console.error("Error calling Resend API:", error);
        return false;
    }
}


// --- Main Worker Logic ---
export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // --- CORS Preflight Handling ---
        if (request.method === 'OPTIONS') {
            // Handle CORS preflight requests for both endpoints
            return new Response(null, {
                status: 204,
                headers: {
                    "Access-Control-Allow-Origin": "*", // Be more specific in production!
                    "Access-Control-Allow-Methods": "POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, Authorization", // Allow Authorization if needed for other endpoints
                },
            });
        }

        // --- Route 1: Initial Form Submission ---
        // Assuming your form posts to the root path '/'
        if (request.method === 'POST' && url.pathname === '/') {
            try {
                const formData = await request.json();
                const websiteUrl = formData.website;
                const userEmail = formData.email; // Changed variable name for clarity
                const githubToken = env.GITHUB_TOKEN;

                if (!websiteUrl || !userEmail || !githubToken) {
                    return new Response(JSON.stringify({ error: 'Missing website URL, email, or required configuration.' }), {
                        status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
                    });
                }

                // Prepare GitHub Action payload
                const actionPayload = {
                    websiteUrl: websiteUrl,
                    email: userEmail, // Pass userEmail to the action
                    // Add a unique identifier if helpful for tracking/callbacks
                    // uniqueId: crypto.randomUUID()
                };

                // Trigger GitHub Action
                const githubApiUrl = `https://api.github.com/repos/BurntPineapple52/httrackservice/actions/workflows/httrack.yml/dispatches`;
                const githubResponse = await fetch(githubApiUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${githubToken}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json',
                        'User-Agent': 'HTTrackService-Cloudflare-Worker'
                    },
                    body: JSON.stringify({ ref: 'main', inputs: actionPayload }),
                });

                // Check GitHub API Response FIRST
                if (!githubResponse.ok) {
                    const errorText = await githubResponse.text();
                    console.error("GitHub API Dispatch Error:", githubResponse.status, errorText);
                    // Maybe send a failure email here? Or rely on callback failure?
                    return new Response(JSON.stringify({ error: `GitHub API error: ${errorText}` }), {
                        status: githubResponse.status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
                    });
                }

                console.log("GitHub Action dispatched successfully for:", userEmail);

                // Send Confirmation Email AFTER successful dispatch trigger
                const confirmationSubject = "Website Migration Request Received";
                const confirmationBody = `<p>Hi there,</p><p>We've received your request to start migrating ${websiteUrl}.</p><p>We'll process it shortly and send another email with a preview link once it's ready, or if we encounter any issues.</p><p>Thanks,<br/>Your Migration Service</p>`;
                const emailSent = await sendEmailViaResend(userEmail, confirmationSubject, confirmationBody, env);
                if (!emailSent) {
                   console.warn("Confirmation email failed to send for:", userEmail);
                   // Decide if this is critical. The action is still triggered.
                }

                // Return success response to the original form submitter
                return new Response(JSON.stringify({ message: 'Migration process started successfully! Check your email for confirmation.' }), {
                    status: 200, // Or 202 Accepted
                    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
                });

            } catch (error) {
                console.error("Worker error during submission:", error);
                // Avoid sending detailed internal errors back to the client
                return new Response(JSON.stringify({ error: 'An internal error occurred.' }), {
                    status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
                });
            }
        }

        // --- Route 2: GitHub Action Callback ---
        // Define a specific path for the callback, e.g., /migration-callback
        else if (request.method === 'POST' && url.pathname === '/migration-callback') {
             console.log("Received callback from GitHub Action.");
             try {
                // Ensure your GitHub Action sends a POST request with JSON body here
                const callbackData = await request.json();
                const { status, userEmail, previewUrl, errorMessage /* , uniqueId */ } = callbackData;

                // Basic validation of callback data
                if (!status || !userEmail) {
                    console.error("Invalid callback data received:", callbackData);
                    return new Response(JSON.stringify({ error: 'Invalid callback data.' }), {
                        status: 400, headers: { "Content-Type": "application/json" } // No CORS needed for server-to-server typically
                    });
                }

                let emailSubject = '';
                let emailBody = '';

                // Determine email content based on status
                if (status === 'success' && previewUrl) {
                    emailSubject = "Your Website Preview is Ready!";
                    emailBody = `<p>Hi there,</p><p>Good news! We've generated a preview of your migrated site from ${callbackData.websiteUrl || 'your submitted URL'}.</p><p>You can view it here: <a href="${previewUrl}">${previewUrl}</a></p><p>This preview is temporary. Please review it. If you're happy and want to finalize the migration (including pointing your custom domain), let us know by replying to this email!</p><p>Thanks,<br/>Your Migration Service</p>`;
                } else if (status === 'failure') {
                    emailSubject = "Problem Migrating Your Website";
                    emailBody = `<p>Hi there,</p><p>Unfortunately, we encountered an issue trying to migrate ${callbackData.websiteUrl || 'your submitted URL'}.</p>`;
                    if (errorMessage) {
                        // Sanitize or use generic messages for errors shown to users
                        emailBody += `<p>Details: ${errorMessage.substring(0, 200)}</p>`; // Example: Limit error message length
                    }
                    emailBody += `<p>This can happen with complex sites or temporary issues. You can try submitting again, or if the problem persists, feel free to reply to this email.</p><p>Sorry we couldn't automate it this time.</p><p>Thanks,<br/>Your Migration Service</p>`;
                } else {
                    console.error("Unknown status received in callback:", status);
                    return new Response(JSON.stringify({ error: 'Unknown status in callback.' }), {
                        status: 400, headers: { "Content-Type": "application/json" }
                    });
                }

                // Send the final status email
                const finalEmailSent = await sendEmailViaResend(userEmail, emailSubject, emailBody, env);
                if (!finalEmailSent) {
                    console.error("Failed to send final status email via Resend for:", userEmail);
                    // This is more critical - maybe implement retries or logging to an external system?
                }

                // Acknowledge receipt to the GitHub Action
                return new Response(JSON.stringify({ message: 'Callback received and processed.' }), {
                    status: 200, headers: { "Content-Type": "application/json" }
                });

             } catch (error) {
                console.error("Error processing GitHub Action callback:", error);
                return new Response(JSON.stringify({ error: 'Internal error processing callback.' }), {
                    status: 500, headers: { "Content-Type": "application/json" }
                });
             }
        }

        // --- Fallback for other methods/paths ---
        else {
            return new Response('Not Found or Method Not Allowed', {
                status: 404, // Or 405
                headers: { "Access-Control-Allow-Origin": "*" } // Include CORS header here too
            });
        }
    },
};