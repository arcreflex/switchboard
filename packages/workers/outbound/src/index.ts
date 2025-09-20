// Cloudflare Worker stub for deferred outbound messaging.
export default {
  async fetch(request: Request) {
    console.log("outbound worker received request", { url: request.url });
    return new Response("outbound worker placeholder", { status: 200 });
  }
};
