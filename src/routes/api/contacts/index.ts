import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/contacts/')({
    server: {
        handlers: {
            GET: async ({ request }) => {
                try {
                    const requestUrl = new URL(request.url);
                    const electricUrl = new URL("https://api.electric-sql.cloud/v1/shape");

                    // Add Electric SQL credentials
                    electricUrl.searchParams.set(
                        "source_id",
                        process.env.ELECTRIC_SQL_CLOUD_SOURCE_ID!,
                    );
                    electricUrl.searchParams.set(
                        "source_secret",
                        process.env.ELECTRIC_SQL_CLOUD_SOURCE_SECRET!,
                    );

                    requestUrl.searchParams.forEach((value, key) => {
                        if (["live", "table", "handle", "offset", "cursor"].includes(key)) {
                            electricUrl.searchParams.set(key, value);
                        }
                    });

                    electricUrl.searchParams.set("table", "contacts");

                    // Proxy the request to Electric SQL
                    const response = await fetch(electricUrl);

                    // Remove problematic headers that could break decoding
                    const headers = new Headers(response.headers);
                    headers.delete("content-encoding");
                    headers.delete("content-length");

                    return new Response(response.body, {
                        status: response.status,
                        statusText: response.statusText,
                        headers,
                    });
                } catch (error) {
                    console.error("Error proxying request to Electric SQL:", error);
                    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
                        status: 500,
                        headers: { "Content-Type": "application/json" },
                    });
                }
            }
        }
    }
})

